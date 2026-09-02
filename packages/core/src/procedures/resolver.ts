import type {ProcedureManifest} from "../schemas/libraryMeta";
import type {ProcedureResolution, ProcedureResolveContext} from "../compiler/index";
import type {ProcedureCall} from "../schemas/narrowEpisode";
import {PROCEDURE_DEFINITIONS, type ProcedureDefinition, type ProcedureParameter} from "./catalog";
import type {
  AudioIntent,
  BodyIntent,
  CameraIntent,
  ExpressionIntent,
  GazeIntent,
  ProcedurePerformance,
  ProcedurePhase,
  ProcedureRecipe,
  ProcedureRecipeEvent,
  ProcedureRecipeTrack,
  ProcedureResolverContext,
  ProcedureResolutionWithPerformance,
  ProcedureTrack,
  VfxIntent,
} from "./types";

export interface ProcedureManifestSource {
  resolveProcedure(id: string): ProcedureManifest;
}

export type ProcedureCatalog = Readonly<Record<string, ProcedureDefinition>>;
export type {ProcedureDefinition, ProcedureParameter};

/** A category plugin may contribute either a definition catalog or a resolver. */
export interface ProcedurePluginResolver {
  readonly category?: string;
  readonly definitions?: ProcedureCatalog;
  readonly procedures?: ProcedureCatalog;
  readonly resolve?: (call: ProcedureCall, context: ProcedureResolverContext) => unknown;
  readonly resolveProcedure?: (call: ProcedureCall, context: ProcedureResolverContext) => unknown;
}

export type ProcedureDiscovery =
  | ProcedurePluginResolver
  | readonly ProcedurePluginResolver[]
  | ((call: ProcedureCall, context: ProcedureResolverContext) => unknown);

export interface ProcedureResolverOptions {
  /** The registry is authoritative for which public procedure ids are legal. */
  registry?: ProcedureManifestSource | readonly ProcedureManifest[];
  /** A replacement catalog is useful for tests and future library versions. */
  definitions?: ProcedureCatalog;
  /** Whole-world plugin seam. Keys are canonical, fully-qualified call paths. */
  discovery?: ProcedureDiscovery;
}

function sourceIds(source: ProcedureResolverOptions["registry"]): readonly string[] | undefined {
  if (!source) return undefined;
  if (Array.isArray(source)) return source.map((procedure) => procedure.id);
  return undefined;
}

function definitionFor(call: ProcedureCall, definitions: ProcedureCatalog): ProcedureDefinition {
  const id = `${call.namespace}.${call.terminal}`;
  const definition = definitions[id] ?? Object.values(definitions).find((candidate) => candidate.id === id);
  if (!definition) throw new Error(`procedure resolver has no authored implementation for ${id}`);
  return definition;
}

function validateCoverage(source: ProcedureResolverOptions["registry"], definitions: ProcedureCatalog): void {
  const ids = sourceIds(source);
  if (!ids) return;
  const missing = ids.filter((id) => !definitions[id]);
  if (missing.length) throw new Error(`procedure resolver missing implementations: ${missing.join(", ")}`);
}

function validateCall(
  call: ProcedureCall,
  context: ProcedureResolveContext,
  definition: ProcedureDefinition,
  registry?: ProcedureManifestSource | readonly ProcedureManifest[],
): void {
  const id = definition.id;
  if (call.args.length !== definition.params.length) {
    throw new Error(`${id} expects ${definition.params.length} arguments, got ${call.args.length}`);
  }
  const subjectType = definition.subjects.includes(call.subject as ProcedureDefinition["subjects"][number]) ? call.subject : definition.subjects[0];
  if (!definition.subjects.includes(subjectType as ProcedureDefinition["subjects"][number])) {
    throw new Error(`${id} does not allow subject ${context.subject}`);
  }
  const manifest = registry
    ? "resolveProcedure" in registry
      ? registry.resolveProcedure(id)
      : registry.find((candidate) => candidate.id === id)
    : undefined;
  if (manifest) {
    if (manifest.arity !== definition.params.length || manifest.params.some((param: ProcedureManifest["params"][number], index: number) => {
      const authored = definition.params[index];
      return !authored || authored.name !== param.name || authored.type !== param.type;
    })) {
      throw new Error(`procedure ${id} implementation does not match its registry contract`);
    }
    if (!manifest.subjects.includes(subjectType as ProcedureManifest["subjects"][number])) {
      throw new Error(`${id} does not allow subject ${context.subject}`);
    }
  }
}

function interpolatePhase(phase: readonly [string, string, ProcedurePhase["ease"]], start: number, end: number): ProcedurePhase {
  return {id: phase[0], start, end, ease: phase[2], intent: phase[1]};
}

