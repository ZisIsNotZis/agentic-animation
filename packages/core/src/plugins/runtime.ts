/**
 * Plugin discovery per docs/WORLD_PLUGIN_CONTRACT.md: the engine loads
 * library/<category>/plugin.js, whose default export is the category
 * namespace (factory functions + static data such as cueAssets). Ordering is
 * declared per category manifest (before/after/priority) with cycle
 * detection. There is no registry index.
 */
import {readdir, readFile, access} from "node:fs/promises";
import {join, resolve} from "node:path";
import {pathToFileURL} from "node:url";
import {CategoryManifestSchema} from "../schemas/world";
import type {CategoryPlugin, LoadedPlugin} from "../invocation/types";

export type {JsonValue} from "../world/types";
export type {CategoryPlugin, LoadedPlugin} from "../invocation/types";
export type PluginManifest = {
  priority?: number;
  before?: string | readonly string[];
  after?: string | readonly string[];
  [key: string]: unknown;
};

export interface LoadPluginsOptions {
  readonly categories?: readonly string[];
}

const asList = (value: string | readonly string[] | undefined): readonly string[] =>
  value === undefined ? [] : typeof value === "string" ? [value] : value;

async function readManifest(categoryRoot: string, category: string): Promise<PluginManifest> {
  try {
    const raw = JSON.parse(await readFile(join(categoryRoot, "manifest.json"), "utf8"));
    const parsed = CategoryManifestSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`library/${category}/manifest.json is not a valid plugin manifest: ${parsed.error.issues[0]?.message ?? "unknown issue"}`);
    }
    return parsed.data as PluginManifest;
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
    const namespace = (module.default ?? module.plugin) as CategoryPlugin | undefined;
    if (!namespace || typeof namespace !== "object" || Array.isArray(namespace)) {
      throw new Error(`library/${category}/plugin.js must default-export a namespace object of factories`);
    }
    const manifest = {...await readManifest(categoryRoot, category)};
    plugins.push({category, manifest, namespace});
  }
  return orderPlugins(plugins);
}

/** Deterministic topological order: before/after edges, then priority (lower runs earlier), then category name. */
export function orderPlugins<T extends {category: string; manifest: unknown}>(plugins: readonly T[]): T[] {
  const byCategory = new Map(plugins.map((plugin) => [plugin.category, plugin]));
  const edges = new Map(plugins.map((plugin) => [plugin.category, new Set<string>()]));
  for (const plugin of plugins) {
    const manifest = (plugin.manifest ?? {}) as PluginManifest;
    for (const before of asList(manifest.before)) {
      if (!byCategory.has(before)) throw new Error(`plugin ${plugin.category} declares before unknown category: ${before}`);
      edges.get(plugin.category)!.add(before);
    }
    for (const after of asList(manifest.after)) {
      if (!byCategory.has(after)) throw new Error(`plugin ${plugin.category} declares after unknown category: ${after}`);
      edges.get(after)!.add(plugin.category);
    }
  }
  const remaining = new Set(plugins.map((plugin) => plugin.category));
  const result: T[] = [];
  while (remaining.size) {
    const ready = [...remaining].filter((category) => [...edges.values()].every((targets) => !targets.has(category)))
      .sort((a, b) => (((byCategory.get(a)!.manifest ?? {}) as PluginManifest).priority ?? 0) - (((byCategory.get(b)!.manifest ?? {}) as PluginManifest).priority ?? 0) || a.localeCompare(b));
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

/** Deep checkpoint of a world for deterministic replay from segment boundaries. */
export function checkpointWorld(world: unknown): unknown {
  return structuredClone(world);
}
