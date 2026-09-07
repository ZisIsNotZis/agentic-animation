import {
  type NarrowEpisode,
  type ProcedureCall,
  type Scalar,
} from "../schemas/narrowEpisode";
import {loadNarrowEpisode} from "../narrowEpisode/load";
import {buildScope, calleeOf, evaluateExpression, runInvocationSync, splitExpressions} from "../invocation/runner";
import type {Invocation, LoadedPlugin, World} from "../invocation/types";
import {stageScene, type StagingResult} from "../staging";
import {bakeSceneMotor} from "../motor";
import type {Skeleton} from "../schemas/libraryMeta";

export type CompilerAssetKind = "actor" | "voice" | "location" | "object";

export interface AssetResolveContext {
  kind: CompilerAssetKind;
  instance: string;
  sceneId?: string;
}

export interface AssetResolveRequest extends AssetResolveContext { ref: string; }
export type AssetResolver = (ref: string, context: AssetResolveContext) => unknown | Promise<unknown>;

export interface RegistryLocals {
  actors: Record<string, any>;
  objects: Record<string, any>;
}

export interface RegistryProcedureCall {
  subject: string;
  id: string;
  path: string;
  args: Scalar[];
  kwargs: Record<string, Scalar>;
}

/** The compiler talks to the registry through typed seams only. */
export interface EpisodeRegistry {
  resolveAsset?: AssetResolver;
  resolve?: (request: AssetResolveRequest) => unknown | Promise<unknown>;
  assets?: Readonly<Record<string, unknown>>;
}

export interface ProcedureResolveContext {
  sceneId: string;
  subject: string;
  source: "inline";
  start: number;
  call: ProcedureCall;
  episode: NarrowEpisode;
}

export interface ProcedureResolution {
  durationSec?: number;
  kind?: "timed" | "state" | "speech";
  timing?: {defaultDuration?: number; scalable?: boolean};
  markers?: Readonly<Record<string, number>>;
  events?: readonly ProcedureMarker[];
  performance?: unknown;
  tracks?: readonly ProcedureTrack[];
  actorState?: Partial<ActorState>;
}

export interface ProcedureTrack { kind: string; target?: string; events: readonly Record<string, unknown>[]; }

export interface ProcedureMarker { name: string; at: number; }

export type ProcedureResolver =
  | ((call: ProcedureCall, context: ProcedureResolveContext) => ProcedureResolution | Promise<ProcedureResolution>)
  | {
      resolve?: (call: ProcedureCall, context: ProcedureResolveContext) => ProcedureResolution | Promise<ProcedureResolution>;
      resolveProcedure?: (call: ProcedureCall, context: ProcedureResolveContext) => ProcedureResolution | Promise<ProcedureResolution>;
      [name: string]: unknown;
    };

export interface SpeechTimingRequest {
  sceneId: string;
  statementIndex: number;
  lineId: string;
  actor: string;
  voice: string;
  language: string;
  text: string;
  sourceText: string;
  inlineTokens: readonly string[];
  speed: number;
}

export interface SpeechBoundary {
  kind?: "word" | "character";
  text?: string;
  startSec: number;
  endSec?: number;
  startChar?: number;
  endChar?: number;
}

export interface SpeechTiming {
  durationSec: number;
  markers?: Readonly<Record<string, number>>;
  inline?: Readonly<Record<string, number>>;
  events?: readonly {token?: string; name?: string; start?: number; startSec?: number}[];
  boundaries?: readonly SpeechBoundary[];
}

export type SpeechTimingProvider =
  | ((request: SpeechTimingRequest) => SpeechTiming | Promise<SpeechTiming>)
  | {
      getTiming?: (request: SpeechTimingRequest) => SpeechTiming | Promise<SpeechTiming>;
      resolve?: (request: SpeechTimingRequest) => SpeechTiming | Promise<SpeechTiming>;
      measure?: (request: SpeechTimingRequest) => SpeechTiming | Promise<SpeechTiming>;
      [name: string]: unknown;
    };

export interface CompileEpisodeOptions {
  registry: EpisodeRegistry | AssetResolver;
  /** Loaded category plugins; brace expressions evaluate against their namespaces. */
  plugins: LoadedPlugin[];
  speechTimingProvider?: SpeechTimingProvider;
  speechTiming?: SpeechTimingProvider;
  voiceSpeed?: number;
}

export interface ResolvedAsset { instance: string; ref: string; resolved: unknown; }

export interface CompiledAssets {
  actors: Record<string, {use: ResolvedAsset; voice: ResolvedAsset}>;
  locations: Record<string, ResolvedAsset>;
  objects: Record<string, ResolvedAsset>;
}

export interface ActorState {
  present: boolean;
  pose: string;
  placement?: unknown;
  face?: string;
  gaze?: string;
  voice?: string;
  heldProps: string[];
}

export type PropStatus = "loose" | "held" | "supported";

export interface PropState {
  status: PropStatus;
  placement?: unknown;
  holder?: string;
  support?: string;
  state?: string;
}

export interface EpisodeState {
  actors: Record<string, ActorState>;
  props: Record<string, PropState>;
}