function paramValues(definition: ProcedureDefinition, call: ProcedureCall): Readonly<Record<string, string>> {
  return Object.fromEntries(definition.params.map((param, index) => {
    return [param.name, String(call.args[index]!.value)];
  })) as Record<string, string>;
}

function makePerformance(definition: ProcedureDefinition, call: ProcedureCall, subject: string): ProcedurePerformance {
  const params = paramValues(definition, call);
  const phases = definition.phases.map(([id, intent, ease], index, all) => {
    const start = (definition.durationSec * index) / all.length;
    const end = (definition.durationSec * (index + 1)) / all.length;
    return interpolatePhase([id, intent, ease], start, end);
  });
  const phaseAt = (index: number): number => phases[index]?.start ?? 0;
  const body: BodyIntent[] = phases.map((phase) => ({
    at: phase.start,
    phase: phase.id,
    action: phase.intent,
    parts: definition.parts,
    ...(definition.params.length ? {target: params[definition.params[definition.params.length - 1]!.name]} : {}),
  }));
  const expression: ExpressionIntent[] = definition.emotion
    ? [{at: phaseAt(0), phase: phases[0]?.id ?? "start", name: definition.emotion.name, emotion: definition.emotion.name, brow: definition.emotion.brow, eyes: definition.emotion.eyes, mouth: definition.emotion.mouth, intensity: definition.emotion.intensity}]
    : [];
  const gaze: GazeIntent[] = definition.gaze
    ? [{at: phaseAt(0), phase: phases[0]?.id ?? "start", ...definition.gaze}]
    : [];
  const camera: CameraIntent[] = definition.camera
    ? [{at: phaseAt(0), phase: phases[0]?.id ?? "start", ...definition.camera, ease: phases[0]?.ease ?? "io"}]
    : [];
  const vfx: VfxIntent[] = definition.vfx
    ? [{at: phaseAt(Math.min(1, phases.length - 1)), phase: phases[Math.min(1, phases.length - 1)]?.id ?? "impact", ...definition.vfx, duration: definition.vfx.duration ?? definition.durationSec}]
    : [];
  const audio: AudioIntent[] = definition.audio
    ? [{at: phaseAt(Math.min(1, phases.length - 1)), phase: phases[Math.min(1, phases.length - 1)]?.id ?? "hit", ...definition.audio, duration: definition.audio.duration ?? definition.durationSec}]
    : [];
  const recipe = definition.recipe ?? buildGenericRecipe(definition, subject, params, body, expression, gaze, camera, vfx, audio);
  validateRecipe(definition.id, recipe);
  return {kind: "procedure", id: definition.id, durationSec: definition.durationSec, params, phases, body, expression, gaze, camera, vfx, audio, recipe: resolveRecipe(recipe, params)};
}

function recipeEvent(value: {at: number}, duration: number): ProcedureRecipeEvent {
  const event: ProcedureRecipeEvent = {...(value as Record<string, unknown>), at: value.at, duration, value};
  return event;
}

function semanticEvent(at: number, duration: number, value: Record<string, unknown>): ProcedureRecipeEvent {
  return {...value, at, duration, value};
}

