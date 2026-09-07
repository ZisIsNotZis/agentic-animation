import {z} from "zod";

const Id = z.string().regex(/^[a-z][a-z0-9_]*$/);
const AssetRef = z.string().regex(/^(?:figure|voice|set|prop|dressing|layout)(?:\/[a-z][a-z0-9_]*)+$/);
const IdPattern = /^[a-z][a-z0-9_]*$/;
const WorldCategories = new Set(["camera", "effect", "sound", "music"]);

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

/** Compiler-shim metadata for one evaluated brace expression. */
export type ProcedureCall = {
  raw: string;
  subject: string;
  namespace: string;
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

export interface InlineGroupSpan { start: number; end: number; raw: string; }

/**
 * Locate top-level brace groups in dialogue text with depth- and quote-aware
 * scanning (groups may contain nested object literals). Returns null when a
 * brace is unbalanced. This is the single source of brace-truth shared by the
 * schema validator, the compiler's dialogue splitter, and audio synthesis.
 */
export function scanInlineGroups(text: string): InlineGroupSpan[] | null {
  const groups: InlineGroupSpan[] = [];
  let depth = 0;
  let start = -1;
  let quote: string | undefined;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = undefined;
    } else if ((ch === "'" || ch === '"') && depth > 0) {
      quote = ch;
    } else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth === 0 || start < 0) return null;
      depth--;
      if (depth === 0) {
        groups.push({start, end: i + 1, raw: text.slice(start + 1, i).trim()});
        start = -1;
      }
    }
  }
  return start < 0 ? groups : null;
}

export function inlineTokens(text: string): string[] | null {
  const groups = scanInlineGroups(text);
  return groups?.map((group) => group.raw) ?? null;
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
  else for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed || trimmed.startsWith(",") || trimmed.endsWith(",")) ctx.addIssue({code: z.ZodIssueCode.custom, message: `invalid brace expression group: ${token}`});
  }
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
      // `on(X)` targets resolve against DECLARED support surfaces at compile
      // time (set/prop manifests) — undeclared surfaces fail there with a
      // precise error, so the schema does not restrict the name here.
    }
    for (const [statementIndex, statement] of scene.script.entries()) {
      const actor = Object.keys(statement)[0]!;
      if (!actors.has(actor)) issue(ctx, [...scenePath, "script", statementIndex], `unknown actor: ${actor}`);
    }
  }
});
export type NarrowEpisode = z.infer<typeof NarrowEpisodeSchema>;

export function findForbiddenKeys(value: unknown, path: (string | number)[] = []): string[] {
  const legacy = new Set(["cast", "sets", "dressing", "set", "layout", "place", "run", "at", "together", "do", "with", "to", "gaze", "pacing", "target", "present", "marks", "layouts", "type", "x", "y", "scale", "frame", "frames", "bone", "socket"]);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [...(legacy.has(key) ? [[...path, key].join(".")] : []), ...findForbiddenKeys(child, [...path, key])]);
}
