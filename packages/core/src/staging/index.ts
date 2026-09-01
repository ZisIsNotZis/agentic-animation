/**
 * Semantic scene staging.
 *
 * This module deliberately accepts relationships, never authored stage
 * coordinates.  The renderer can consume the resulting coordinates, while
 * episode authors remain independent of a particular canvas or asset size.
 */

export type StagePoint = readonly [number, number];
export type FacingTarget = "audience" | "left" | "right" | string;
export type Entrance = "left" | "right" | "center" | "foreground" | "background";

export interface LocationSemanticMetadata {
  id: string;
  /** Semantic density of the location; it affects spacing, not domain behavior. */
  framing?: "wide" | "balanced" | "intimate";
  /** Which side of the frame has the most visual breathing room. */
  subjectBias?: "left" | "center" | "right";
  depth?: "flat" | "layered";
  entrances?: readonly Entrance[];
  affordances?: readonly string[];
}

export interface ActorSetup {
  id: string;
  /** Semantic setup such as standing or seated; unknown values remain neutral. */
  setup?: string;
  facing?: FacingTarget;
  entrance?: Entrance;
  /** An explicit mirror is an art/asset choice, separate from facing direction. */
  flip?: boolean;
  prominence?: "supporting" | "normal" | "primary";
}

export type ObjectRelationKind = "on" | "near" | "between" | "held-by" | "in-front-of" | "behind";

export interface SemanticObjectRelation {
  id: string;
  relation?: ObjectRelationKind;
  target?: string;
  between?: readonly [string, string];
  prominence?: "supporting" | "normal" | "primary";
}

export type StagingFocus =
  | { kind: "actor" | "object"; id: string }
  | { kind: "action"; subject: string; target?: string };

export interface StagingRequest {
  location: LocationSemanticMetadata;
  actors: readonly ActorSetup[] | Readonly<Record<string, Omit<ActorSetup, "id">>>;
  objects?: readonly SemanticObjectRelation[] | Readonly<Record<string, Omit<SemanticObjectRelation, "id">>>;
  speaker?: string;
  focus?: StagingFocus;
}

export interface StagingOptions {
  /** Logical canvas dimensions. Values are normalized to 0..1 in the result. */
  width?: number;
  height?: number;
}

export interface StageRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface StagedActor {
  readonly id: string;
  readonly at: StagePoint;
  readonly scale: number;
  readonly z: number;
  readonly facing: 1 | -1;
  readonly flip: boolean;
  readonly entrance?: Entrance;
}

export interface StagedObject {
  readonly id: string;
  readonly at: StagePoint;
  readonly scale: number;
  readonly z: number;
  readonly relation?: ObjectRelationKind;
  readonly target?: string;
}

export interface StagedCamera {
  readonly center: StagePoint;
  readonly zoom: number;
  readonly framing: "single" | "two-shot" | "group" | "focus";
  /** The part of the frame reserved for visual subjects. */
  readonly safeArea: StageRect;
  /** Subtitle reservation is stable across staging decisions. */
  readonly subtitleSafeArea: StageRect;
}

export interface StagingResult {
  readonly location: string;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly actors: Readonly<Record<string, StagedActor>>;
  readonly objects: Readonly<Record<string, StagedObject>>;
  readonly camera: StagedCamera;
}

// Staging uses logical canvas percentages; renderers perform pixel projection.
const DEFAULT_WIDTH = 1;
const DEFAULT_HEIGHT = 1;
const SUBTITLE_HEIGHT = 160 / 1080;
const SIDE_MARGIN = 80 / 1920;
const ACTOR_HALF_WIDTH = 120 / 1920;
const ACTOR_HALF_HEIGHT = 125 / 1080;
const LANE_TOLERANCE = 36 / 1080;