function buildGenericRecipe(
  definition: ProcedureDefinition,
  subject: string,
  params: Readonly<Record<string, string>>,
  body: readonly BodyIntent[],
  expression: readonly ExpressionIntent[],
  gaze: readonly GazeIntent[],
  camera: readonly CameraIntent[],
  vfx: readonly VfxIntent[],
  audio: readonly AudioIntent[],
): ProcedureRecipe {
  const tracks: ProcedureRecipeTrack[] = [];
  const phaseDuration = (_event: {phase: string; at: number}): number => definition.durationSec / definition.phases.length;
  if (definition.trackKind === "movement") {
    const events = body.map((event) => semanticEvent(event.at, phaseDuration(event), {
      action: event.action, phase: event.phase, parts: event.parts, target: params.target, operation: "move", mode: "toward-target",
    }));
    tracks.push({kind: "movement", target: params.target, events});
    tracks.push({kind: "transform", target: params.target, events: [
      semanticEvent(0, definition.durationSec, {operation: "move", target: params.target, from: "current", to: params.target, progress: 0}),
      semanticEvent(definition.durationSec, 0, {operation: "arrive", target: params.target, to: params.target, progress: 1}),
    ]});
  } else if (body.length && definition.parts.length) {
    tracks.push({kind: "bone", target: params.target, events: body.map((event) => recipeEvent(event, phaseDuration(event)))});
  }
  if (expression.length) tracks.push({kind: "expression", events: expression.map((event) => recipeEvent(event, definition.durationSec - event.at))});
  if (gaze.length) tracks.push({kind: "gaze", target: gaze[0]?.target, events: gaze.map((event) => recipeEvent(event, definition.durationSec - event.at))});
  if (camera.length) {
    const key = camera[0]!;
    tracks.push({kind: "camera", target: key.target, events: [
      semanticEvent(0, definition.durationSec, {operation: key.operation, target: key.target, x: 0, y: 0, z: 1, key: "start"}),
      semanticEvent(definition.durationSec, 0, {operation: "hold", target: key.target, x: 0, y: 0, z: key.zoom, key: "end"}),
    ]});
  }
  if (vfx.length) tracks.push({kind: "effect", target: vfx[0]?.target, events: vfx.map((event) => semanticEvent(event.at, event.duration, {effect: event.style, style: event.style, target: event.target, intensity: event.intensity, operation: "apply"}))});
  if (audio.length) {
    const kind = audio[0]!.kind === "music" ? "music" : "sound";
    tracks.push({kind, events: audio.map((event) => semanticEvent(event.at, event.duration, {cue: event.cue, kind: event.kind, gain: event.gain, loop: event.loop ?? false, operation: "play"}))});
  }
  if (definition.actorState) tracks.push({kind: "lifecycle", events: [semanticEvent(0, definition.durationSec, {...definition.actorState, subject, operation: "state"})]});
  if (definition.lifecycle) tracks.push(...lifecycleTracks(definition, subject, params));
  return {tracks};
}

function lifecycleTracks(definition: ProcedureDefinition, subject: string, params: Readonly<Record<string, string>>): ProcedureRecipeTrack[] {
  const lifecycle = definition.lifecycle!;
  const object = params[lifecycle.objectParam];
  if (!object) return [];
  const bindAt = lifecycle.bindAt ?? 0.58;
  const releaseAt = lifecycle.releaseAt ?? 0.62;
  const settleAt = lifecycle.settleAt ?? definition.durationSec;
  const short = 0.01;
  const bindingEvents: ProcedureRecipeEvent[] = [];
  const objectEvents: ProcedureRecipeEvent[] = [];
  const lifecycleEvents: ProcedureRecipeEvent[] = [];
  if (lifecycle.receiverParam === undefined && lifecycle.supportParam === undefined) {
    bindingEvents.push(semanticEvent(bindAt, Math.max(short, definition.durationSec - bindAt), {operation: "bind", object, holder: subject, hand: "hand_r"}));
    objectEvents.push(semanticEvent(bindAt, Math.max(short, definition.durationSec - bindAt), {operation: "state", object, status: "held", holder: subject}));
    lifecycleEvents.push(semanticEvent(bindAt, Math.max(short, definition.durationSec - bindAt), {operation: "bind", object, status: "held", holder: subject}));
  } else if (lifecycle.receiverParam !== undefined) {
    const receiver = params[lifecycle.receiverParam];
    bindingEvents.push(
      semanticEvent(releaseAt, short, {operation: "release", object, holder: subject, hand: "hand_r"}),
      semanticEvent(releaseAt + short, Math.max(short, definition.durationSec - releaseAt - short), {operation: "bind", object, holder: receiver, hand: "hand_r"}),
    );
    objectEvents.push(
      semanticEvent(releaseAt, short, {operation: "release", object, status: "loose", holder: subject}),
      semanticEvent(releaseAt + short, Math.max(short, definition.durationSec - releaseAt - short), {operation: "state", object, status: "held", holder: receiver}),
    );
    lifecycleEvents.push(
      semanticEvent(releaseAt, short, {operation: "release", object, status: "loose"}),
      semanticEvent(releaseAt + short, Math.max(short, definition.durationSec - releaseAt - short), {operation: "bind", object, status: "held", holder: receiver}),
    );
  } else if (lifecycle.supportParam !== undefined) {
    const support = params[lifecycle.supportParam];
    bindingEvents.push(semanticEvent(releaseAt, short, {operation: "release", object, holder: subject, hand: "hand_r"}));
    objectEvents.push(semanticEvent(settleAt, Math.max(short, definition.durationSec - settleAt), {operation: "state", object, status: "supported", support}));
    lifecycleEvents.push(
      semanticEvent(releaseAt, short, {operation: "release", object, status: "loose"}),
      semanticEvent(settleAt, Math.max(short, definition.durationSec - settleAt), {operation: "state", object, status: "supported", support}),
    );
  }
  return [
    {kind: "binding", target: object, events: bindingEvents},
    {kind: "object", target: object, events: objectEvents},
    {kind: "lifecycle", target: object, events: lifecycleEvents},
  ];
}

