import type {ProcedureEase, ProcedureRecipeEvent, ProcedureRecipeTrack} from "../procedures/types";
import type {World} from "./types";
import {readdirSync, accessSync} from "node:fs";
import {dirname, join} from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

/**
 * Authoring stdlib for invocation bodies (docs/WORLD_PLUGIN_CONTRACT.md).
 * Helpers write semantic track events at invocation-local time into
 * world.canvas.tracks — the same vocabulary the renderer already consumes.
 * Each helper returns its duration so bodies `yield helper(...)` to advance
 * the virtual clock.
 */

type Track = ProcedureRecipeTrack;

function tracks(world: World): Track[] {
  if (!Array.isArray(world.canvas.tracks)) world.canvas.tracks = [];
  return world.canvas.tracks;
}

function event(at: number, duration: number, value: Record<string, unknown>): ProcedureRecipeEvent {
  return {...value, at, duration, value} as ProcedureRecipeEvent;
}

function now(world: World): number {
  return world.invocation?.localSec ?? 0;
}

function atOr(world: World, at: number | undefined): number {
  return at ?? now(world);
}

function idOf(handle: unknown, what: string): string {
  const id = (handle as {id?: unknown} | null | undefined)?.id;
  if (typeof id !== "string" || !id) throw new Error(`stdlib: ${what} must be a live instance handle (missing id), got ${String(handle)}`);
  return id;
}

function push(world: World, track: Track): void {
  tracks(world).push(track);
}

/**
 * The stdlib primitive: write one semantic track with absolute (invocation-local)
 * events. Generated resources use this directly; the sugar helpers below build
 * on the same shape. Events are {at, duration, ...payload}.
 */
export function track(
  world: World,
  kind: Track["kind"],
  target: string | undefined,
  events: ReadonlyArray<Record<string, unknown> & {at: number; duration: number}>,
): void {
  push(world, {
    kind,
    ...(target === undefined ? {} : {target}),
    events: events.map((ev) => event(ev.at, ev.duration, ev)),
  });
}

/** One body phase over the subject's parts (bone track). Returns durationSec. */
export function phase(
  world: World,
  subject: unknown,
  name: string,
  parts: readonly string[],
  durationSec: number,
  ease: ProcedureEase = "io",
  target?: unknown,
): number {
  if (!(durationSec > 0)) throw new Error(`stdlib.phase "${name}" needs a positive duration`);
  const value: Record<string, unknown> = {phase: name, parts, ease};
  if (target !== undefined) value.target = idOf(target, "phase target");
  push(world, {kind: "bone", target: idOf(subject, "phase subject"), events: [event(now(world), durationSec, {action: name, phase: name, parts, ...value})]});
  return durationSec;
}

/** Walk/movement phase: movement track toward the target plus transform move/arrive keys. */
export function movePhase(
  world: World,
  subject: unknown,
  name: string,
  parts: readonly string[],
  target: unknown,
  durationSec: number,
  ease: ProcedureEase = "io",
): number {
  if (!(durationSec > 0)) throw new Error(`stdlib.movePhase "${name}" needs a positive duration`);
  const subjectId = idOf(subject, "movePhase subject");
  const targetId = idOf(target, "movePhase target");
  const start = now(world);
  push(world, {kind: "movement", target: targetId, events: [event(start, durationSec, {action: name, phase: name, parts, ease, target: targetId, operation: "move", mode: "toward-target"})]});
  push(world, {kind: "transform", target: subjectId, events: [
    event(start, durationSec, {operation: "move", target: targetId, from: "current", to: targetId, progress: 0}),
    event(start + durationSec, 0, {operation: "arrive", target: targetId, to: targetId, progress: 1}),
  ]});
  return durationSec;
}

/** Facial expression event. Returns durationSec. */
export function emotion(
  world: World,
  face: {name: string; brow: string; eyes: string; mouth: string; intensity: number},
  durationSec: number,
): number {
  push(world, {kind: "expression", events: [event(now(world), durationSec, {phase: "emotion", name: face.name, emotion: face.name, brow: face.brow, eyes: face.eyes, mouth: face.mouth, intensity: face.intensity})]});
  return durationSec;
}

