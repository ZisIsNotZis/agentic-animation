import {z} from "zod";

const Id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const AssetRef = z.string().regex(/^(?:figure|voice|set|prop|dressing|layout)(?:\/[a-z][a-z0-9_]*)+$/);
const IdPattern = /^[a-z][a-z0-9_]*$/;
const ProcedurePath = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+$/;
const ActorNamespaces = new Set(["action", "emotion", "gaze", "movement", "voice", "prop"]);
const WorldCategories = new Set(["camera", "effect", "sound", "music"]);
const Namespace = new Set([...ActorNamespaces, ...WorldCategories, "say"]);

export const SchedulingModeSchema = z.enum(["begin", "end", "nonblock"]);
export type SchedulingMode = z.infer<typeof SchedulingModeSchema>;
export interface SchedulingMetadata {
  mode?: SchedulingMode;
  duration?: number;
}

export const ScalarSchema = z.discriminatedUnion("kind", [
  z.object({kind: z.literal("ref"), value: Id}),
  z.object({kind: z.literal("string"), value: z.string()}),
  z.object({kind: z.literal("number"), value: z.number().finite()}),
  z.object({kind: z.literal("boolean"), value: z.boolean()}),
]);
export type Scalar = z.infer<typeof ScalarSchema>;

export type ProcedureCall = {
  raw: string;
  subject: string;
  namespace: "action" | "emotion" | "gaze" | "movement" | "voice" | "prop" | "camera" | "effect" | "sound" | "music" | "say";
  terminal: string;
  path: string;
  args: Scalar[];
  kwargs: Record<string, Scalar>;
};

function splitArguments(body: string): string[] | null {
  const parts: string[] = [];
  let start = 0;
  let quote: "'" | '"' | undefined;
  let escaped = false;
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
    } else if (char === "'" || char === '"') quote = char;
    else if (char === "(") return null;
    else if (char === ",") {
      parts.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quote || escaped) return null;
  parts.push(body.slice(start).trim());
  return parts;
}

function splitConcurrentCalls(body: string): string[] | null {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: "'" | '"' | undefined;
  let escaped = false;
  for (let i = 0; i < body.length; i++) {
    const char = body[i]!;
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
    } else if (char === "'" || char === '"') quote = char;
    else if (char === "(") {
      if (depth++ > 0) return null;
    } else if (char === ")") {
      if (--depth < 0) return null;
    } else if (char === "," && depth === 0) {
      parts.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quote || escaped || depth !== 0) return null;
  parts.push(body.slice(start).trim());
  return parts;
}

