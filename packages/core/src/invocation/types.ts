import type {ProcedureRecipeTrack} from "../procedures/types";

/**
 * The world per docs/WORLD_PLUGIN_CONTRACT.md. Bodies mutate it in place;
 * frame/seconds/fps/seed are engine-maintained root fields; `invocation` is
 * engine-maintained run state for the invocation currently being expanded
 * (never serialized into manifests).
 */
export type World = {
  canvas: {
    aspect: number;
    tracks: ProcedureRecipeTrack[];
    [key: string]: unknown;
  };
  plugins: {[category: string]: unknown};
  frame: number;
  seconds: number;
  fps: number;
  seed: number;
  invocation?: {id: string; category: string; asset: string; localSec: number; durationSec: number | null};
};

/**
 * An invocation descriptor: returned by a plugin factory call. Plain data —
 * performs no world work until the engine drives `run`.
 */
export type Invocation = {
  durationSec?: number;
  mode?: "block" | "nonblock";
  /** Authoring default: generator. yield = advance local time by the yielded seconds (default: engine step). done = stop. */
  run(world: World): Generator<number | void, void, unknown>;
};

export type PluginFactory = (...args: never[]) => Invocation;

/** plugin.js default export: the category namespace (factories + static data). */
export type CategoryPlugin = Record<string, PluginFactory | ((...args: unknown[]) => unknown) | JsonValue>;

export type JsonValue = null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue};

export type LoadedPlugin = {
  category: string;
  manifest: unknown;
  namespace: CategoryPlugin;
};
