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

function procedureId(call: ProcedureCall, definitions?: ProcedureCatalog): string {
  const typedId = `${call.namespace}.${call.terminal}`;
  const typed = Object.values(definitions ?? PROCEDURE_DEFINITIONS).find((definition) => definition.id === typedId);
  if (typed) return typed.id;
  if (call.subject === "camera" || call.subject === "vfx" || call.subject === "sfx" || call.subject === "music") {
    return `${call.subject}.${call.terminal}`;
  }
  const terminal = call.terminal;
  const prefix: Record<string, string[]> = {act: ["acting", "gesture", "prop", "interaction"], face: ["face"], look: ["gaze"], move: ["move"], use: ["interaction"], play: ["sfx"], say: ["speech"], state: ["acting"], voice: ["speech"]};
  const candidates = (prefix[call.namespace] ?? []).flatMap((name) => [`${name}.${terminal}`, `${name}.${terminal.replaceAll("_", "")}`]);
  return candidates.find((id) => definitions?.[id]) ?? candidates[0] ?? call.path;
}

export interface ProcedureManifestSource {
  resolveProcedure(id: string): ProcedureManifest;
}

export type ProcedureCatalog = Readonly<Record<string, ProcedureDefinition>>;
export type {ProcedureDefinition, ProcedureParameter};

export interface ProcedureResolverOptions {
  /** The registry is authoritative for which public procedure ids are legal. */
  registry?: ProcedureManifestSource | readonly ProcedureManifest[];
  /** A replacement catalog is useful for tests and future library versions. */
  definitions?: ProcedureCatalog;
}

function sourceIds(source: ProcedureResolverOptions["registry"]): readonly string[] | undefined {
  if (!source) return undefined;
  if (Array.isArray(source)) return source.map((procedure) => procedure.id);
  return undefined;
}

function definitionFor(id: string, definitions: ProcedureCatalog): ProcedureDefinition {
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
  const subjectType = context.subject === "camera" || context.subject === "vfx" || context.subject === "sfx" || context.subject === "music"
    ? context.subject
    : "actor";
  if (!definition.subjects.includes(subjectType)) {
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
    if (context.subject === "camera" || context.subject === "vfx" || context.subject === "sfx" || context.subject === "music") {
      if (!manifest.subjects.includes(context.subject)) throw new Error(`${id} does not allow subject ${context.subject}`);
    } else if (!manifest.subjects.includes("actor")) {
      throw new Error(`${id} does not allow actor subject ${context.subject}`);
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
  if (vfx.length) tracks.push({kind: "vfx", target: vfx[0]?.target, events: vfx.map((event) => semanticEvent(event.at, event.duration, {effect: event.style, style: event.style, target: event.target, intensity: event.intensity, operation: "apply"}))});
  if (audio.length) {
    const kind = audio[0]!.kind === "music" ? "music" : "sfx";
    tracks.push({kind, events: audio.map((event) => semanticEvent(event.at, event.duration, {cue: event.cue, kind: event.kind, gain: event.gain, loop: event.loop ?? false, operation: "play"}))});
  }
  if (definition.actorState) tracks.push({kind: "lifecycle", events: [semanticEvent(0, definition.durationSec, {...definition.actorState, subject, operation: "state"})]});
  if (["act.handover", "act.pickup", "act.putdown"].includes(definition.id)) tracks.push(...propLifecycleTracks(definition, subject, params));
  return {tracks};
}

function propLifecycleTracks(definition: ProcedureDefinition, subject: string, params: Readonly<Record<string, string>>): ProcedureRecipeTrack[] {
  const object = definition.id === "act.pickup" ? params.target : params.object;
  if (!object) return [];
  const bindAt = definition.markers?.bind ?? definition.markers?.handover ?? 0.58;
  const releaseAt = definition.markers?.release ?? definition.markers?.handover ?? 0.62;
  const settleAt = definition.markers?.settle ?? definition.durationSec;
  const short = 0.01;
  const bindingEvents: ProcedureRecipeEvent[] = [];
  const objectEvents: ProcedureRecipeEvent[] = [];
  const lifecycleEvents: ProcedureRecipeEvent[] = [];
  if (definition.id === "act.pickup") {
    bindingEvents.push(semanticEvent(bindAt, Math.max(short, definition.durationSec - bindAt), {operation: "bind", object, holder: subject, hand: "hand_r"}));
    objectEvents.push(semanticEvent(bindAt, Math.max(short, definition.durationSec - bindAt), {operation: "state", object, status: "held", holder: subject}));
    lifecycleEvents.push(semanticEvent(bindAt, Math.max(short, definition.durationSec - bindAt), {operation: "bind", object, status: "held", holder: subject}));
  } else if (definition.id === "act.handover") {
    const receiver = params.target;
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
  } else if (definition.id === "act.putdown") {
    const support = params.target;
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

  constructor(options: ProcedureResolverOptions = {}) {
    this.definitions = options.definitions ?? PROCEDURE_DEFINITIONS;
    this.registry = options.registry;
    validateCoverage(this.registry, this.definitions);
  }

  resolve(call: ProcedureCall, context: ProcedureResolverContext): ProcedureResolutionWithPerformance {
    const definition = definitionFor(procedureId(call, this.definitions), this.definitions);
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

export function createProcedureResolver(options: ProcedureResolverOptions = {}): DeterministicProcedureResolver {
  return new DeterministicProcedureResolver(options);
}

export const procedureResolver = createProcedureResolver();
