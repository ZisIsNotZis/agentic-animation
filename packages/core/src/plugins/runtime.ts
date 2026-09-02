/**
 * World/plugin runtime — the approved contract in docs/WORLD_PLUGIN_CONTRACT.md.
 *
 * The engine discovers library/<category>/plugin.js, orders categories by
 * declared before/after/priority metadata, and chains the complete world
 * through plugin.run(world, invocation, frameContext) once per invocation per
 * frame. The engine performs only minimal structural checks; plugins own all
 * category semantics and cooperation.
 */
import {readdir, readFile, access} from "node:fs/promises";
import {join, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {WorldSchema, type WorldSchemaOutput} from "../schemas/world";
import type {JsonValue} from "../world/types";

export type RuntimeWorld = WorldSchemaOutput;
export type {JsonValue};

export type LifecyclePhase = "start" | "tick" | "stop";

/** One scheduled category call, already phase-resolved by the scheduler. */
export type Invocation = {
  id: string;
  category: string;
  asset: string;
  phase: LifecyclePhase;
  durationFrames: number | null;
  localFrame: number;
  args: JsonValue;
};

export type FrameContext = {
  frame: number;
  fps: number;
  seconds: number;
  seed: number;
};

export type CategoryPlugin = {
  run(world: RuntimeWorld, invocation: Invocation, ctx: FrameContext): RuntimeWorld;
};

/** Static values and, when dispatch is opted into, callable members. */
export type PluginMembers = Record<string, JsonValue | ((world: RuntimeWorld, ...args: JsonValue[]) => unknown)>;

export type PluginDefinition = {
  run: CategoryPlugin["run"];
  members?: PluginMembers;
  /** Explicit opt-in for dynamic dispatch of callable members. */
  dispatch?: boolean;
};

export type PluginManifest = {
  priority?: number;
  before?: string | readonly string[];
  after?: string | readonly string[];
};

export type LoadedPlugin = {
  readonly category: string;
  readonly manifest: PluginManifest;
  readonly definition: PluginDefinition;
};

export interface LoadPluginsOptions {
  readonly categories?: readonly string[];
}

export interface WorldRuntimeOptions extends LoadPluginsOptions {
  readonly libraryRoot?: string;
  readonly plugins?: readonly LoadedPlugin[];
}

const asList = (value: string | readonly string[] | undefined): readonly string[] =>
  value === undefined ? [] : typeof value === "string" ? [value] : value;

async function readManifest(categoryRoot: string): Promise<PluginManifest> {
  try {
    return JSON.parse(await readFile(join(categoryRoot, "manifest.json"), "utf8")) as PluginManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
}

/** Discover library/<category>/plugin.js directly; there is no registry index. */
export async function loadPlugins(libraryRoot: string, options: LoadPluginsOptions = {}): Promise<LoadedPlugin[]> {
  const root = resolve(libraryRoot);
  const available = options.categories ? [...options.categories] : (await readdir(root, {withFileTypes: true}))
    .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const plugins: LoadedPlugin[] = [];
  for (const category of available.sort()) {
    const categoryRoot = join(root, category);
    const pluginPath = join(categoryRoot, "plugin.js");
    try {
      await access(pluginPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    const module = await import(pathToFileURL(pluginPath).href);
    const definition = (module.default ?? module.plugin) as PluginDefinition | undefined;
    if (!definition || typeof definition.run !== "function") {
      throw new Error(`library/${category}/plugin.js must export a default plugin with run(world, invocation, ctx)`);
    }
    if (definition.dispatch !== true && Object.values(definition.members ?? {}).some((member) => typeof member === "function")) {
      throw new Error(`library/${category}/plugin.js exports callable members without dispatch: true`);
    }
    const manifest = {...await readManifest(categoryRoot)};
    plugins.push({category, manifest, definition});
  }
  return orderPlugins(plugins);
}

/** Deterministic topological order: before/after edges, then priority, then category name. */
export function orderPlugins(plugins: readonly LoadedPlugin[]): LoadedPlugin[] {
  const byCategory = new Map(plugins.map((plugin) => [plugin.category, plugin]));
  const edges = new Map(plugins.map((plugin) => [plugin.category, new Set<string>()]));
  for (const plugin of plugins) {
    for (const before of asList(plugin.manifest.before)) {
      if (!byCategory.has(before)) throw new Error(`plugin ${plugin.category} declares before unknown category: ${before}`);
      edges.get(plugin.category)!.add(before);
    }
    for (const after of asList(plugin.manifest.after)) {
      if (!byCategory.has(after)) throw new Error(`plugin ${plugin.category} declares after unknown category: ${after}`);
      edges.get(after)!.add(plugin.category);
    }
  }
  const remaining = new Set(plugins.map((plugin) => plugin.category));
  const result: LoadedPlugin[] = [];
  while (remaining.size) {
    const ready = [...remaining].filter((category) => [...edges.values()].every((targets) => !targets.has(category)))
      .sort((a, b) => (byCategory.get(a)!.manifest.priority ?? 0) - (byCategory.get(b)!.manifest.priority ?? 0) || a.localeCompare(b));
    if (!ready.length) {
      const cycle = [...remaining].sort().join(" -> ");
      throw new Error(`plugin category ordering contains a cycle: ${cycle}`);
    }
    for (const category of ready) {
      remaining.delete(category);
      result.push(byCategory.get(category)!);
      edges.delete(category);
    }
  }
  return result;
}

/** Generic lifecycle: start on the first frame, stop on the final frame, tick between. */
export function resolveInvocationPhase(base: Omit<Invocation, "phase">): LifecyclePhase {
  if (base.localFrame <= 0) return "start";
  if (base.durationFrames !== null && base.localFrame >= base.durationFrames - 1) return "stop";
  return "tick";
}

function validateWorld(world: unknown, origin: string): RuntimeWorld {
  const parsed = WorldSchema.safeParse(world);
  if (!parsed.success) throw new Error(`${origin} returned an invalid world: ${parsed.error.issues[0]?.message ?? "unknown issue"}`);
  return parsed.data;
}

/**
 * Chain the complete world through the ordered plugins for one frame.
 * Invocations are dispatched grouped per category in the given deterministic
 * order; each plugin sees the previous plugin's output. In-place mutation and
 * replacement-world returns both work; replacements are structurally validated.
 */
export function runFrame(
  world: RuntimeWorld,
  plugins: readonly LoadedPlugin[],
  invocations: readonly Invocation[],
  ctx: FrameContext,
): RuntimeWorld {
  const byCategory = new Map(plugins.map((plugin) => [plugin.category, plugin]));
  const grouped = new Map<string, Invocation[]>();
  for (const invocation of invocations) {
    const list = grouped.get(invocation.category) ?? [];
    list.push(invocation);
    grouped.set(invocation.category, list);
  }
  let current = world;
  for (const plugin of plugins) {
    const list = grouped.get(plugin.category);
    if (!list) continue;
    for (const invocation of list) {
      let returned: unknown;
      try {
        returned = plugin.definition.run(current, invocation, ctx);
      } catch (error) {
        throw new Error(`plugin ${plugin.category} failed on invocation ${invocation.id} at frame ${ctx.frame}: ${(error as Error).message}`);
      }
      if (returned === undefined || returned === current) continue;
      current = validateWorld(returned, `plugin ${plugin.category} (invocation ${invocation.id}, frame ${ctx.frame})`);
    }
    grouped.delete(plugin.category);
  }
  const orphaned = [...grouped.keys()].sort();
  if (orphaned.length) throw new Error(`invocations reference missing plugins: ${orphaned.join(", ")}`);
  return validateWorld(current, `frame ${ctx.frame} chain`);
}

/** Static values resolve directly; callables require the plugin's dispatch opt-in. */
export function invokeMember(plugin: LoadedPlugin, world: RuntimeWorld, member: string, args: readonly JsonValue[] = []): unknown {
  const value = plugin.definition.members?.[member];
  if (value === undefined) throw new Error(`plugin ${plugin.category} has no member: ${member}`);
  if (typeof value === "function") {
    if (plugin.definition.dispatch !== true) throw new Error(`plugin ${plugin.category} member ${member} is callable but dispatch is not opted in`);
    return value(world, ...args);
  }
  return value;
}

/** Deep checkpoint of a world for deterministic replay from segment boundaries. */
export function checkpointWorld(world: RuntimeWorld): RuntimeWorld {
  return structuredClone(world) as RuntimeWorld;
}