export interface SpeechPerformanceEvent {
  kind: "speech";
  subject: string;
  start: number;
  end: number;
  text: string;
  speed: number;
  boundaries?: readonly SpeechBoundary[];
  /** Rhubarb viseme cues, scene-absolute seconds (docs/WORLD_PUPPET_MOTOR.md). */
  mouth?: ReadonlyArray<{start: number; end: number; viseme: string}>;
  interruption?: true;
}

export interface CallPerformanceEvent {
  kind: "call";
  subject: string;
  start: number;
  end: number;
  call: ProcedureCall;
  source: "inline";
  concurrent?: boolean;
  performance?: unknown;
  tracks?: readonly unknown[];
}

export type PerformanceEvent = SpeechPerformanceEvent | CallPerformanceEvent;
export interface PerformanceTrack { subject: string; kind: "actor" | "world"; events: PerformanceEvent[]; }

export interface BindingConstraint {
  object: string;
  holder: string;
  start: number;
  end: number;
  sceneId: string;
  continuous: true;
}

export interface CompiledScene {
  id: string;
  index: number;
  location: string;
  layout: string;
  start: number;
  end: number;
  duration: number;
  staging: StagingResult;
  initial: EpisodeState;
  final: EpisodeState;
  performanceTracks: PerformanceTrack[];
  activeBindingConstraints: BindingConstraint[];
  motor?: ReturnType<typeof bakeSceneMotor>;
}

export interface CompiledEpisode {
  episode: NarrowEpisode["episode"];
  assets: CompiledAssets;
  sceneTrack: CompiledScene[];
  performanceTracks: PerformanceTrack[];
  bindingConstraints: BindingConstraint[];
  totalDuration: number;
}

interface ParsedGroup { expressions: string[]; raw: string; }
interface SpeechLine {
  start: number;
  end: number;
  text: string;
  timing: SpeechTiming;
  tokens: string[];
}
interface ValidatedCall {
  call: ProcedureCall;
  procedure?: Record<string, unknown>;
  kwargs: Record<string, Scalar>;
}
interface PendingCall {
  event: CallPerformanceEvent;
  resolution: ProcedureResolution;
  sequence: number;
  blocking: boolean;
}
interface OpenSpan { key: string; pending: PendingCall; sceneId: string; }
interface MutableState { actors: Map<string, ActorState>; props: Map<string, PropState>; }
interface CompileContext {
  episode: NarrowEpisode;
  options: CompileEpisodeOptions & {speechTimingProvider: SpeechTimingProvider};
  assets: CompiledAssets;
  assetCache: Map<string, ResolvedAsset>;
  plugins: LoadedPlugin[];
  scope: Record<string, unknown>;
}

const WORLD_SUBJECTS = new Set(["camera", "effect", "sound", "music"]);
const STATE_NAMESPACES = new Set(["emotion", "gaze", "voice", "prop"]);
const SILENT_BEAT_SEC = 0.55;
const DEFAULT_VOICE_SPEED = 1;
const LOGICAL_STAGE = {width: 1, height: 1} as const;

/** Compile NarrowEpisode source into deterministic renderer-neutral IR. */
export async function compileEpisode(yamlPath: string, options: CompileEpisodeOptions): Promise<CompiledEpisode> {
  const episode = await loadNarrowEpisode(yamlPath);
  const speechTimingProvider = options.speechTimingProvider ?? options.speechTiming;
  if (!speechTimingProvider) throw new Error("compileEpisode: speech timing provider is required");
  if (!options.plugins?.length) throw new Error("compileEpisode: loaded plugins are required");

  const scope = buildScope(
    Object.fromEntries([...Object.keys(episode.actors), ...Object.keys(episode.objects)].map((name) => [name, {id: name}])),
    options.plugins,
  );
  const context: CompileContext = {
    episode,
    options: {...options, speechTimingProvider},
    plugins: options.plugins,
    scope,
    assets: {actors: {}, locations: {}, objects: {}},
    assetCache: new Map(),
  };
  await resolveAssets(context);

  const state = initialState(episode);
  const scenes: CompiledScene[] = [];
  const constraints: BindingConstraint[] = [];
  let sceneStart = 0;
  let sequence = 0;

  for (const [index, scene] of episode.scenes.entries()) {
    const staging = stageScene({
      location: {id: scene.location},
      actors: scene.actors,
      objects: Object.fromEntries(Object.entries(scene.objects).map(([id, placement]) => [id, relationFor(placement)])),
    }, LOGICAL_STAGE);
    resolveSupportSurfaces(staging, scene.objects, context);
    const initial = snapshotState(state, episode);
    const compiled = await compileScene(scene, sceneStart, context, sequence);
    sequence = compiled.nextSequence;
    applyLifecycle(compiled.calls, state);
    constraints.push(...compiled.constraints);
    const duration = round(Math.max(0, compiled.cursor - sceneStart, ...compiled.calls.map((item) => item.event.end - sceneStart)));
    const end = round(sceneStart + duration);
    const final = snapshotState(state, episode);
    const sceneTracks = buildTracks(compiled.events, episode);
    scenes.push({
      id: scene.id,
      index,
      location: scene.location,
      layout: scene.location,
      start: sceneStart,
      end,
      duration,
      staging,
      initial,
      final,
      performanceTracks: sceneTracks,
      activeBindingConstraints: constraints.filter((item) => item.start < end && item.end > sceneStart),
      motor: bakeSceneMotor({
        durationSec: duration,
        actors: Object.fromEntries(Object.entries(staging.actors).map(([id, staged]) => {
          const resolved = context.assets.actors[id]?.use.resolved as {skeleton?: Skeleton} | undefined;
          return [id, {at: staged.at, facing: staged.facing === -1 ? -1 : 1, scale: staged.scale ?? 1, skeleton: resolved?.skeleton}];
        })),
        objects: Object.fromEntries(Object.entries(staging.objects).map(([id, staged]) => {
          const resolved = context.assets.objects[id]?.resolved as {placement?: {size?: [number, number]}} | undefined;
          return [id, {at: staged.at, size: resolved?.placement?.size, scale: staged.scale ?? 1}];
        })),
        tracks: sceneTracks as never,
      }),
    });
    sceneStart = end;
  }

  return {
    episode: episode.episode,
    assets: context.assets,
    sceneTrack: scenes,
    performanceTracks: buildTracks(scenes.flatMap((scene) => scene.performanceTracks.flatMap((track) => track.events)), episode),
    bindingConstraints: constraints.map((item) => ({...item, start: round(item.start), end: round(item.end)})),
    totalDuration: round(sceneStart),
  };
}