function parseScalar(raw: string): Scalar | null {
  if (!raw) return null;
  if (/^(?:true|false)$/.test(raw)) return {kind: "boolean", value: raw === "true"};
  if (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw)) {
    const value = Number(raw);
    return Number.isFinite(value) ? {kind: "number", value} : null;
  }
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    const quote = raw[0];
    let value = raw.slice(1, -1);
    if (value.includes("\\")) {
      if (quote === "'") value = value.replace(/\\(['\\])/g, "$1");
      else {
        try { value = JSON.parse(raw); } catch { return null; }
      }
    }
    return {kind: "string", value};
  }
  return IdPattern.test(raw) ? {kind: "ref", value: raw} : null;
}

function parseCall(raw: string): ProcedureCall | null {
  const source = raw.trim();
  const match = source.match(/^([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)\((.*)\)$/s);
  if (!match || !ProcedurePath.test(match[1]!)) return null;
  const segments = match[1]!.split(".");
  let subject: string;
  let namespace: string;
  let terminal: string;
  if (segments.length === 2) {
    if (WorldCategories.has(segments[0]!)) {
      // Subject-less world category call: camera.punch_in(x), sound.static_buzz().
      subject = segments[0]!;
      namespace = segments[0]!;
      terminal = segments[1]!;
    } else if (segments[1] === "say") {
      subject = segments[0]!;
      namespace = "say";
      terminal = "say";
    } else return null;
  } else if (segments.length === 3) {
    // Subject-qualified category call: lin.action.slam(desk).
    subject = segments[0]!;
    namespace = segments[1]!;
    terminal = segments[2]!;
    if (!ActorNamespaces.has(namespace) && !WorldCategories.has(namespace)) return null;
  } else return null;
  const parts = splitArguments(match[2]!.trim());
  if (!parts) return null;
  const args: Scalar[] = [];
  const kwargs: Record<string, Scalar> = {};
  let seenKeyword = false;
  if (!(parts.length === 1 && !parts[0])) for (const part of parts) {
    const equals = part.indexOf("=");
    if (equals >= 0) {
      const key = part.slice(0, equals).trim();
      const value = parseScalar(part.slice(equals + 1).trim());
      if (!IdPattern.test(key) || !value || key in kwargs) return null;
      seenKeyword = true;
      kwargs[key] = value;
    } else {
      if (seenKeyword) return null;
      const value = parseScalar(part);
      if (!value) return null;
      args.push(value);
    }
  }
  return {
    raw: source,
    subject,
    namespace: namespace as ProcedureCall["namespace"],
    terminal,
    path: match[1]!,
    args,
    kwargs,
  };
}

/** Parse one typed terminal call. Nested calls, expressions, and JavaScript fail closed. */
export function parseProcedureCall(raw: string): ProcedureCall | null {
  return parseCall(raw);
}

/** Parse comma-concurrent members of one brace group. */
export function parseProcedureCalls(raw: string): ProcedureCall[] | null {
  const parts = splitConcurrentCalls(raw.trim());
  if (!parts || parts.length === 0 || parts.some((part) => !part)) return null;
  const calls = parts.map(parseCall);
  return calls.every((call): call is ProcedureCall => call !== null) ? calls : null;
}

export function inlineTokens(text: string): string[] | null {
  const tokens: string[] = [];
  let start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") {
      if (start >= 0) return null;
      start = i + 1;
    } else if (text[i] === "}") {
      if (start < 0) return null;
      tokens.push(text.slice(start, i).trim());
      start = -1;
    }
  }
  return start < 0 ? tokens : null;
}

const ActorDeclaration = z.object({use: AssetRef, voice: AssetRef}).strict();
const LocationDeclaration = z.object({use: AssetRef}).strict();
const ObjectDeclaration = z.object({use: AssetRef}).strict();
const Facing = z.union([Id, z.enum(["audience", "left", "right"])]);
const Placement = z.string().regex(/^(?:center|left|right|foreground|background|on\([a-z][a-z0-9_]*\))$/);
const ScriptStatement = z.record(Id, z.string().min(1)).superRefine((item, ctx) => {
  if (Object.keys(item).length !== 1) ctx.addIssue({code: z.ZodIssueCode.custom, message: "dialogue statement must name exactly one actor"});
  const text = Object.values(item)[0];
  if (text === undefined) return;
  const tokens = inlineTokens(text);
  if (!tokens) ctx.addIssue({code: z.ZodIssueCode.custom, message: "unbalanced or nested inline token"});
  else for (const token of tokens) if (!parseProcedureCalls(token)) ctx.addIssue({code: z.ZodIssueCode.custom, message: `invalid concurrent procedure group: ${token}`});
});

const Scene = z.object({
  id: Id,
  location: Id,
  actors: z.record(Id, z.object({facing: Facing}).strict()).default({}),
  objects: z.record(Id, Placement).default({}),
  script: z.array(ScriptStatement).min(1),
}).strict();

const Base = z.object({
  episode: z.object({id: Id, title: z.string().min(1), language: z.string().min(2)}).strict(),
  actors: z.record(Id, ActorDeclaration),
  locations: z.record(Id, LocationDeclaration),
  objects: z.record(Id, ObjectDeclaration),
  scenes: z.array(Scene).min(1),
}).strict();