/** Gaze intent toward a target (or "audience"). Returns durationSec. */
export function gaze(
  world: World,
  subject: unknown,
  target: unknown | "audience",
  lead: "eyes" | "head" | "whole-body" = "eyes",
  durationSec = 0.35,
  hold = 0.25,
): number {
  push(world, {kind: "gaze", target: target === "audience" ? "audience" : idOf(target, "gaze target"), events: [event(now(world), durationSec, {phase: "gaze", gaze: {target: target === "audience" ? "audience" : idOf(target, "gaze target"), lead, hold}})]});
  return durationSec;
}

/** Camera move: push/pull/hold to a zoom, optionally centered on a target. */
export function cameraOp(
  world: World,
  operation: "push" | "pull" | "hold",
  zoom: number,
  target: unknown | undefined,
  durationSec: number,
  ease: ProcedureEase = "io",
): number {
  push(world, {kind: "camera", target: target === undefined ? undefined : idOf(target, "camera target"), events: [
    event(now(world), durationSec, {operation, target: target === undefined ? undefined : idOf(target, "camera target"), x: 0, y: 0, z: 1, key: "start", ease}),
    event(now(world) + durationSec, 0, {operation: "hold", target: target === undefined ? undefined : idOf(target, "camera target"), x: 0, y: 0, z: zoom, key: "end"}),
  ]});
  return durationSec;
}

/** Visual effect overlay event. Returns the effect duration. */
export function effect(
  world: World,
  style: string,
  opts: {target?: unknown; intensity?: number; duration?: number} = {},
): number {
  const duration = opts.duration ?? 0.3;
  push(world, {kind: "vfx", target: opts.target === undefined ? undefined : idOf(opts.target, "effect target"), events: [event(now(world), duration, {effect: style, style, target: opts.target === undefined ? undefined : idOf(opts.target, "effect target"), intensity: opts.intensity ?? 0.7, operation: "apply"})]});
  return duration;
}

/** Audio cue event (sound or music). Returns the cue duration. */
export function cue(
  world: World,
  name: string,
  opts: {kind: "sfx" | "music"; gain?: number; duration?: number; loop?: boolean},
): number {
  const duration = opts.duration ?? 0.3;
  push(world, {kind: opts.kind === "music" ? "music" : "sfx", events: [event(now(world), duration, {cue: name, kind: opts.kind, gain: opts.gain ?? 0.7, loop: opts.loop ?? false, operation: "play"})]});
  return duration;
}

/** Actor presence/pose lifecycle event. */
export function actorState(world: World, subject: unknown, state: {present?: boolean; pose?: string}, durationSec = 0): void {
  push(world, {kind: "lifecycle", events: [event(now(world), durationSec, {...state, subject: idOf(subject, "actorState subject"), operation: "state"})]});
}

/** Movement-track event only (no transform pair). Returns durationSec. */
export function moveEvent(
  world: World,
  subject: unknown,
  name: string,
  parts: readonly string[],
  target: unknown,
  durationSec: number,
  ease: ProcedureEase = "io",
): number {
  if (!(durationSec > 0)) throw new Error(`stdlib.moveEvent "${name}" needs a positive duration`);
  const targetId = idOf(target, "moveEvent target");
  push(world, {kind: "movement", target: targetId, events: [event(now(world), durationSec, {action: name, phase: name, parts, ease, target: targetId, operation: "move", mode: "toward-target"})]});
  return durationSec;
}

/** The single transform move/arrive key pair for a whole movement invocation. */
export function transformMove(world: World, subject: unknown, target: unknown, durationSec: number): void {
  const subjectId = idOf(subject, "transformMove subject");
  const targetId = idOf(target, "transformMove target");
  const start = now(world);
  push(world, {kind: "transform", target: subjectId, events: [
    event(start, durationSec, {operation: "move", target: targetId, from: "current", to: targetId, progress: 0}),
    event(start + durationSec, 0, {operation: "arrive", target: targetId, to: targetId, progress: 1}),
  ]});
}

const SHORT = 0.01;