async function resolveAssets(context: CompileContext): Promise<void> {
  const {episode} = context;
  for (const [instance, declaration] of Object.entries(episode.actors)) {
    context.assets.actors[instance] = {
      use: await resolveAsset(context, declaration.use, {kind: "actor", instance}),
      voice: await resolveAsset(context, declaration.voice, {kind: "voice", instance}),
    };
  }
  for (const [instance, declaration] of Object.entries(episode.locations)) {
    context.assets.locations[instance] = await resolveAsset(context, declaration.use, {kind: "location", instance});
  }
  for (const [instance, declaration] of Object.entries(episode.objects)) {
    context.assets.objects[instance] = await resolveAsset(context, declaration.use, {kind: "object", instance});
  }
}

async function resolveAsset(context: CompileContext, ref: string, resolveContext: AssetResolveContext): Promise<ResolvedAsset> {
  const cacheKey = `${resolveContext.kind}:${ref}`;
  const cached = context.assetCache.get(cacheKey);
  if (cached) return cached;
  const registry = context.options.registry;
  let resolved: unknown;
  if (typeof registry === "function") resolved = await registry(ref, resolveContext);
  else if (registry.resolveAsset) resolved = await registry.resolveAsset(ref, resolveContext);
  else if (registry.resolve) resolved = await registry.resolve({...resolveContext, ref});
  else if (registry.assets && Object.prototype.hasOwnProperty.call(registry.assets, ref)) resolved = registry.assets[ref];
  if (resolved === undefined) throw new Error(`compileEpisode: registry could not resolve ${resolveContext.kind} asset ${ref} (${resolveContext.instance})`);
  const asset = {instance: resolveContext.instance, ref, resolved};
  context.assetCache.set(cacheKey, asset);
  return asset;
}

async function compileScene(
  scene: NarrowEpisode["scenes"][number],
  sceneStart: number,
  context: CompileContext,
  firstSequence: number,
): Promise<{cursor: number; calls: PendingCall[]; events: PerformanceEvent[]; constraints: BindingConstraint[]; nextSequence: number}> {
  let cursor = sceneStart;
  let voiceSpeed = context.options.voiceSpeed ?? DEFAULT_VOICE_SPEED;
  let sequence = firstSequence;
  const calls: PendingCall[] = [];
  const events: PerformanceEvent[] = [];
  const constraints: BindingConstraint[] = [];

  for (const [statementIndex, statement] of scene.script.entries()) {
    const [speaker, source] = Object.entries(statement)[0]!;
    if (!scene.actors[speaker]) throw new Error(`compileEpisode: script actor ${speaker} is not declared in scene ${scene.id}`);
    let chunkIndex = 0;
    let lastSpeech: SpeechLine | undefined;
    for (const chunk of splitDialogue(source)) {
      if ("text" in chunk) {
        const text = chunk.text;
        if (text.length === 0) continue;
        if (isSilent(text)) {
          cursor = round(cursor + [...text].filter((char) => char === "…").length * SILENT_BEAT_SEC);
        } else {
          const timing = await resolveSpeechTiming(context.options.speechTimingProvider, {
            sceneId: scene.id,
            statementIndex,
            lineId: `${scene.id}.${statementIndex}.${chunkIndex}`,
            actor: speaker,
            voice: context.assets.actors[speaker]!.voice.ref,
            language: context.episode.episode.language,
            text,
            sourceText: source,
            inlineTokens: splitDialogue(source).filter((item): item is ParsedGroup => "expressions" in item).flatMap((item) => item.expressions),
            speed: voiceSpeed,
          });
          const start = round(cursor);
          const end = round(start + timing.durationSec);
          events.push({kind: "speech", subject: speaker, start, end, text, speed: voiceSpeed, ...(timing.boundaries ? {boundaries: timing.boundaries} : {})});
          lastSpeech = {start, end, text, timing, tokens: splitDialogue(source).flatMap((item) => "expressions" in item ? item.expressions : [])};
          cursor = end;
        }
        chunkIndex++;
        continue;
      }

      const group = chunk as ParsedGroup;
      const groupStart = lastSpeech ? round(Math.min(lastSpeech.end, cursor)) : round(cursor);
      let groupEnd = groupStart;
      const groupCalls: PendingCall[] = [];
      for (const expression of group.expressions) {
        const sayMatch = expression.match(/^([a-z][a-z0-9_]*)\.say\((.*)\)$/s);
        if (sayMatch) {
          const speech = await compileInterruption(sayMatch, speaker, scene, statementIndex, context, groupStart, voiceSpeed);
          events.push(speech);
          groupEnd = Math.max(groupEnd, speech.end);
          continue;
        }
        const speedMatch = expression.match(/^voice\.speed\(\s*([0-9.]+)\s*\)$/);
        if (speedMatch) {
          const value = Number(speedMatch[1]);
          if (!(value > 0)) throw new Error(`compileEpisode: voice.speed must be positive in ${expression}`);
          voiceSpeed = value;
          continue;
        }
        const pending = await makeCall(evaluateCall(context, expression), scene, lastSpeech, groupStart, sequence++, context, group.expressions.length > 1);
        if (!pending) continue;
        groupCalls.push(pending);
        calls.push(pending);
        events.push(pending.event);
        constraints.push(...bindingConstraints(pending, scene.id));
        if (pending.blocking) groupEnd = Math.max(groupEnd, pending.event.end);
      }
      if (!lastSpeech) cursor = round(groupEnd);
    }
  }
  return {cursor, calls, events, constraints, nextSequence: sequence};
}