function validateRecipe(id: string, recipe: ProcedureRecipe): void {
  if (!Array.isArray(recipe.tracks) || recipe.tracks.length === 0) throw new Error(`procedure ${id} has an empty generic recipe`);
  for (const track of recipe.tracks) {
    if (!track.kind || !Array.isArray(track.events) || track.events.length === 0) throw new Error(`procedure ${id} has an insufficient ${track.kind ?? "unknown"} recipe track`);
    for (const event of track.events) {
      if (!Number.isFinite(event.at) || !event.value || typeof event.value !== "object") {
        throw new Error(`procedure ${id} has semantically insufficient ${track.kind} recipe data`);
      }
      const value = event.value as Record<string, unknown>;
      const has = (...keys: string[]) => keys.some((key) => value[key] !== undefined || event[key] !== undefined);
      const sufficient = track.kind === "bone" ? has("action", "parts")
        : track.kind === "movement" ? has("operation", "action", "target")
          : track.kind === "transform" ? has("operation", "from", "to", "position", "x", "y")
            : track.kind === "expression" ? has("name", "emotion")
              : track.kind === "gaze" ? has("target", "lead")
                : track.kind === "camera" ? has("operation", "x", "y", "z")
                  : track.kind === "vfx" ? has("effect", "style", "intensity")
                    : track.kind === "sfx" || track.kind === "music" ? has("cue", "kind", "gain")
                      : track.kind === "binding" ? has("operation", "object", "holder")
                        : track.kind === "object" ? has("operation", "object", "status", "support")
                          : has("operation", "present", "pose", "status");
      if (!sufficient) throw new Error(`procedure ${id} has semantically insufficient ${track.kind} recipe data`);
    }
  }
}

function resolveRecipe(recipe: ProcedureRecipe, params: Readonly<Record<string, string>>): ProcedureRecipe {
  const substitute = (value: unknown): unknown => {
    if (typeof value === "string" && value in params) return params[value];
    if (Array.isArray(value)) return value.map(substitute);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, substitute(item)]));
    return value;
  };
  return {
    tracks: recipe.tracks.map((track): ProcedureRecipeTrack => ({
      ...track,
      ...(track.target && params[track.target] ? {target: params[track.target]} : {}),
      events: track.events.map((event) => substitute(event) as ProcedureRecipeEvent),
    })),
  };
}

function makeTracks(performance: ProcedurePerformance): readonly ProcedureTrack[] {
  return performance.recipe.tracks;
}

export class DeterministicProcedureResolver {
  readonly definitions: ProcedureCatalog;
  readonly registry?: ProcedureManifestSource | readonly ProcedureManifest[];
  readonly discovery?: ProcedureDiscovery;

  constructor(options: ProcedureResolverOptions = {}) {
    this.definitions = options.definitions ?? PROCEDURE_DEFINITIONS;
    this.registry = options.registry;
    this.discovery = options.discovery;
    validateCoverage(this.registry, this.definitions);
  }

  resolve(call: ProcedureCall, context: ProcedureResolverContext): ProcedureResolutionWithPerformance {
    const discovered = resolveDiscovered(this.discovery, call, context);
    if (discovered !== undefined) return discovered as ProcedureResolutionWithPerformance;
    const definition = definitionFor(call, this.definitions);
    validateCall(call, context, definition, this.registry);
    const performance = makePerformance(definition, call, context.subject);
    return {
      durationSec: definition.durationSec,
      ...(definition.markers ? {markers: definition.markers} : {}),
      ...(definition.actorState ? {actorState: definition.actorState} : {}),
      performance,
      tracks: makeTracks(performance),
    };
  }

  resolveProcedure(call: ProcedureCall, context: ProcedureResolverContext): ProcedureResolution {
    return this.resolve(call, context);
  }
}

function resolveDiscovered(discovery: ProcedureDiscovery | undefined, call: ProcedureCall, context: ProcedureResolverContext): unknown {
  if (!discovery) return undefined;
  if (typeof discovery === "function") return discovery(call, context);
  const plugins = Array.isArray(discovery) ? discovery : [discovery];
  for (const plugin of plugins) {
    const handler = plugin.resolveProcedure ?? plugin.resolve;
    if (handler) {
      const result = handler(call, context);
      if (result !== undefined) return result;
    }
    const definition = plugin.definitions?.[call.path] ?? plugin.procedures?.[call.path];
    if (definition) return makePerformance(definition, call, context.subject);
  }
  return undefined;
}

export function createProcedureResolver(options: ProcedureResolverOptions = {}): DeterministicProcedureResolver {
  return new DeterministicProcedureResolver(options);
}

export const procedureResolver = createProcedureResolver();