/** Bind an object into the subject's hand at the current local time. */
export function bindObject(world: World, object: unknown, holder: unknown, holdSec: number, at?: number): number {
  const o = idOf(object, "bind object");
  const h = idOf(holder, "bind holder");
  const start = atOr(world, at);
  push(world, {kind: "binding", target: o, events: [event(start, Math.max(SHORT, holdSec), {operation: "bind", object: o, holder: h, hand: "hand_r"})]});
  push(world, {kind: "object", target: o, events: [event(start, Math.max(SHORT, holdSec), {operation: "state", object: o, status: "held", holder: h})]});
  push(world, {kind: "lifecycle", events: [event(start, Math.max(SHORT, holdSec), {operation: "bind", object: o, status: "held", holder: h})]});
  return Math.max(SHORT, holdSec);
}

/** Release a binding now; optionally re-bind to a receiver or settle on support. */
export function releaseObject(world: World, object: unknown, holder: unknown, at?: number): number {
  const o = idOf(object, "release object");
  const h = idOf(holder, "release holder");
  const start = atOr(world, at);
  push(world, {kind: "binding", target: o, events: [event(start, SHORT, {operation: "release", object: o, holder: h, hand: "hand_r"})]});
  push(world, {kind: "object", target: o, events: [event(start, SHORT, {operation: "release", object: o, status: "loose", holder: h})]});
  push(world, {kind: "lifecycle", events: [event(start, SHORT, {operation: "release", object: o, status: "loose"})]});
  return SHORT;
}

export function bindToReceiver(world: World, object: unknown, receiver: unknown, holdSec: number, at?: number): number {
  const o = idOf(object, "receiver object");
  const r = idOf(receiver, "receiver");
  const start = atOr(world, at);
  push(world, {kind: "binding", target: o, events: [event(start, Math.max(SHORT, holdSec), {operation: "bind", object: o, holder: r, hand: "hand_r"})]});
  push(world, {kind: "object", target: o, events: [event(start, Math.max(SHORT, holdSec), {operation: "state", object: o, status: "held", holder: r})]});
  push(world, {kind: "lifecycle", events: [event(start, Math.max(SHORT, holdSec), {operation: "bind", object: o, status: "held", holder: r})]});
  return Math.max(SHORT, holdSec);
}

export function settleOnSupport(world: World, object: unknown, support: unknown, holdSec: number, at?: number): number {
  const o = idOf(object, "support object");
  const s = idOf(support, "support");
  const start = atOr(world, at);
  push(world, {kind: "object", target: o, events: [event(start, Math.max(SHORT, holdSec), {operation: "state", object: o, status: "supported", support: s})]});
  push(world, {kind: "lifecycle", events: [event(start, Math.max(SHORT, holdSec), {operation: "state", object: o, status: "supported", support: s})]});
  return Math.max(SHORT, holdSec);
}

/**
 * Enumerate a category's child resource directories: each child's index.js
 * default export becomes a namespace entry. Folders without index.js are
 * skipped (asset-only resources); a broken index.js fails the load.
 */
export async function enumerateResources(categoryUrl: string): Promise<Record<string, unknown>> {
  const dir = dirname(fileURLToPath(categoryUrl));
  const namespace: Record<string, unknown> = {};
  for (const entry of readdirSync(dir, {withFileTypes: true}).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isDirectory()) continue;
    const index = join(dir, entry.name, "index.js");
    try {
      accessSync(index);
    } catch {
      continue; // asset-only resource folder
    }
    const mod = await import(pathToFileURL(index).href);
    namespace[entry.name] = (mod as {default?: unknown}).default ?? mod;
  }
  return namespace;
}

/** Enumerate audio cue files in a category subfolder into cueAssets data.
 * A missing cues folder is a valid state (no cues declared yet), not an error. */
export function enumerateCueAssets(categoryUrl: string, kind: "sfx" | "music", subDir = "cues"): Record<string, {kind: "sfx" | "music"; file: string}> {
  const dir = join(dirname(fileURLToPath(categoryUrl)), subDir);
  const cues: Record<string, {kind: "sfx" | "music"; file: string}> = {};
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, {withFileTypes: true});
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return cues;
    throw error;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!entry.isFile() || !/\.(?:wav|mp3|ogg)$/.test(entry.name)) continue;
    cues[entry.name.replace(/\.[^.]+$/, "")] = {kind, file: `${subDir}/${entry.name}`};
  }
  return cues;
}