function issue(ctx: z.RefinementCtx, path: (string | number)[], message: string): void {
  ctx.addIssue({code: z.ZodIssueCode.custom, path, message});
}

export const NarrowEpisodeSchema = Base.superRefine((episode, ctx) => {
  const actors = new Set(Object.keys(episode.actors));
  const locations = new Set(Object.keys(episode.locations));
  const objects = new Set(Object.keys(episode.objects));
  for (const [sceneIndex, scene] of episode.scenes.entries()) {
    const scenePath = ["scenes", sceneIndex];
    if (!locations.has(scene.location)) issue(ctx, [...scenePath, "location"], `unknown location: ${scene.location}`);
    for (const actor of Object.keys(scene.actors)) if (!actors.has(actor)) issue(ctx, [...scenePath, "actors", actor], `unknown actor: ${actor}`);
    for (const [actor, setup] of Object.entries(scene.actors)) {
      if (setup.facing !== "audience" && setup.facing !== "left" && setup.facing !== "right" && !actors.has(setup.facing) && !objects.has(setup.facing)) {
        issue(ctx, [...scenePath, "actors", actor, "facing"], `unknown facing target: ${setup.facing}`);
      }
    }
    for (const [object, placement] of Object.entries(scene.objects)) {
      if (!objects.has(object)) issue(ctx, [...scenePath, "objects", object], `unknown object: ${object}`);
      const support = placement.match(/^on\(([a-z][a-z0-9_]*)\)$/)?.[1];
      if (support && !objects.has(support)) issue(ctx, [...scenePath, "objects", object], `unknown support object: ${support}`);
    }
    for (const [statementIndex, statement] of scene.script.entries()) {
      const actor = Object.keys(statement)[0]!;
      if (!actors.has(actor)) issue(ctx, [...scenePath, "script", statementIndex], `unknown actor: ${actor}`);
      for (const token of inlineTokens(statement[actor]!) ?? []) for (const call of parseProcedureCalls(token) ?? []) {
        if (!actors.has(call.subject) && !objects.has(call.subject) && !WorldCategories.has(call.subject)) issue(ctx, [...scenePath, "script", statementIndex], `unknown call subject: ${call.subject}`);
        if (WorldCategories.has(call.subject) && call.subject !== call.namespace) issue(ctx, [...scenePath, "script", statementIndex], "world category calls must be subject-less");
        if (actors.has(call.subject) && WorldCategories.has(call.namespace)) issue(ctx, [...scenePath, "script", statementIndex], `world category calls do not take an actor subject: ${call.namespace}`);
        if (objects.has(call.subject) && call.namespace !== "prop") issue(ctx, [...scenePath, "script", statementIndex], "object calls must use the prop namespace");
        if (call.namespace === "say" && (call.subject !== actor || call.args.length !== 1 || call.args[0]!.kind !== "string")) issue(ctx, [...scenePath, "script", statementIndex], "say is an actor-local quoted speech call");
        for (const arg of [...call.args, ...Object.values(call.kwargs)]) if (arg.kind === "ref" && !actors.has(arg.value) && !objects.has(arg.value) && !WorldCategories.has(arg.value) && arg.value !== "audience") issue(ctx, [...scenePath, "script", statementIndex], `unknown reference: ${arg.value}`);
      }
    }
  }
});
export type NarrowEpisode = z.infer<typeof NarrowEpisodeSchema>;

export function findForbiddenKeys(value: unknown, path: (string | number)[] = []): string[] {
  const legacy = new Set(["cast", "sets", "dressing", "set", "layout", "place", "run", "at", "together", "do", "with", "to", "gaze", "pacing", "target", "present", "marks", "layouts", "type", "x", "y", "scale", "frame", "frames", "bone", "socket"]);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [...(legacy.has(key) ? [[...path, key].join(".")] : []), ...findForbiddenKeys(child, [...path, key])]);
}