function fail(message: string): never {
  throw new Error(`staging: ${message}`);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function point(x: number, y: number): StagePoint {
  return [round(x), round(y)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function asActors(value: StagingRequest["actors"]): ActorSetup[] {
  if (Array.isArray(value)) return value.map((actor) => ({...actor}));
  return Object.entries(value).map(([id, actor]) => ({id, ...actor}));
}

function asObjects(value: NonNullable<StagingRequest["objects"]>): SemanticObjectRelation[] {
  if (Array.isArray(value)) return value.map((object) => ({...object}));
  return Object.entries(value).map(([id, object]) => ({id, ...object}));
}

function validateUnique(ids: readonly string[], kind: string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id.trim()) fail(`${kind} id must not be empty`);
    if (seen.has(id)) fail(`duplicate ${kind} id: ${id}`);
    seen.add(id);
  }
}

function actorScale(count: number, framing: LocationSemanticMetadata["framing"]): number {
  // Keep the two-shot readable at the native 16:9 stage size.  The subtitle
  // rail is outside the subject safe area, so this does not compete with text.
  const base = count === 1 ? 0.92 : count === 2 ? 0.88 : count === 3 ? 0.7 : 0.58;
  return round(base * (framing === "wide" ? 0.94 : framing === "intimate" ? 1.04 : 1));
}

function baseX(index: number, count: number): number {
  if (count === 1) return 0.5;
  if (count === 2) return index === 0 ? 0.35 : 0.65;
  const margin = 0.18;
  return margin + (0.64 * index) / (count - 1);
}

function entranceX(entrance: Entrance | undefined, fallback: number): number {
  switch (entrance) {
    case "left": return 0.14;
    case "right": return 0.86;
    case "center": return 0.5;
    default: return fallback;
  }
}

function entranceY(entrance: Entrance | undefined, fallback: number): number {
  if (entrance === "foreground") return 0.7;
  if (entrance === "background") return 0.57;
  return fallback;
}

function setupY(setup: string | undefined): number {
  const normalized = setup?.toLowerCase();
  if (normalized === "background" || normalized === "receding") return 0.57;
  if (normalized === "seated" || normalized === "low") return 0.68;
  return 0.64;
}

function actorFootprintScale(actor: ActorSetup, scale: number): number {
  const setup = actor.setup?.toLowerCase();
  const setupScale = setup === "background" || setup === "receding" ? 0.82 : setup === "foreground" ? 1.05 : 1;
  return scale * setupScale * (actor.prominence === "primary" ? 1.05 : actor.prominence === "supporting" ? 0.94 : 1);
}

function targetNames(focus: StagingFocus | undefined): string[] {
  if (!focus) return [];
  return focus.kind === "action" ? [focus.subject, ...(focus.target ? [focus.target] : [])] : [focus.id];
}

function facingFor(
  actor: ActorSetup,
  actorPoints: Readonly<Record<string, StagePoint>>,
  objectPoints: Readonly<Record<string, StagePoint>>,
  fallback: 1 | -1,
): 1 | -1 {
  const target = actor.facing;
  if (!target || target === "audience") return target === "audience" ? 1 : fallback;
  if (target === "left") return -1;
  if (target === "right") return 1;
  const targetPoint = actorPoints[target] ?? objectPoints[target];
  const own = actorPoints[actor.id];
  if (!targetPoint || !own || targetPoint[0] === own[0]) return fallback;
  return targetPoint[0] > own[0] ? 1 : -1;
}

function objectPoint(
  relation: SemanticObjectRelation,
  actors: Readonly<Record<string, StagedActor>>,
  objects: Readonly<Record<string, StagedObject>>,
  index: number,
  width: number,
  height: number,
): { at: StagePoint; z: number } {
  const targetId = relation.target;
  const target = targetId ? actors[targetId] ?? objects[targetId] : undefined;
  const targetAt = target?.at;
  const targetFacing = targetId ? actors[targetId]?.facing ?? 1 : 1;
  const fallback = point(0.5 * width + index * 72 / 1920, 0.64 * height);

  switch (relation.relation) {
    case "held-by":
      if (targetAt) return {at: point(targetAt[0] + targetFacing * 78 / 1920, targetAt[1] - 125 / 1080), z: (target.z ?? 40) + 2};
      break;
    case "near":
      if (targetAt) return {at: point(targetAt[0] + targetFacing * 115 / 1920, targetAt[1] - 12 / 1080), z: (target.z ?? 40) + 4};
      break;
    case "on":
      if (targetAt) return {at: point(targetAt[0], targetAt[1] - 58 / 1080), z: (target.z ?? 40) + 1};
      break;
    case "in-front-of":
      if (targetAt) return {at: point(targetAt[0], targetAt[1] + 18 / 1080), z: (target.z ?? 40) + 10};
      break;
    case "behind":
      if (targetAt) return {at: point(targetAt[0], targetAt[1]), z: (target.z ?? 40) - 10};
      break;
    case "between": {
      const a = relation.between?.[0];
      const b = relation.between?.[1];
      if (a && b) {
        const first = actors[a] ?? objects[a];
        const second = actors[b] ?? objects[b];
        if (first && second) return {at: point((first.at[0] + second.at[0]) / 2, Math.max(first.at[1], second.at[1]) - 20 / 1080), z: 35};
      }
      break;
    }
  }
  return {at: fallback, z: 35};
}

function subjectSafeArea(width: number, height: number): StageRect {
  return {x: SIDE_MARGIN, y: round(height * 0.09), width: width - SIDE_MARGIN * 2, height: round(height * 0.67)};
}

function avoidActorCollisions(
  actors: readonly ActorSetup[],
  points: Readonly<Record<string, StagePoint>>,
  scale: number,
  safeArea: StageRect,
): Record<string, StagePoint> {
  const footprints = new Map(actors.map((actor) => [actor.id, actorFootprintScale(actor, scale)]));
  for (const footprint of footprints.values()) {
    if (safeArea.x + ACTOR_HALF_WIDTH * footprint > safeArea.x + safeArea.width - ACTOR_HALF_WIDTH * footprint ||
        safeArea.y + ACTOR_HALF_HEIGHT * footprint > safeArea.y + safeArea.height - ACTOR_HALF_HEIGHT * footprint) {
      fail("impossible composition: actor footprint does not fit in the subject safe area");
    }
  }

  const result: Record<string, StagePoint> = {};
  let previous: {id: string; at: StagePoint} | undefined;
  const candidates = actors.map((actor) => ({actor, at: points[actor.id]!})).sort((a, b) =>
    a.at[0] - b.at[0] || a.at[1] - b.at[1] || a.actor.id.localeCompare(b.actor.id));
  for (const candidate of candidates) {
    const halfWidth = ACTOR_HALF_WIDTH * footprints.get(candidate.actor.id)!;
    const halfHeight = ACTOR_HALF_HEIGHT * footprints.get(candidate.actor.id)!;
    const minX = safeArea.x + halfWidth;
    const maxX = safeArea.x + safeArea.width - halfWidth;
    const minY = safeArea.y + halfHeight;
    const maxY = safeArea.y + safeArea.height - halfHeight;
    const y = clamp(candidate.at[1], minY, maxY);
    let x = clamp(candidate.at[0], minX, maxX);
    if (previous && Math.abs(previous.at[1] - y) <= LANE_TOLERANCE) {
      x = Math.max(x, previous.at[0] + ACTOR_HALF_WIDTH * (footprints.get(previous.id)! + footprints.get(candidate.actor.id)!));
    }
    if (x > maxX) fail("impossible composition: same-lane actors require more horizontal safe area");
    result[candidate.actor.id] = point(x, y);
    previous = {id: candidate.actor.id, at: result[candidate.actor.id]!};
  }
  return result;
}

/** Resolve semantic scene intent into deterministic renderer coordinates. */
export function stageScene(request: StagingRequest, options: StagingOptions = {}): StagingResult {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
    fail("viewport dimensions must be positive finite numbers");
  }
  if (!request.location.id.trim()) fail("location id must not be empty");

  const actors = asActors(request.actors);
  const objects = asObjects(request.objects ?? []);
  validateUnique(actors.map((actor) => actor.id), "actor");
  validateUnique(objects.map((object) => object.id), "object");
  if (!actors.length) fail("at least one participating actor is required");
  const actorIds = new Set(actors.map((actor) => actor.id));
  const objectIds = new Set(objects.map((object) => object.id));
  const allIds = new Set([...actorIds, ...objectIds]);
  if (request.speaker && !actorIds.has(request.speaker)) fail(`unknown speaker: ${request.speaker}`);
  for (const focusId of targetNames(request.focus)) if (!allIds.has(focusId)) fail(`unknown focus target: ${focusId}`);
  for (const actor of actors) {
    if (actor.facing && !["audience", "left", "right"].includes(actor.facing) && !allIds.has(actor.facing)) {
      fail(`unknown facing target for ${actor.id}: ${actor.facing}`);
    }
  }
  for (const object of objects) {
    if (object.target && !allIds.has(object.target)) fail(`unknown relation target for ${object.id}: ${object.target}`);
    if (object.relation === "between" && (!object.between || object.between.some((id) => !allIds.has(id)))) {
      fail(`between relation for ${object.id} needs two known targets`);
    }
  }

  const orderedActors = [...actors].sort((a, b) => a.id.localeCompare(b.id));
  const actorPoints: Record<string, StagePoint> = {};
  const stagedActors: Record<string, StagedActor> = {};
  const yDefault = height * 0.64;
  const scale = actorScale(orderedActors.length, request.location.framing);
  const bias = request.location.subjectBias === "left" ? -0.05 : request.location.subjectBias === "right" ? 0.05 : 0;
  for (const [index, actor] of orderedActors.entries()) {
    const x = clamp((baseX(index, orderedActors.length) + bias) * width, width * 0.1, width * 0.9);
    const y = clamp(entranceY(actor.entrance, setupY(actor.setup)) * height, height * 0.45, height * 0.76);
    actorPoints[actor.id] = point(entranceX(actor.entrance, x / width) * width, y);
  }
  const safeArea = subjectSafeArea(width, height);
  Object.assign(actorPoints, avoidActorCollisions(orderedActors, actorPoints, scale, safeArea));
  const emptyObjects: Record<string, StagedObject> = {};
  for (const actor of orderedActors) {
    const fallbackFacing: 1 | -1 = orderedActors.length === 2
      ? (actorPoints[orderedActors[1 - orderedActors.indexOf(actor)]!.id]![0] > actorPoints[actor.id]![0] ? 1 : -1)
      : actor.entrance === "left" ? 1 : actor.entrance === "right" ? -1 : 1;
    const facing = facingFor(actor, actorPoints, {}, fallbackFacing);
    const setup = actor.setup?.toLowerCase();
    const setupScale = setup === "background" || setup === "receding" ? 0.82 : setup === "foreground" ? 1.05 : 1;
    stagedActors[actor.id] = {
      id: actor.id,
      at: actorPoints[actor.id]!,
      scale: round(scale * setupScale * (actor.prominence === "primary" ? 1.05 : actor.prominence === "supporting" ? 0.94 : 1)),
      z: 40 + orderedActors.indexOf(actor) * 10,
      facing,
      flip: actor.flip ?? false,
      ...(actor.entrance ? {entrance: actor.entrance} : {}),
    };
  }
  const stagedObjects: Record<string, StagedObject> = {...emptyObjects};
  const objectOrder = [...objects].sort((a, b) => {
    const aDependsOnB = a.target === b.id || a.between?.includes(b.id) === true;
    const bDependsOnA = b.target === a.id || b.between?.includes(a.id) === true;
    return aDependsOnB === bDependsOnA ? a.id.localeCompare(b.id) : aDependsOnB ? 1 : -1;
  });
  for (const [index, relation] of objectOrder.entries()) {
    const placement = objectPoint(relation, stagedActors, stagedObjects, index, width, height);
    stagedObjects[relation.id] = {
      id: relation.id,
      at: placement.at,
      scale: relation.prominence === "primary" ? 0.22 : relation.prominence === "supporting" ? 0.14 : 0.18,
      z: placement.z,
      ...(relation.relation ? {relation: relation.relation} : {}),
      ...(relation.target ? {target: relation.target} : {}),
    };
  }

  const subtitleSafeArea: StageRect = {x: SIDE_MARGIN, y: 1 - SUBTITLE_HEIGHT - 60 / 1080, width: 1 - SIDE_MARGIN * 2, height: SUBTITLE_HEIGHT};
  const focusTargets = targetNames(request.focus);
  const compositionTargets = focusTargets;
  const focusPoints = compositionTargets.map((id) => stagedActors[id]?.at ?? stagedObjects[id]?.at).filter((value): value is StagePoint => Boolean(value));
  const centerX = focusPoints.length ? focusPoints.reduce((sum, value) => sum + value[0], 0) / focusPoints.length : width * (0.5 + bias);
  const framing = request.focus ? "focus" : orderedActors.length === 1 ? "single" : orderedActors.length === 2 ? "two-shot" : "group";
  const camera: StagedCamera = {
    center: point(clamp(centerX, safeArea.x + safeArea.width * 0.25, safeArea.x + safeArea.width * 0.75), 0.43),
    zoom: request.focus ? 1.04 : 1,
    framing,
    safeArea,
    subtitleSafeArea,
  };
  return {
    location: request.location.id,
    viewport: {width, height},
    actors: stagedActors,
    objects: stagedObjects,
    camera,
  };
}

/** Descriptive alias for callers that name the operation by its responsibility. */
export const resolveStaging = stageScene;
