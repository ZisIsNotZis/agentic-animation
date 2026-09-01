import {
  inlineTokens,
  parseProcedureCalls,
  type NarrowEpisode,
  type ProcedureCall,
  type Scalar,
} from "../schemas/narrowEpisode";
import {loadNarrowEpisode} from "../narrowEpisode/load";
import {stageScene, type StagingResult} from "../staging";

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
  validateProcedureCall?: (call: any, locals: any) => unknown | Promise<unknown>;
  resolveProcedure?: (id: string) => unknown;
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
  resolver?: ProcedureResolver;
  procedureResolver?: ProcedureResolver;
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
}

export interface CompiledEpisode {
  episode: NarrowEpisode["episode"];
  assets: CompiledAssets;
  sceneTrack: CompiledScene[];
  performanceTracks: PerformanceTrack[];
  bindingConstraints: BindingConstraint[];
  totalDuration: number;
}

interface ParsedGroup { calls: ProcedureCall[]; raw: string; }
interface SpeechLine {
  start: number;
  end: number;
  text: string;
  timing: SpeechTiming;
  tokens: ProcedureCall[];
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
  options: CompileEpisodeOptions & {resolver: ProcedureResolver; speechTimingProvider: SpeechTimingProvider};
  assets: CompiledAssets;
  assetCache: Map<string, ResolvedAsset>;
}

const WORLD_SUBJECTS = new Set(["camera", "vfx", "sfx", "music"]);
const STATE_NAMESPACES = new Set(["face", "look", "voice", "state"]);
const SILENT_BEAT_SEC = 0.55;
const DEFAULT_VOICE_SPEED = 1;
const LOGICAL_STAGE = {width: 1, height: 1} as const;

/** Compile NarrowEpisode source into deterministic renderer-neutral IR. */
export async function compileEpisode(yamlPath: string, options: CompileEpisodeOptions): Promise<CompiledEpisode> {
  const episode = await loadNarrowEpisode(yamlPath);
  const speechTimingProvider = options.speechTimingProvider ?? options.speechTiming;
  if (!speechTimingProvider) throw new Error("compileEpisode: speech timing provider is required");
  const resolver = options.procedureResolver ?? options.resolver;
  if (!resolver) throw new Error("compileEpisode: procedure resolver is required");

  const context: CompileContext = {
    episode,
    options: {...options, resolver, speechTimingProvider},
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
    const initial = snapshotState(state, episode);
    const compiled = await compileScene(scene, sceneStart, context, sequence);
    sequence = compiled.nextSequence;
    applyLifecycle(compiled.calls, state);
    constraints.push(...compiled.constraints);
    const duration = round(Math.max(0, compiled.cursor - sceneStart, ...compiled.calls.map((item) => item.event.end - sceneStart)));
    const end = round(sceneStart + duration);
    const final = snapshotState(state, episode);
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
      performanceTracks: buildTracks(compiled.events, episode),
      activeBindingConstraints: constraints.filter((item) => item.start < end && item.end > sceneStart),
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
  const spans = new Map<string, OpenSpan>();

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
            inlineTokens: splitDialogue(source).filter((item): item is ParsedGroup => "calls" in item).flatMap((item) => item.calls.map((call) => call.raw)),
            speed: voiceSpeed,
          });
          const start = round(cursor);
          const end = round(start + timing.durationSec);
          events.push({kind: "speech", subject: speaker, start, end, text, speed: voiceSpeed, ...(timing.boundaries ? {boundaries: timing.boundaries} : {})});
          lastSpeech = {start, end, text, timing, tokens: splitDialogue(source).flatMap((item) => "calls" in item ? item.calls : [])};
          cursor = end;
        }
        chunkIndex++;
        continue;
      }

      const group = chunk as ParsedGroup;
      const groupStart = lastSpeech ? round(Math.min(lastSpeech.end, cursor)) : round(cursor);
      let groupEnd = groupStart;
      const groupCalls: PendingCall[] = [];
      for (const call of group.calls) {
        voiceSpeed = speedAfterCalls([call], voiceSpeed);
        if (call.namespace === "say") {
          const speech = await compileInterruption(call, speaker, scene, statementIndex, context, groupStart, voiceSpeed);
          events.push(speech);
          groupEnd = Math.max(groupEnd, speech.end);
          continue;
        }
        const validated = await validateCall(context, call);
        const callStart = lastSpeech ? speechMarker(lastSpeech, call, context.episode.episode.id) : groupStart;
        const pending = await makeCall(validated, scene, callStart, sequence++, context, group.calls.length > 1, spans);
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
  for (const span of spans.values()) throw new Error(`compileEpisode: span ${span.key} is open at the end of scene ${scene.id}`);
  return {cursor, calls, events, constraints, nextSequence: sequence};
}

function splitDialogue(source: string): Array<{text: string} | ParsedGroup> {
  if (!inlineTokens(source)) throw new Error("compileEpisode: unbalanced or nested brace group");
  const result: Array<{text: string} | ParsedGroup> = [];
  const pattern = /\{([^{}]*)\}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source))) {
    result.push({text: source.slice(cursor, match.index)});
    const raw = match[1]!.trim();
    const calls = parseProcedureCalls(raw);
    if (!calls) throw new Error(`compileEpisode: invalid procedure group: ${raw}`);
    result.push({calls, raw});
    cursor = match.index + match[0].length;
  }
  result.push({text: source.slice(cursor)});
  return result;
}