function splitDialogue(source: string): Array<{text: string} | ParsedGroup> {
  // Depth- and quote-aware scan so brace groups may contain nested object
  // literals (e.g. {...action.slam(a, b), durationSec: 1.2}).
  const result: Array<{text: string} | ParsedGroup> = [];
  let cursor = 0;
  let i = 0;
  while (i < source.length) {
    if (source[i] !== "{") {
      i++;
      continue;
    }
    let depth = 0;
    let quote: "'" | '"' | undefined;
    let escaped = false;
    let j = i;
    for (; j < source.length; j++) {
      const ch = source[j]!;
      if (quote) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === quote) quote = undefined;
      } else if (ch === "'" || ch === '"') quote = ch;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (j >= source.length) throw new Error("compileEpisode: unbalanced or nested brace group");
    result.push({text: source.slice(cursor, i)});
    const raw = source.slice(i + 1, j).trim();
    let expressions: string[];
    try {
      // Override groups (...call(args), key: value) stay one expression.
      expressions = raw.startsWith("...") ? [raw] : splitExpressions(raw);
    } catch (error) {
      throw new Error(`compileEpisode: invalid procedure group: ${raw} — ${(error as Error).message}`);
    }
    result.push({expressions, raw});
    cursor = j + 1;
    i = j + 1;
  }
  result.push({text: source.slice(cursor)});
  return result;
}

/**
 * Evaluate one brace expression to an invocation descriptor plus the shim
 * ProcedureCall metadata downstream staging consumes (subject, namespace,
 * terminal, simple args).
 */
function evaluateCall(context: CompileContext, expression: string): {descriptor: Invocation; call: ProcedureCall; declaredSec?: number} {
  const trimmed = expression.trim();
  // Override form: {...category.terminal(args), durationSec: 1.2, mode: "nonblock"}
  // (the braces may be omitted inside a brace group). It evaluates as a real
  // JS object spread; the callee is the first spread part.
  let calleeSource = trimmed;
  let evalSource = trimmed;
  if (trimmed.startsWith("...")) {
    evalSource = `{${trimmed}}`;
    calleeSource = splitExpressions(trimmed).map((part) => part.replace(/^\.\.\.\s*/, ""))[0]!;
  } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    if (!/^\.\.\./.test(trimmed.slice(1, -1).trim())) {
      throw new Error(`compileEpisode: override expressions must start with "...": ${trimmed}`);
    }
    calleeSource = splitExpressions(trimmed.slice(1, -1)).map((part) => part.replace(/^\.\.\.\s*/, ""))[0]!;
  }
  const callee = calleeOf(calleeSource);
  const segments = callee.split(".");
  if (segments.length !== 2) throw new Error(`compileEpisode: call must be category.terminal(...): ${expression}`);
  const [namespace, terminal] = segments as [string, string];
  const plugin = context.plugins.find((candidate) => candidate.category === namespace);
  if (!plugin) throw new Error(`compileEpisode: unknown plugin category "${namespace}" in ${expression}`);
  const evaluated = evaluateExpression(evalSource, context.scope);
  if (!isRecord(evaluated) || typeof (evaluated as {run?: unknown}).run !== "function") {
    throw new Error(`compileEpisode: ${expression} did not return an invocation descriptor`);
  }
  // When the call site overrides durationSec, keep the factory-declared value
  // for body validation (declaredSec) while the scheduler uses the override.
  let declaredSec: number | undefined;
  if (evaluated !== null && typeof evaluated === "object" && evalSource !== calleeSource) {
    const base = evaluateExpression(calleeSource, context.scope);
    if (isRecord(base) && base.durationSec !== (evaluated as {durationSec?: unknown}).durationSec) {
      declaredSec = typeof base.durationSec === "number" ? base.durationSec : undefined;
    }
  }
  const call = shimCall(calleeSource, namespace, terminal);
  call.raw = trimmed;
  return {descriptor: evaluated as unknown as Invocation, call, declaredSec};
}