async function validateCall(context: CompileContext, call: ProcedureCall): Promise<ValidatedCall> {
  const registry = context.options.registry;
  if (typeof registry === "function" || !registry.validateProcedureCall) return {call, kwargs: {...call.kwargs}};
  const result = await registry.validateProcedureCall({
    subject: call.subject,
    id: call.path,
    path: call.path,
    args: [...call.args],
    kwargs: {...call.kwargs},
  }, {actors: context.episode.actors, objects: context.episode.objects});
  const record = isRecord(result) ? result : {};
  const procedure = isRecord(record.procedure) ? record.procedure : undefined;
  const returnedKwargs = isRecord(record.kwargs) ? scalarRecord(record.kwargs) : {};
  return {call: {...call, kwargs: {...call.kwargs, ...returnedKwargs}}, procedure, kwargs: {...call.kwargs, ...returnedKwargs}};
}

async function makeCall(
  validated: ValidatedCall,
  scene: NarrowEpisode["scenes"][number],
  start: number,
  sequence: number,
  context: CompileContext,
  concurrent: boolean,
  spans: Map<string, OpenSpan>,
): Promise<PendingCall | undefined> {
  const call = validated.call;
  const mode = scalarString(call.kwargs.mode);
  const durationOverride = scalarNumber(call.kwargs.duration);
  if (mode && mode !== "begin" && mode !== "end" && mode !== "nonblock") throw new Error(`compileEpisode: invalid mode for ${call.raw}`);
  if ((mode === "begin" || mode === "end") && durationOverride !== undefined) throw new Error(`compileEpisode: duration is invalid on ${mode} span ${call.raw}`);

  const kind = procedureKind(validated.procedure, call);
  const resolverCall = {...call, name: procedureId(call)} as ProcedureCall & {name: string};
  const resolution = await resolveProcedure(context.options.resolver, resolverCall, {
    sceneId: scene.id,
    subject: call.subject,
    source: "inline",
    start,
    call,
    episode: context.episode,
  });
  const manifestTiming = isRecord(validated.procedure?.timing) ? validated.procedure.timing : undefined;
  const manifestDuration = numberValue(manifestTiming?.defaultDuration);
  const baseDuration = resolution.durationSec ?? resolution.timing?.defaultDuration ?? manifestDuration ?? 0;
  if (!Number.isFinite(baseDuration) || baseDuration < 0) throw new Error(`compileEpisode: invalid duration for ${call.raw}`);
  if (durationOverride !== undefined && resolution.timing?.scalable === false) throw new Error(`compileEpisode: ${call.raw} does not support duration override`);
  const duration = durationOverride ?? baseDuration;
  if (kind === "state" && durationOverride !== undefined) throw new Error(`compileEpisode: state call ${call.raw} rejects duration`);
  if ((mode === "begin" || mode === "end") && kind !== "timed") throw new Error(`compileEpisode: ${kind} call ${call.raw} cannot form a span`);
  const spanKey = normalizedSpanKey(call, validated.kwargs);

  if (mode === "begin") {
    if (spans.has(spanKey)) throw new Error(`compileEpisode: duplicate span begin ${spanKey}`);
    const pending: PendingCall = {
      event: callEvent(call, start, start, concurrent, resolution),
      resolution,
      sequence,
      blocking: false,
    };
    spans.set(spanKey, {key: spanKey, pending, sceneId: scene.id});
    return pending;
  }
  if (mode === "end") {
    const open = spans.get(spanKey);
    if (!open) throw new Error(`compileEpisode: unmatched span end ${spanKey}`);
    if (open.sceneId !== scene.id) throw new Error(`compileEpisode: span ${spanKey} crosses scenes`);
    if (start < open.pending.event.start) throw new Error(`compileEpisode: span ${spanKey} ends before it begins`);
    open.pending.event.end = round(start);
    spans.delete(spanKey);
    return undefined;
  }

  const end = round(start + (kind === "state" ? 0 : duration));
  return {
    event: callEvent(call, start, end, concurrent, resolution),
    resolution,
    sequence,
    blocking: kind !== "state" && mode !== "nonblock",
  };
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

async function compileInterruption(
  call: ProcedureCall,
  speaker: string,
  scene: NarrowEpisode["scenes"][number],
  statementIndex: number,
  context: CompileContext,
  start: number,
  speed: number,
): Promise<SpeechPerformanceEvent> {
  if (call.subject !== speaker) throw new Error(`compileEpisode: actor.say subject must be the statement actor in scene ${scene.id}`);
  const text = call.args[0];
  if (!text || text.kind !== "string" || Object.keys(call.kwargs).length) throw new Error(`compileEpisode: actor.say requires one quoted string and no modifiers`);
  const timing = await resolveSpeechTiming(context.options.speechTimingProvider, {
    sceneId: scene.id,
    statementIndex,
    lineId: `${scene.id}.${statementIndex}.interrupt`,
    actor: call.subject,
    voice: context.assets.actors[call.subject]!.voice.ref,
    language: context.episode.episode.language,
    text: text.value,
    sourceText: call.raw,
    inlineTokens: [call.raw],
    speed,
  });
  return {kind: "speech", subject: call.subject, start: round(start), end: round(start + timing.durationSec), text: text.value, speed, ...(timing.boundaries ? {boundaries: timing.boundaries} : {}), interruption: true};
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
    if (actor && pending.event.call.namespace === "face") actor.face = pending.event.call.terminal;
    if (actor && pending.event.call.namespace === "look") {
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