const ACTOR_NAMESPACES = new Set(["action", "emotion", "gaze", "movement", "voice", "prop"]);
const SIMPLE_ARG = /^(?:[A-Za-z_$][\w$]*|-?(?:\d+(?:\.\d*)?|\.\d+)|true|false|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/;

function shimCall(expression: string, namespace: string, terminal: string): ProcedureCall {
  const args: Scalar[] = [];
  const match = expression.trim().match(/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*\(([\s\S]*)\)$/);
  const argText = match ? match[1]!.trim() : "";
  const parts = argText ? splitExpressions(argText) : [];
  if (parts.every((part) => SIMPLE_ARG.test(part))) {
    for (const part of parts) {
      if (/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(part)) args.push({kind: "number", value: Number(part)});
      else if (part === "true" || part === "false") args.push({kind: "boolean", value: part === "true"});
      else if (/^["']/.test(part)) args.push({kind: "string", value: part.slice(1, -1)});
      else args.push({kind: "ref", value: part});
    }
  }
  let subject = namespace;
  if (ACTOR_NAMESPACES.has(namespace)) {
    const firstRef = args.findIndex((arg) => arg.kind === "ref");
    if (firstRef >= 0) {
      subject = (args[firstRef] as {value: string}).value;
      args.splice(firstRef, 1);
    }
  }
  return {raw: expression.trim(), subject, namespace: namespace as ProcedureCall["namespace"], terminal, path: `${namespace}.${terminal}`, args, kwargs: {}};
}

async function makeCall(
  evaluated: {descriptor: Invocation; call: ProcedureCall; declaredSec?: number},
  scene: NarrowEpisode["scenes"][number],
  lastSpeech: SpeechLine | undefined,
  groupStart: number,
  sequence: number,
  context: CompileContext,
  concurrent: boolean,
): Promise<PendingCall | undefined> {
  void scene;
  const {descriptor, call, declaredSec} = evaluated;
  const start = lastSpeech ? speechMarker(lastSpeech, call, context.episode.episode.id) : groupStart;
  const blocking = descriptor.mode !== "nonblock";
  if (blocking && (descriptor.durationSec === undefined || !(descriptor.durationSec >= 0))) {
    throw new Error(`compileEpisode: blocking call needs durationSec: ${call.raw}`);
  }
  const kind = STATE_NAMESPACES.has(call.namespace) ? "state" : "timed";
  const world: World = {canvas: {aspect: 16 / 9, tracks: []}, plugins: {}, frame: 0, seconds: 0, fps: 24, seed: 0};
  const {elapsedSec} = runInvocationSync(descriptor, world, {id: `${call.path}.${sequence}`, category: call.namespace, asset: call.terminal, declaredSec});
  const duration = descriptor.durationSec ?? elapsedSec;
  const tracks = world.canvas.tracks;
  const resolution = {
    durationSec: duration,
    performance: {kind: "procedure" as const, id: call.path, durationSec: duration, params: [], phases: [], body: [], expression: [], gaze: [], camera: [], vfx: [], audio: [], recipe: {tracks}},
    tracks,
  };
  const end = round(start + (kind === "state" ? 0 : duration));
  return {
    event: callEvent(call, start, end, concurrent, resolution),
    resolution,
    sequence,
    blocking: kind !== "state" && blocking,
  };
}

async function compileInterruption(
  sayMatch: RegExpMatchArray,
  speaker: string,
  scene: NarrowEpisode["scenes"][number],
  statementIndex: number,
  context: CompileContext,
  start: number,
  speed: number,
): Promise<SpeechPerformanceEvent> {
  void scene;
  const subject = sayMatch[1]!;
  const rawArgs = sayMatch[2]!.trim();
  if (subject !== speaker) throw new Error(`compileEpisode: actor.say subject must be the statement actor in scene ${scene.id}`);
  if (!/^"(?:\\.|[^"\\])*"$/.test(rawArgs) || Object.keys(rawArgs).length === 0) {
    throw new Error(`compileEpisode: actor.say requires one quoted string`);
  }
  const text = JSON.parse(rawArgs.replace(/^"/, '"').replace(/"$/, '"').replace(/\n/g, "\\n")) as string;
  const timing = await resolveSpeechTiming(context.options.speechTimingProvider, {
    sceneId: scene.id,
    statementIndex,
    lineId: `${scene.id}.${statementIndex}.interrupt`,
    actor: subject,
    voice: context.assets.actors[subject]!.voice.ref,
    language: context.episode.episode.language,
    text,
    sourceText: `${subject}.say(${rawArgs})`,
    inlineTokens: [`${subject}.say(${rawArgs})`],
    speed,
  });
  return {kind: "speech", subject, start: round(start), end: round(start + timing.durationSec), text, speed, ...(timing.boundaries ? {boundaries: timing.boundaries} : {}), interruption: true};
}

function callEvent(call: ProcedureCall, start: number, end: number, concurrent: boolean, resolution: ProcedureResolution): CallPerformanceEvent {
  return {
    kind: "call",
    subject: call.subject,
    start: round(start),
    end: round(end),
    call,
    source: "inline",
    ...(concurrent ? {concurrent: true} : {}),
    ...(resolution.performance !== undefined ? {performance: resolution.performance} : {}),
    ...(resolution.tracks !== undefined ? {tracks: resolution.tracks} : {}),
  };
}


function speedAfterCalls(calls: readonly ProcedureCall[], current: number): number {
  let speed = current;
  for (const call of calls) {
    if (call.namespace !== "voice" || call.terminal !== "speed") continue;
    const value = call.args[0];
    if (value?.kind === "number" && Number.isFinite(value.value) && value.value > 0) speed = value.value;
  }
  return speed;
}

function speechMarker(line: SpeechLine, call: ProcedureCall, episodeId: string): number {
  const candidates = [call.raw, call.path, procedureId(call)];
  const markers = {...(line.timing.markers ?? {}), ...(line.timing.inline ?? {})};
  let relative = candidates.map((key) => markers[key]).find((value) => value !== undefined);
  if (relative === undefined && line.timing.events) {
    const event = line.timing.events.find((item) => candidates.includes(item.token ?? "") || candidates.includes(item.name ?? ""));
    relative = event?.startSec ?? event?.start;
  }
  if (relative === undefined && line.timing.boundaries?.length) {
    relative = line.timing.boundaries.find((item) => item.startChar === undefined || item.startChar >= 0)?.startSec;
  }
  if (relative === undefined) throw new Error(`compileEpisode: missing alignment marker for ${call.raw} in line ${episodeId}`);
  if (!Number.isFinite(relative) || relative < 0 || relative > line.timing.durationSec) throw new Error(`compileEpisode: speech marker ${call.raw} is outside line ${episodeId}`);
  return round(line.start + relative);
}

async function resolveProcedure(resolver: ProcedureResolver, call: ProcedureCall, context: ProcedureResolveContext): Promise<ProcedureResolution> {
  let result: unknown;
  if (typeof resolver === "function") result = await resolver(call, context);
  else if (resolver.resolve) result = await resolver.resolve(call, context);
  else if (resolver.resolveProcedure) result = await resolver.resolveProcedure(call, context);
  else {
    const implementation = resolver[call.path];
    result = typeof implementation === "function" ? await implementation(call, context) : implementation;
  }
  if (typeof result === "number") result = {durationSec: result};
  if (!isRecord(result)) throw new Error(`compileEpisode: resolver returned no resolution for ${call.raw}`);
  return {
    ...(typeof result.durationSec === "number" ? {durationSec: result.durationSec} : {}),
    ...(result.kind === "timed" || result.kind === "state" || result.kind === "speech" ? {kind: result.kind} : {}),
    ...(isRecord(result.timing) ? {timing: result.timing as ProcedureResolution["timing"]} : {}),
    ...(isRecord(result.markers) ? {markers: asNumberRecord(result.markers)} : {}),
    ...(Array.isArray(result.events) ? {events: asMarkers(result.events)} : {}),
    ...(result.performance !== undefined ? {performance: result.performance} : {}),
    ...(Array.isArray(result.tracks) ? {tracks: result.tracks as ProcedureTrack[]} : {}),
    ...(isRecord(result.actorState) ? {actorState: result.actorState as Partial<ActorState>} : {}),
  };
}

async function resolveSpeechTiming(provider: SpeechTimingProvider, request: SpeechTimingRequest): Promise<SpeechTiming> {
  let result: unknown;
  if (typeof provider === "function") result = await provider(request);
  else if (provider.getTiming) result = await provider.getTiming(request);
  else if (provider.resolve) result = await provider.resolve(request);
  else if (provider.measure) result = await provider.measure(request);
  else throw new Error("compileEpisode: speech timing provider has no timing method");
  if (typeof result === "number") result = {durationSec: result};
  if (!isRecord(result) || typeof result.durationSec !== "number" || !Number.isFinite(result.durationSec) || result.durationSec < 0) {
    throw new Error(`compileEpisode: invalid speech timing for ${request.lineId}`);
  }
  return {durationSec: round(result.durationSec), ...(isRecord(result.markers) ? {markers: asNumberRecord(result.markers)} : {}), ...(isRecord(result.inline) ? {inline: asNumberRecord(result.inline)} : {}), ...(Array.isArray(result.boundaries) ? {boundaries: result.boundaries as SpeechBoundary[]} : {})};
}

/** Lifecycle and binding projection deliberately consume generic recipe tracks. */
function applyLifecycle(calls: PendingCall[], state: MutableState): void {
  for (const pending of [...calls].sort((a, b) => a.event.start - b.event.start || a.sequence - b.sequence)) {
    const actor = state.actors.get(pending.event.subject);
    if (actor && pending.resolution.actorState) Object.assign(actor, safeActorState(pending.resolution.actorState));
    if (actor && pending.event.call.namespace === "emotion") actor.face = pending.event.call.terminal;
    if (actor && pending.event.call.namespace === "gaze") {
      const target = pending.event.call.args[0];
      if (target?.kind === "ref") actor.gaze = target.value;
    }
    for (const track of pending.resolution.tracks ?? []) {
      if (!isRecord(track) || track.kind !== "lifecycle" || !Array.isArray(track.events)) continue;
      for (const item of track.events) {
        if (!isRecord(item)) continue;
        const value = isRecord(item.value) ? item.value : item;
        if (actor) Object.assign(actor, safeActorState(value));
        const objectId = stringValue(value.object ?? value.target);
        const prop = objectId ? state.props.get(objectId) : undefined;
        if (prop) Object.assign(prop, safePropState(value));
      }
    }
  }
}

function bindingConstraints(pending: PendingCall, sceneId: string): BindingConstraint[] {
  const result: BindingConstraint[] = [];
  for (const track of pending.resolution.tracks ?? []) {
    if (!isRecord(track) || track.kind !== "binding" || !Array.isArray(track.events)) continue;
    for (const item of track.events) {
      if (!isRecord(item)) continue;
      const value = isRecord(item.value) ? item.value : item;
      const object = stringValue(value.object ?? value.prop ?? track.target);
      const holder = stringValue(value.holder ?? value.subject ?? pending.event.subject);
      if (!object || !holder) continue;
      const at = numberValue(item.at) ?? 0;
      const itemEnd = numberValue(item.end) ?? (numberValue(item.duration) === undefined ? pending.event.end - pending.event.start : at + numberValue(item.duration)!);
      result.push({object, holder, start: round(pending.event.start + at), end: round(pending.event.start + Math.max(at, itemEnd)), sceneId, continuous: true});
    }
  }
  return result;
}

function buildTracks(events: readonly PerformanceEvent[], episode: NarrowEpisode): PerformanceTrack[] {
  const bySubject = new Map<string, PerformanceTrack>();
  for (const actor of Object.keys(episode.actors)) bySubject.set(actor, {subject: actor, kind: "actor", events: []});
  for (const event of events) {
    let track = bySubject.get(event.subject);
    if (!track) {
      track = {subject: event.subject, kind: WORLD_SUBJECTS.has(event.subject) || !episode.actors[event.subject] ? "world" : "actor", events: []};
      bySubject.set(event.subject, track);
    }
    track.events.push(event);
  }
  for (const track of bySubject.values()) track.events.sort((a, b) => a.start - b.start);
  return [...bySubject.values()];
}

function initialState(episode: NarrowEpisode): MutableState {
  return {
    actors: new Map(Object.keys(episode.actors).map((id) => [id, {present: true, pose: "standing", heldProps: []}])),
    props: new Map(Object.keys(episode.objects).map((id) => [id, {status: "loose" as const}])),
  };
}

function snapshotState(state: MutableState, episode: NarrowEpisode): EpisodeState {
  const actors: Record<string, ActorState> = {};
  for (const id of Object.keys(episode.actors)) actors[id] = {...state.actors.get(id)!, heldProps: Object.keys(episode.objects).filter((object) => state.props.get(object)?.holder === id)};
  const props: Record<string, PropState> = {};
  for (const id of Object.keys(episode.objects)) props[id] = {...state.props.get(id)!};
  return {actors, props};
}

/**
 * "on(X)" placement resolves against DECLARED support surfaces (set or prop
 * manifests) — the object's base line stands on the surface, inside its x
 * range. No hard-coded offsets: a surface nobody declared cannot hold
 * anything (compile error).
 */
function resolveSupportSurfaces(
  staging: {objects?: Readonly<Record<string, {at: readonly [number, number]; scale: number; z?: number}>>},
  sceneObjects: Record<string, string | undefined>,
  context: CompileContext,
): void {
  const locationIds = Object.keys(context.episode.locations);
  const setAsset = locationIds.length ? context.assets.locations[locationIds[0]!] : undefined;
  const setResolved = (setAsset?.resolved ?? {}) as {supports?: Array<{name: string; x: [number, number]; y: number}>};
  const objects: Record<string, {at: readonly [number, number]; scale: number; z?: number}> = {...(staging.objects ?? {})};
  for (const [id, placement] of Object.entries(sceneObjects)) {
    const match = (placement ?? "").match(/^on\(([a-z][a-z0-9_]*)\)$/);
    if (!match) continue;
    const target = match[1]!;
    const staged = objects[id];
    if (!staged) continue;
    const targetAsset = context.assets.objects[target];
    const targetPlacement = (targetAsset?.resolved as {placement?: {base: number; size: [number, number]; supports?: Array<{name: string; x: [number, number]; y: number}>}} | undefined)?.placement;
    const targetStaged = objects[target];
    const targetIsProp = targetPlacement !== undefined && targetStaged !== undefined;
    const surfaces = targetIsProp
      ? (targetPlacement?.supports ?? [])
      : (setResolved.supports ?? []).filter((surface) => surface.name === target);
    const surface = surfaces[0];
    if (!surface) {
      throw new Error(`compileEpisode: object "${id}" placed on "${target}" but no support surface is declared for it`);
    }
    let xStage: number;
    let yStage: number;
    if (targetIsProp) {
      // Prop target: its staged base line is at.at[1] (fraction); the surface
      // sits (base - surface.y) art-px above it, scaled.
      const targetBaseY = targetStaged.at[1] * 1080;
      const [tw] = targetPlacement!.size;
      yStage = targetBaseY - (targetPlacement!.base - surface.y) * targetStaged.scale;
      const [sx0, sx1] = surface.x;
      const cx0 = targetStaged.at[0] * 1920 - tw / 2 * targetStaged.scale + sx0 * targetStaged.scale;
      const cx1 = targetStaged.at[0] * 1920 - tw / 2 * targetStaged.scale + sx1 * targetStaged.scale;
      xStage = Math.min(Math.max(staged.at[0] * 1920, cx0), cx1);
    } else {
      // Set-space surfaces are already in the 1920x1080 stage frame.
      const [sx0, sx1] = surface.x;
      xStage = Math.min(Math.max(staged.at[0] * 1920, sx0), sx1);
      yStage = surface.y;
    }
    staged.at = [xStage / 1920, yStage / 1080];
    staged.z = (staged.z ?? 35) + 1;
  }
  // Normalize prop scales from declared stage widths (data-driven sizing).
  for (const [id, placement] of Object.entries(sceneObjects)) {
    const staged = objects[id];
    if (!staged) continue;
    const resolved = context.assets.objects[id]?.resolved as {placement?: {size?: [number, number]; stageWidth?: number}} | undefined;
    const decl = resolved?.placement;
    if (decl?.size && decl.size[0] > 0) staged.scale = (decl.stageWidth ?? 320) / decl.size[0];
  }
}

function relationFor(value: string): {relation?: "on"; target?: string} {
  const target = value.match(/^on\(([a-z][a-z0-9_]*)\)$/)?.[1];
  return target ? {relation: "on", target} : {};
}

function procedureKind(procedure: Record<string, unknown> | undefined, call: ProcedureCall): "timed" | "state" | "speech" {
  const kind = procedure?.procedureKind ?? procedure?.kind;
  if (kind === "state" || kind === "speech" || kind === "timed") return kind;
  return STATE_NAMESPACES.has(call.namespace) ? "state" : "timed";
}

function normalizedSpanKey(call: ProcedureCall, kwargs: Record<string, Scalar>): string {
  const modifiers = Object.keys(kwargs).filter((key) => key !== "mode").sort().map((key) => `${key}=${scalarKey(kwargs[key]!)}`);
  return `${call.subject}|${call.path}|${call.args.map(scalarKey).join(",")}|${modifiers.join(",")}`;
}

function procedureId(call: ProcedureCall): string { return `${call.namespace}.${call.terminal}`; }

function scalarKey(value: Scalar): string {
  return `${value.kind}:${typeof value.value === "string" ? JSON.stringify(value.value) : String(value.value)}`;
}
function scalarString(value: Scalar | undefined): string | undefined { return value?.kind === "string" ? value.value : undefined; }
function scalarNumber(value: Scalar | undefined): number | undefined { return value?.kind === "number" ? value.value : undefined; }
function numberValue(value: unknown): number | undefined { return typeof value === "number" && Number.isFinite(value) ? value : undefined; }
function stringValue(value: unknown): string | undefined { return typeof value === "string" && value ? value : undefined; }
function isSilent(text: string): boolean { return /^(?:\s*…\s*)+$/u.test(text); }

function scalarRecord(value: Record<string, unknown>): Record<string, Scalar> {
  return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => isScalar(item) ? [[key, item]] : []));
}
function isScalar(value: unknown): value is Scalar {
  return isRecord(value) && (value.kind === "ref" || value.kind === "string" || value.kind === "number" || value.kind === "boolean") && ["string", "number", "boolean"].includes(typeof value.value);
}
function asNumberRecord(value: Record<string, unknown>): Record<string, number> | undefined {
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(value)) if (typeof item === "number" && Number.isFinite(item)) result[key] = item;
  return Object.keys(result).length ? result : undefined;
}
function asMarkers(value: unknown[]): ProcedureMarker[] | undefined {
  const result = value.flatMap((item): ProcedureMarker[] => isRecord(item) && typeof item.name === "string" && typeof item.at === "number" ? [{name: item.name, at: item.at}] : []);
  return result.length ? result : undefined;
}
function safeActorState(value: Record<string, unknown>): Partial<ActorState> {
  const result: Partial<ActorState> = {};
  if (typeof value.present === "boolean") result.present = value.present;
  if (typeof value.pose === "string") result.pose = value.pose;
  if (["string", "number"].includes(typeof value.placement)) result.placement = value.placement;
  if (typeof value.face === "string") result.face = value.face;
  if (typeof value.gaze === "string") result.gaze = value.gaze;
  return result;
}
function safePropState(value: Record<string, unknown>): Partial<PropState> {
  const result: Partial<PropState> = {};
  if (value.status === "loose" || value.status === "held" || value.status === "supported") result.status = value.status;
  if (typeof value.holder === "string") result.holder = value.holder;
  if (typeof value.support === "string") result.support = value.support;
  if (["string", "number"].includes(typeof value.placement)) result.placement = value.placement;
  return result;
}
function isRecord(value: unknown): value is Record<string, any> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function round(value: number): number { return Math.round(value * 1_000_000) / 1_000_000; }
