import { ease } from "../lib/interpolate";
import {actorTurn, rotateAboutPivot} from "./actorTurn";
import { circleOverlapsBox, solveSkeleton } from "@anim/core/skeleton";
import type {FigureArtwork, Skeleton} from "@anim/core";
import {figureViewForOrientation, figureHandAnchor} from "@anim/core/figure-artwork";
import {drawnArmPoint, isFlipped} from "@anim/core/reach";
import type {
  EvaluatedActor,
  EvaluatedCamera,
  EvaluatedExpression,
  EvaluatedGesture,
  EvaluatedProp,
  EvaluatedVfx,
  PerformanceActor,
  PerformanceCameraKey,
  PerformanceCameraTrack,
  PerformanceConstraint,
  PerformanceExpression,
  PerformanceExpressionKey,
  PerformanceFrameState,
  PerformanceGesture,
  PerformanceGestureKey,
  EvaluatedTrack,
  PerformanceGenericTrack,
  PerformanceTrackEvent,
  PerformanceManifest,
  PerformancePlacement,
  PerformancePlacementKey,
  PerformancePlacementValue,
  PerformancePresenceKey,
  PerformancePositionKey,
  PerformanceProp,
  PerformanceSubtitle,
  PerformanceStateKey,
  PerformanceVisual,
  PerformanceVfx,
  SemanticPlacement,
} from "./types";

const DEFAULT_EXPRESSION: EvaluatedExpression = {
  name: "neutral",
  smile: 0,
  brow: 0,
  eyeOpen: 1,
  lipsPart: 0,
  gaze: [0, 0],
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function numberOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function vecOr(value: [number, number] | undefined, fallback: [number, number]): [number, number] {
  return value ? [value[0], value[1]] : [fallback[0], fallback[1]];
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === "object" ? value as UnknownRecord : undefined;
}

function pointOf(value: unknown): [number, number] | undefined {
  return Array.isArray(value) && typeof value[0] === "number" && typeof value[1] === "number"
    ? [value[0], value[1]]
    : undefined;
}

const CANVAS = {width: 1920, height: 1080} as const;

function stagePoint(point: [number, number], staging: {viewport?: {width?: number; height?: number}}, video: {width: number; height: number}): [number, number] {
  const viewport = staging.viewport;
  return viewport && viewport.width !== undefined && viewport.width <= 1
    ? [point[0] * CANVAS.width, point[1] * CANVAS.height]
    : point;
}

function stageScale(scale: number, _staging: {viewport?: {width?: number}}, _video: {width: number}): number {
  // Actor scales are relative to the renderer's canonical 1920-wide artwork,
  // not the logical canvas; only positions/camera offsets need projection.
  return scale;
}

function frameOf(key: { frame?: number; t?: number; at?: number | [number, number]; startFrame?: number }): number {
  return key.frame ?? key.startFrame ?? key.t ?? (typeof key.at === "number" ? key.at : 0);
}

function trackEventStart(event: PerformanceTrackEvent): number {
  if (typeof event.frame === "number") return event.frame;
  if (typeof event.startFrame === "number") return event.startFrame;
  if (typeof event.t === "number") return event.t;
  return typeof event.at === "number" ? event.at : 0;
}

function trackEventEnd(event: PerformanceTrackEvent, start: number): number {
  return event.endFrame ?? event.end ?? (event.durationFrames ? start + event.durationFrames : event.duration ? start + event.duration : start + 1);
}

function evaluateTracks(tracks: readonly PerformanceGenericTrack[] | undefined, frame: number): EvaluatedTrack[] {
  return (tracks ?? []).map((track) => ({
    ...track,
    events: track.events.map((event) => {
      const start = trackEventStart(event);
      const end = trackEventEnd(event, start);
      return {...event, frame: start, progress: end <= start ? 1 : clamp01((frame - start) / (end - start)), active: frame >= start && frame < end};
    }),
  }));
}

function eventValue(event: PerformanceTrackEvent): UnknownRecord {
  return asRecord(event.value) ?? event as UnknownRecord;
}

function cameraKeyValue(event: PerformanceTrackEvent): UnknownRecord {
  const value = eventValue(event);
  return asRecord(value.value) ?? value;
}

/** Design-space figure height used when an actor exposes no skeleton. */
const FIGURE_DESIGN_HEIGHT = 720;
/** Air a following shot keeps around its target's own band (px, matches
 *  containCamera's margin so a follow and the containment pass agree). */
const FOLLOW_MARGIN = 24;
/** Head-to-waist share of the figure (lin_b_draft's waist joint is 408/720),
 *  used only when the actor exposes no declared skeleton. */
const FIGURE_WAIST_SHARE = 408.24 / 720;
/** Height of the drawn head's lower edge above the feet (lin_b_draft's head box
 *  ends at 265.44/720 from the top), used only without a declared skeleton. */
const FIGURE_HEAD_SHARE = 1 - 265.44 / 720;

/**
 * What a push frames: a person's head-and-torso band, or an object's whole
 * silhouette. Framing the arithmetic centre instead puts the bottom edge of a
 * z 1.35 shot above the ground line, so a standing figure is cut at the shins
 * and the move reads as accidental scaling rather than camerawork.
 */
interface PushSubject {
  /** Vertical centre of the framed band, and the band itself (world y). */
  centre: [number, number];
  band: [number, number];
  /** A person is framed with the staged pair (their room is the shot); an
   *  object is framed on its own silhouette. */
  horizontal: "pair" | "self";
  /** A TRACKING subject: the frame follows it because it is moving, so its band
   *  owns the placement outright. The head rule is not applied — a follow cannot
   *  both keep a flying subject in frame and step aside for every drawn head,
   *  and losing the subject is the failure that reads as a broken shot. */
  follow?: boolean;
}

/** World y band of the named drawn skeleton parts, or undefined when the actor
 *  exposes no such part box. */
function actorPartBand(actor: EvaluatedActor, names: readonly string[]): [number, number] | undefined {
  const skeleton = actor.skeleton;
  if (!skeleton) return undefined;
  const space = skeleton.space ?? {width: 400, height: FIGURE_DESIGN_HEIGHT};
  const solved = solveSkeleton(skeleton, actor.skeletonPose ?? {});
  const toWorld = (designY: number) => actor.y + (designY - space.height) * actor.scale;
  let top = Number.POSITIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const name of names) {
    const box = solved.parts[name]?.world;
    if (box?.kind !== "box") continue;
    top = Math.min(top, box.a[1], box.b[1]);
    bottom = Math.max(bottom, box.a[1], box.b[1]);
  }
  return Number.isFinite(top) && Number.isFinite(bottom) ? [toWorld(top), toWorld(bottom)] : undefined;
}

/** The band the pose actually draws for the named parts; a figure with no
 *  skeleton is measured on its standing band, whose lower edge sits
 *  `bottomShare` of its height above the feet. */
function actorBand(actor: EvaluatedActor, names: readonly string[], bottomShare: number): [number, number] {
  // The band follows the pose the renderer draws: a folded figure's head and
  // torso are nowhere near the standing band, and framing the standing band is
  // what pushed a crouched subject out of her own shot.
  const drawn = actorPartBand(actor, names);
  const height = (actor.skeleton?.space?.height ?? FIGURE_DESIGN_HEIGHT) * actor.scale;
  const band: [number, number] = drawn ?? [actor.y - height, actor.y - height * bottomShare];
  if (!actor.rotation) return band;
  // A turning body's parts are not where the upright band says: a hanging
  // figure's head is under the bar at half a turn and beside it at a quarter,
  // so the band is measured on the drawn (rotated) body.
  const turn = actorTurn(actor);
  const top = rotateAboutPivot(turn, [actor.x, band[0]], turn.rotation);
  const bottom = rotateAboutPivot(turn, [actor.x, band[1]], turn.rotation);
  return [Math.min(top[1], bottom[1]), Math.max(top[1], bottom[1])];
}

/** World extents of the drawn body box, after its rotation about the pivot.
 *  Standing, this is the upright box every fit measured before; turning, it is
 *  the axis-aligned bounds of the rotated box, which is what a full circle of
 *  a hanging body actually needs in frame. */
function actorExtent(actor: EvaluatedActor): {left: number; right: number; top: number; bottom: number; centreX: number} {
  const scale = actor.scale;
  const left = actor.x - 200 * scale;
  const right = actor.x + 200 * scale;
  const top = actor.y - FIGURE_DESIGN_HEIGHT * scale;
  const bottom = actor.y;
  if (!actor.rotation) return {left, right, top, bottom, centreX: actor.x};
  const turn = actorTurn(actor);
  const corners = [[left, top], [right, top], [right, bottom], [left, bottom]]
    .map((point) => rotateAboutPivot(turn, point as [number, number], actor.rotation));
  return {
    left: Math.min(...corners.map((point) => point[0])),
    right: Math.max(...corners.map((point) => point[0])),
    top: Math.min(...corners.map((point) => point[1])),
    bottom: Math.max(...corners.map((point) => point[1])),
    centreX: actor.x,
  };
}

function actorFrameBand(actor: EvaluatedActor): [number, number] {
  return actorBand(actor, ["head", "torso"], FIGURE_WAIST_SHARE);
}

/** The drawn head alone: the band that must never straddle a frame edge. */
function actorHeadBand(actor: EvaluatedActor): [number, number] {
  return actorBand(actor, ["head"], FIGURE_HEAD_SHARE);
}

function propFrameBand(prop: EvaluatedProp): [number, number] {
  // `prop.y` is the art's BASE anchor, not its top: the renderer places the
  // element at `y - height * base/height` and stretches the 200x160 art to the
  // element size, so art unit u sits `(u - base) * size[1]/160 * scale` from y.
  // The declared drawn-body box measures the silhouette in those art units.
  const body = prop.body;
  const unit = (prop.size[1] / 160) * (prop.scale || 1);
  const base = prop.base ?? 160;
  const top = body ? body[1] : 0;
  const bottom = body ? body[3] : 160;
  return [prop.y + (top - base) * unit, prop.y + (bottom - base) * unit];
}

function pushSubject(
  target: unknown,
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
): PushSubject | undefined {
  if (typeof target !== "string") return undefined;
  const actor = actors.find((candidate) => candidate.id === target && candidate.present);
  if (actor) {
    const band = actorFrameBand(actor);
    return {centre: [actor.x, (band[0] + band[1]) / 2], band, horizontal: "pair"};
  }
  const prop = props.find((candidate) => candidate.id === target);
  if (!prop) return undefined;
  const band = propFrameBand(prop);
  return {centre: [prop.x, (band[0] + band[1]) / 2], band, horizontal: "self"};
}

function cameraTargetPoint(subject: PushSubject | undefined, fallback: [number, number]): [number, number] {
  return subject ? subject.centre : fallback;
}

/** Where a followed target IS on a frame the evaluator is not drawing.
 *  A `follow` event writes keys across its whole window, so its target has to be
 *  resolved at each of those frames — by the caller that owns prop and actor
 *  evaluation, because the placement of a struck prop lives there (motor bake,
 *  transform tracks, bindings). */
type FollowProbe = (target: string, frame: number) => PushSubject | undefined;

function repelActors(actors: readonly EvaluatedActor[]): EvaluatedActor[] {
  const result = actors.map((actor) => ({...actor}));
  const ordered = [...result].sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  for (let i = 1; i < ordered.length; i += 1) {
    const left = ordered[i - 1]!;
    const right = ordered[i]!;
    if (Math.abs(left.y - right.y) > 80) continue;
    const required = 200 * left.scale + 200 * right.scale;
    if (left.id === right.id) continue;
    // Motor-driven positions are physical (docs/8_MOTOR.md):
    // the solver already enforces separation, so never nudge them.
    if ((left as {motor?: unknown}).motor || (right as {motor?: unknown}).motor) continue;
    // Separate the DRAWN bodies: a turned body's horizontal centre is not its
    // ground point (a hanging figure's mass sits beside the bar).
    const leftX = actorExtent(left).centreX;
    const rightX = actorExtent(right).centreX;
    if (rightX - leftX >= required || (leftX === rightX && left.id !== right.id)) {
      if (leftX === rightX && left.id !== right.id) {
        left.x -= required / 2;
        right.x += required / 2;
      }
      continue;
    }
    const center = (leftX + rightX) / 2;
    left.x = center - required / 2;
    right.x = center + required / 2;
  }
  return result;
}

function fitCameraToActors(
  target: [number, number],
  actors: readonly EvaluatedActor[],
  requestedZoom: number,
  video: {width: number; height: number},
): {center: [number, number]; zoom: number} {
  const visible = actors.filter((actor) => actor.present);
  if (!visible.length) return {center: target, zoom: requestedZoom};
  const margin = 36;
  const boxes = visible.map(actorExtent);
  const left = Math.min(...boxes.map((box) => box.left)) - margin;
  const right = Math.max(...boxes.map((box) => box.right)) + margin;
  const top = Math.min(...boxes.map((box) => box.top)) - margin;
  const bottom = Math.max(...boxes.map((box) => box.bottom)) + margin;
  const zoom = Math.min(requestedZoom, video.width / (right - left), video.height / (bottom - top));
  const desiredX = video.width * 0.62 / zoom;
  const desiredY = video.height * 0.42 / zoom;
  const viewportWidth = video.width / zoom;
  const viewportHeight = video.height / zoom;
  const x = Math.max(right - viewportWidth, Math.min(left, target[0] - desiredX));
  const y = Math.max(bottom - viewportHeight, Math.min(top, target[1] - desiredY));
  return {center: [x + viewportWidth / 2, y + viewportHeight / 2], zoom};
}

/**
 * Vertical centre for a framed shot. A framed shot must never slice a drawn
 * head (evidence/art/ART_FILM_LANGUAGE_M6.md): a head straddling a frame edge reads as
 * a mistake, while an insert that leaves the heads out of frame reads as a
 * choice, so the placement moves to the nearer side of every head that would be
 * cut. The unchanged placement is kept when no shift the painted stage allows
 * clears them all.
 */
function framedCentreY(
  centreY: number,
  zoom: number,
  actors: readonly EvaluatedActor[],
  subject: PushSubject | undefined,
  video: {width: number; height: number},
): number {
  if (!subject?.band) return centreY;
  // An ACTOR is the subject of a person shot, so its own head belongs in frame
  // and the pair keeps its room: the head rule is for object inserts, where a
  // partly visible head reads as a mistake. Applying it to a person shot pushed
  // the frame down past the collar and produced headless dialogue shots.
  if (subject.horizontal === "pair") return centreY;
  const viewportHeight = video.height / zoom;
  return clearOfHeads(centreY - viewportHeight / 2, actors.map(actorHeadBand), viewportHeight, 24) + viewportHeight / 2;
}

function fitPushCamera(
  target: [number, number],
  subject: PushSubject | undefined,
  actors: readonly EvaluatedActor[],
  requestedZoom: number,
  video: {width: number; height: number},
): {center: [number, number]; zoom: number} {
  const relevant = actors.filter((actor) => actor.present);
  // The subject's own band decides the vertical centre; the staged pair only
  // bounds the horizontal when the subject is a person.
  if (subject?.horizontal === "self" || relevant.length < 2) {
    return {center: [target[0], framedCentreY(target[1], requestedZoom, relevant, subject, video)], zoom: requestedZoom};
  }
  const left = Math.min(...relevant.map((actor) => actor.x - 200 * actor.scale)) - 36;
  const right = Math.max(...relevant.map((actor) => actor.x + 200 * actor.scale)) + 36;
  const zoom = Math.min(requestedZoom, video.width / (right - left));
  return {center: [(left + right) / 2, framedCentreY(target[1], zoom, relevant, subject, video)], zoom};
}

/**
 * A framed shot never slices a drawn head (evidence/art/ART_FILM_LANGUAGE_M6.md). A
 * head straddling the top or bottom frame edge reads as a mistake, while an
 * insert that leaves the heads out of frame reads as a choice, so the vertical
 * placement moves to the nearer side of every drawn head instead of leaving the
 * intersection. The original placement is kept when no shift inside the painted
 * stage clears every head, because leaving the painted stage is not a fix.
 */
function clearOfHeads(
  y: number,
  heads: readonly (readonly [number, number])[],
  viewportHeight: number,
  margin: number,
): number {
  // A head is framed honestly when it is wholly inside the frame or wholly
  // outside it; only the part-in part-out case is a slice.
  const slices = (candidate: number) => heads.some(([top, bottom]) => {
    const inside = top >= candidate && bottom <= candidate + viewportHeight;
    const touches = top < candidate + viewportHeight && bottom > candidate;
    return touches && !inside;
  });
  if (!slices(y)) return y;
  const highest = Math.max(0, CANVAS.height - viewportHeight);
  let best: number | undefined;
  for (const [top, bottom] of heads) {
    // Below the head, or above it: the two placements that leave it whole.
    for (const candidate of [bottom + margin, top - margin - viewportHeight]) {
      if (candidate < 0 || candidate > highest || slices(candidate)) continue;
      if (best === undefined || Math.abs(candidate - y) < Math.abs(best - y)) best = candidate;
    }
  }
  return best ?? y;
}

/** The camera viewport must stay inside the painted 1920x1080 stage. */
function clampCameraToStage(
  camera: EvaluatedCamera,
  video: {width: number; height: number},
): EvaluatedCamera {
  const fit = Math.min(video.width / CANVAS.width, video.height / CANVAS.height);
  const z = Math.max(fit, camera.z);
  const viewportWidth = video.width / z;
  const viewportHeight = video.height / z;
  return {
    x: Math.min(Math.max(camera.x, 0), Math.max(0, CANVAS.width - viewportWidth)),
    y: Math.min(Math.max(camera.y, 0), Math.max(0, CANVAS.height - viewportHeight)),
    z,
    rotation: camera.rotation,
  };
}

/** Keep the evaluated camera from defeating staging during a focused shot. */
function containCamera(
  camera: EvaluatedCamera,
  actors: readonly EvaluatedActor[],
  video: {width: number; height: number},
  subject?: PushSubject,
): EvaluatedCamera {
  const visible = actors.filter((actor) => actor.present);
  if (!visible.length) return camera;
  const margin = 24;
  const boxes = visible.map(actorExtent);
  const left = Math.min(...boxes.map((box) => box.left)) - margin;
  const right = Math.max(...boxes.map((box) => box.right)) + margin;
  const top = Math.min(...boxes.map((box) => box.top)) - margin;
  const bottom = Math.max(...boxes.map((box) => box.bottom)) + margin;
  // Never zoom out past the painted stage: below the stage-fit zoom the
  // 1920x1080 canvas shrinks inside the video frame and the episode
  // background leaks in as black bands.
  const fit = Math.min(video.width / CANVAS.width, video.height / CANVAS.height);
  const band = subject?.band;
  // A framed subject owns the shot's zoom and its vertical placement: capping
  // the push at the staged pair's own height keeps the whole room in frame and
  // a push that cannot get closer than the wide is not a push. The subject's
  // band is what must fit, and the rest of the room may fall outside it.
  const zoom = band
    ? Math.max(fit, Math.min(
      camera.z,
      video.height / Math.max(1, band[1] - band[0] + 2 * margin),
      subject!.horizontal === "pair" ? video.width / Math.max(1, right - left) : Number.POSITIVE_INFINITY,
    ))
    : Math.max(fit, Math.min(camera.z, video.width / Math.max(1, right - left), video.height / Math.max(1, bottom - top)));
  const viewportWidth = video.width / zoom;
  const viewportHeight = video.height / zoom;
  const x = subject?.horizontal === "self"
    ? camera.x
    : right - left <= viewportWidth
      ? Math.max(left, Math.min(camera.x, right - viewportWidth))
      : left;
  // A focused shot keeps its subject's band inside the viewport, with headroom
  // above the head and the bottom edge past the subject's own lower bound; it
  // never pins the frame to the staging's top edge, which is what cut a
  // standing figure at the shins and read as accidental scaling.
  const y = band
    ? band[1] - band[0] + 2 * margin > viewportHeight
      ? band[0] - margin
      : Math.max(band[1] + margin - viewportHeight, Math.min(camera.y, band[0] - margin))
    : bottom - top <= viewportHeight
      ? Math.max(top, Math.min(camera.y, bottom - viewportHeight))
      : top;
  // A framed subject band owns the vertical placement, but no framed shot may
  // slice a drawn head: the placement moves to the nearer side that clears every
  // head, chosen from the placements the painted stage allows.
  const stagedY = Math.min(Math.max(y, 0), Math.max(0, CANVAS.height - viewportHeight));
  const framedY = band && !subject?.follow ? clearOfHeads(stagedY, visible.map(actorHeadBand), viewportHeight, margin) : y;
  // The viewport must stay inside the painted stage: with zoom at the stage
  // fit the whole canvas fills the frame, so any stage-boundary-crossing
  // offset would expose the episode background as black bands.
  return {
    x: Math.min(Math.max(x, 0), Math.max(0, CANVAS.width - viewportWidth)),
    y: Math.min(Math.max(framedY, 0), Math.max(0, CANVAS.height - viewportHeight)),
    z: zoom,
    rotation: camera.rotation,
  };
}

/**
 * One frame of a following shot. The target's centre is what the frame pans
 * with; the target's own band caps how close the shot may get, and the stage
 * fit is the floor, because below it the painted 1920x1080 stage shrinks inside
 * the video frame and the episode background leaks in as black bands. The pan
 * is clamped inside the stage here rather than only at the end of the frame, so
 * consecutive keys stay in one convex legal region and the camera glides along
 * the stage edge instead of jumping back onto the subject.
 */
function followCameraKey(
  centre: [number, number],
  band: [number, number],
  requestedZoom: number,
  video: {width: number; height: number},
): {x: number; y: number; z: number} {
  const fit = Math.min(video.width / CANVAS.width, video.height / CANVAS.height);
  const zoom = Math.max(fit, Math.min(requestedZoom, video.height / Math.max(1, band[1] - band[0] + 2 * FOLLOW_MARGIN)));
  const viewportWidth = video.width / zoom;
  const viewportHeight = video.height / zoom;
  return {
    x: Math.min(Math.max(centre[0] - viewportWidth / 2, 0), Math.max(0, CANVAS.width - viewportWidth)),
    y: Math.min(Math.max(centre[1] - viewportHeight / 2, 0), Math.max(0, CANVAS.height - viewportHeight)),
    z: zoom,
  };
}

/** A following window resolved to one key per frame: the only way a live target
 *  can stay in frame without the recipe knowing frames it cannot see. A frame
 *  whose target cannot be resolved keeps the previous key, so a target that
 *  leaves and returns holds the shot instead of flying to the stage origin. */
function followWindowKeys(
  event: PerformanceTrackEvent,
  follow: FollowProbe | undefined,
  video: {width: number; height: number},
): PerformanceCameraKey[] {
  const value = cameraKeyValue(event);
  const target = typeof value.target === "string" ? value.target : undefined;
  if (!target || !follow) return [];
  const zoom = typeof value.zoom === "number" ? value.zoom : typeof value.z === "number" ? value.z : 1;
  const start = trackEventStart(event);
  const end = trackEventEnd(event, start);
  const keys: PerformanceCameraKey[] = [];
  for (let frame = start; frame <= end; frame += 1) {
    const subject = follow(target, frame);
    if (!subject) continue;
    keys.push({frame, ...followCameraKey(subject.centre, subject.band, zoom, video), rotation: 0, ease: "linear"});
  }
  return keys;
}

function cameraKeyFromEvent(
  event: PerformanceTrackEvent,
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
  previous: EvaluatedCamera,
  composition: EvaluatedCamera,
  viewport: {width: number; height: number},
): PerformanceCameraKey {
  const value = cameraKeyValue(event);
  const operation = value.operation;
  const zoom = typeof value.zoom === "number" ? value.zoom : typeof value.z === "number" ? value.z : undefined;
  const subject = pushSubject(value.target, actors, props);
  const target = cameraTargetPoint(subject, [previous.x, previous.y]);
  const nextZoom = zoom === undefined ? previous.z : zoom;
  // PerformanceFrame applies `translate(-x, -y) scale(z)`, so x/y are world
  // offsets, not already-scaled pixel translations.
  const fitted = operation === "push" || (operation === "hold" && typeof value.target === "string")
    ? fitPushCamera(target, subject, actors, nextZoom, viewport)
    : undefined;
  const centeredX = (fitted?.center[0] ?? target[0]) - viewport.width / (2 * (fitted?.zoom ?? nextZoom));
  const centeredY = (fitted?.center[1] ?? target[1]) - viewport.height / (2 * (fitted?.zoom ?? nextZoom));
  const compositionX = viewport.width * nextZoom / 2 - viewport.width / 2;
  const compositionY = viewport.height * nextZoom / 2 - viewport.height / 2;
  // Semantic camera recipes carry placeholder x/y=0. A push must center its
  // target before zooming; treating those placeholders as literal coordinates
  // scales the world around its top-left corner and can crop the other actor.
  const targetPush = operation === "push" || (operation === "hold" && typeof value.target === "string");
  const x = targetPush ? centeredX : typeof value.x === "number" ? value.x : operation === "pull" ? composition.x : previous.x;
  const y = targetPush ? centeredY : typeof value.y === "number" ? value.y : operation === "pull" ? composition.y : previous.y;
  return {frame: trackEventStart(event), x, y, z: fitted?.zoom ?? nextZoom, rotation: numberOr(value.rotation as number | undefined, previous.rotation), ease: event.ease ?? value.ease as PerformanceCameraKey["ease"]};
}

/** The subject of the shot in force at `frame`: the most recent push/hold with a
 *  named target, cleared by a pull back to the room. Iteration inside
 *  containCamera uses this band so a focused shot keeps its subject framed. */
function shotSubjectAt(
  tracks: readonly EvaluatedTrack[],
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
  frame: number,
  follow?: FollowProbe,
): PushSubject | undefined {
  const events = tracks.filter((track) => track.kind === "camera")
    .flatMap((track) => track.events)
    .sort((a, b) => trackEventStart(a) - trackEventStart(b));
  let found: PushSubject | undefined;
  for (const event of events) {
    if (trackEventStart(event) > frame) break;
    const value = cameraKeyValue(event);
    if (value.operation === "pull") found = undefined;
    else if (value.operation === "follow") {
      found = (typeof value.target === "string" ? follow?.(value.target, frame) : undefined) ?? found;
    }    else if (value.operation === "push" || value.operation === "hold") {
      found = pushSubject(value.target, actors, props) ?? found;
    }
  }
  return found;
}

function cameraKeysFromTracks(
  tracks: readonly EvaluatedTrack[],
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
  composition: EvaluatedCamera,
  video: {width: number; height: number; fps: number},
  follow?: FollowProbe,
): PerformanceCameraKey[] {
  const events = tracks.filter((track) => track.kind === "camera").flatMap((track) => track.events).sort((a, b) => trackEventStart(a) - trackEventStart(b));
  let previous = composition;
  return events.flatMap((event) => {
    const start = previous;
    if (cameraKeyValue(event).operation === "follow") {
      const window = followWindowKeys(event, follow, video);
      const last = window.at(-1);
      if (last) previous = {x: last.x ?? previous.x, y: last.y ?? previous.y, z: last.z ?? previous.z, rotation: last.rotation ?? previous.rotation};
      // An unresolvable target holds the shot where it was: a follow that
      // cannot see its subject must not drag the camera to the stage origin.
      return window;
    }
    const key = cameraKeyFromEvent(event, actors, props, previous, composition, video);
    const value = cameraKeyValue(event);
    const semantic = value.operation === "push" || value.operation === "pull" || typeof value.zoom === "number";
    const end = trackEventEnd(event, trackEventStart(event));
    previous = {x: key.x ?? previous.x, y: key.y ?? previous.y, z: key.z ?? previous.z, rotation: key.rotation ?? previous.rotation};
    return semantic && end > trackEventStart(event)
      ? [{frame: trackEventStart(event), x: start.x, y: start.y, z: start.z, rotation: start.rotation, ease: event.ease}, {...key, frame: end}]
      : [key];
  });
}

function targetPoint(target: unknown, manifest: PerformanceManifest, fallback: [number, number]): [number, number] | undefined {
  if (typeof target !== "string") return undefined;
  const actor = manifest.actors?.find((item) => item.id === target);
  if (actor) return semanticPlacement(actor.placement ?? actor.semanticPlacement ?? actor.place ?? (actor.at ? {at: actor.at} : {at: fallback}), manifest.placements ?? manifest.marks).at;
  const prop = (manifest.props ?? manifest.objects)?.find((item) => item.id === target);
  if (prop) return prop.at ?? prop.position;
  const mark = (manifest.placements ?? manifest.marks)?.[target];
  return Array.isArray(mark) ? [mark[0], mark[1]] : mark?.at ?? mark?.position;
}

function genericPlacement(tracks: readonly EvaluatedTrack[], frame: number, fallback: PerformancePlacement, manifest: PerformanceManifest): PerformancePlacement {
  // Only transform tracks carry placement. Movement tracks describe leg
  // choreography phases; letting them project position restarted the ease at
  // every phase boundary and made actors visibly jump between two spots.
  const event = tracks
    .filter((track) => track.kind === "transform")
    .flatMap((track) => track.events)
    .filter((item) => trackEventStart(item) <= frame)
    .sort((a, b) => trackEventStart(a) - trackEventStart(b))
    .at(-1);
  if (!event) return fallback;
  const value = eventValue(event);
  const nested = asRecord(value.value);
  const transform = nested ?? value;
  // Displacement deltas (dx/dy) move the subject relative to its staged
  // position — how push shoves its target without knowing stage coordinates.
  const hasDelta = typeof transform.dx === "number" || typeof transform.dy === "number";
  const destination = targetPoint(transform.to ?? transform.target, manifest, fallback.at ?? [0, 0]);
  const start = fallback.at ?? [fallback.x ?? 0, fallback.y ?? 0];
  const eased = event.progress * event.progress * (3 - 2 * event.progress);
  const end = hasDelta
    ? [start[0] + (Number(transform.dx) || 0), start[1] + (Number(transform.dy) || 0)] as [number, number]
    : destination ? [destination[0] + (destination[0] >= start[0] ? -170 : 170), destination[1]] as [number, number] : undefined;
  const travelled = end ? [start[0] + (end[0] - start[0]) * eased, start[1] + (end[1] - start[1]) * eased] as [number, number] : undefined;
  const point = pointOf(transform.at) ?? pointOf(transform.position) ?? pointOf(transform.to) ?? travelled;
  const position = point ?? (typeof transform.x === "number" || typeof transform.y === "number"
    ? [typeof transform.x === "number" ? transform.x : fallback.at?.[0] ?? 0, typeof transform.y === "number" ? transform.y : fallback.at?.[1] ?? 0] as [number, number]
    : fallback.at);
  return {
    ...fallback,
    ...(position ? {at: position} : {}),
    ...(typeof transform.x === "number" ? {x: transform.x} : {}),
    ...(typeof transform.y === "number" ? {y: transform.y} : {}),
    ...(typeof transform.scale === "number" ? {scale: transform.scale} : {}),
    ...(typeof transform.rotation === "number" ? {rotation: transform.rotation} : {}),
    ...(typeof transform.flip === "boolean" ? {flip: transform.flip} : {}),
  };
}

function eventsAt(tracks: readonly EvaluatedTrack[], kind: EvaluatedTrack["kind"], frame: number): EvaluatedTrack["events"] {
  return tracks.filter((track) => track.kind === kind).flatMap((track) => track.events).filter((event) => {
    const start = trackEventStart(event);
    return frame >= start && frame < trackEventEnd(event, start);
  });
}

function intervalActive(
  value: { startFrame?: number; endFrame?: number; start?: number; end?: number; durationFrames?: number; duration?: number },
  frame: number,
): boolean {
  const start = value.startFrame ?? value.start ?? 0;
  const end = value.endFrame ?? value.end ?? (value.durationFrames ? start + value.durationFrames : value.duration ? start + value.duration : Number.POSITIVE_INFINITY);
  return frame >= start && frame < end;
}

function latestPositionKey(keys: readonly PerformancePositionKey[] | undefined, frame: number): PerformancePositionKey | undefined {
  let latest: PerformancePositionKey | undefined;
  for (const key of keys ?? []) {
    if (frameOf(key) <= frame && (!latest || frameOf(key) >= frameOf(latest))) latest = key;
  }
  return latest;
}

function positionPoint(key: PerformancePositionKey, fallback: [number, number]): [number, number] {
  const point = key.at ?? key.to;
  return point
    ? [point[0], point[1]]
    : [key.x ?? fallback[0], key.y ?? fallback[1]];
}

function semanticPlacement(
  placement: PerformanceActor["placement"],
  placements: Record<string, PerformancePlacementValue | PerformancePlacement> | undefined,
): PerformancePlacement {
  const direct = typeof placement === "string"
    ? undefined
    : placement && ("at" in placement || "position" in placement || "x" in placement || "y" in placement)
      ? placement
      : undefined;
  if (direct) {
    const at = direct.at ?? direct.position ?? [direct.x ?? 0, direct.y ?? 0];
    return {
      at: [at[0], at[1]],
      scale: numberOr(direct.scale, 1),
      rotation: numberOr(direct.rotation, 0),
      flip: direct.flip === true,
      // A resolved placement carries the declared plane too (D1): dropping it
      // here drew every staged actor at plane 0, under a net that names 45.
      ...(direct.z === undefined ? {} : {z: direct.z}),
    };
  }
  const semantic = placement && typeof placement === "object" && "mark" in placement ? placement : undefined;
  const markName = typeof placement === "string" ? placement : semantic?.mark;
  const markValue = markName ? placements?.[markName] : undefined;
  const mark: PerformancePlacement | undefined = Array.isArray(markValue)
    ? { at: [markValue[0], markValue[1]] }
    : markValue;
  if (!mark) {
    // move.to() may name an actor/prop/dressing rather than a layout mark.
    // Keep the current authored placement when the semantic target is not a
    // staging mark; interaction procedures still carry the target identity.
    return {at: [0, 0], scale: 1, rotation: 0, flip: false};
  }
  const offset = semantic?.offset;
  return {
    at: [
      (mark.at ?? mark.position ?? [mark.x ?? 0, mark.y ?? 0])[0] + (offset?.[0] ?? 0),
      (mark.at ?? mark.position ?? [mark.x ?? 0, mark.y ?? 0])[1] + (offset?.[1] ?? 0),
    ],
    scale: numberOr(mark.scale, 1) * numberOr(semantic?.scale, 1),
    rotation: numberOr(mark.rotation, 0),
    flip: mark.flip === true,
    ...(mark.z === undefined ? {} : {z: mark.z}),
  };
}

function placementAt(
  actor: PerformanceActor,
  manifest: PerformanceManifest,
  frame: number,
): PerformancePlacement {
  let base = semanticPlacement(
    actor.placement ?? actor.semanticPlacement ?? actor.place ?? (actor.at ? { at: actor.at } : { at: [0, 0] }),
    manifest.placements ?? manifest.marks,
  );
  const placementKey = latestAt(actor.placementTrack, frame);
  if (placementKey) base = semanticPlacement(placementKey.placement, manifest.placements ?? manifest.marks);
  const key = latestPositionKey(actor.positionTrack, frame);
  if (!key) return base;
  const at = positionPoint(key, base.at ?? [0, 0]);
  return { ...base, at, scale: numberOr(key.scale, numberOr(base.scale, 1)), rotation: numberOr(key.rotation, numberOr(base.rotation, 0)), flip: key.flip ?? base.flip };
}

function expressionAt(actor: PerformanceActor, frame: number): EvaluatedExpression {
  const key = latestAt((actor.expressionTrack ?? actor.expressions)?.map((item) => ({ ...item, frame: frameOf(item) })), frame);
  const current = key?.value ?? expressionValue(key) ?? actor.expression;
  return {
    ...DEFAULT_EXPRESSION,
    ...(current ? cloneExpression(current) : {}),
    gaze: vecOr(current?.gaze, DEFAULT_EXPRESSION.gaze),
  };
}

function expressionValue(key: PerformanceExpressionKey | undefined): PerformanceExpression | undefined {
  if (!key?.expression && !key?.name) return undefined;
  return typeof key.expression === "string"
    ? { name: key.expression }
    : key.expression ?? { name: key.name };
}

function cloneExpression(expression: PerformanceExpression): Partial<EvaluatedExpression> {
  if (!expression.name) return {};
  return {
    name: expression.name,
    ...(expression.smile === undefined ? {} : { smile: expression.smile }),
    ...(expression.brow === undefined ? {} : { brow: expression.brow }),
    ...(expression.eyeOpen === undefined ? {} : { eyeOpen: expression.eyeOpen }),
    ...(expression.lipsPart === undefined ? {} : { lipsPart: expression.lipsPart }),
    ...(expression.gaze === undefined ? {} : { gaze: [expression.gaze[0], expression.gaze[1]] }),
  };
}

function latestAt<T extends { frame?: number; t?: number; startFrame?: number }>(keys: readonly T[] | undefined, frame: number): T | undefined {
  let latest: T | undefined;
  for (const key of keys ?? []) {
    if (frameOf(key) <= frame && (!latest || frameOf(key) >= frameOf(latest))) latest = key;
  }
  return latest;
}

function gestureEnd(key: PerformanceGestureKey, start: number): number {
  return key.endFrame ?? key.end ?? (key.durationFrames ? start + key.durationFrames : start + 1);
}

function gestureAt(actor: PerformanceActor, frame: number): EvaluatedGesture | undefined {
  const key = (actor.gestureTrack ?? actor.gestures ?? []).map((item) => ({ ...item, frame: frameOf(item) })).find(
    (candidate) => frame >= frameOf(candidate) && frame < gestureEnd(candidate, frameOf(candidate)),
  );
  if (!key) return undefined;
  const value = gestureValue(key);
  if (!value) return undefined;
  const start = frameOf(key);
  const end = gestureEnd(key, start);
  return {
    ...value,
    progress: end <= start ? 1 : clamp01((frame - start) / (end - start)),
  };
}

function gestureValue(key: PerformanceGestureKey): PerformanceGesture | undefined {
  if (key.value) return key.value;
  if (typeof key.gesture === "string") return { name: key.gesture };
  if (key.gesture) return key.gesture;
  return key.name ? { name: key.name } : undefined;
}

function cameraKeys(value: PerformanceCameraKey[] | PerformanceCameraTrack | undefined): PerformanceCameraKey[] {
  return Array.isArray(value) ? value : value?.keys ?? [];
}

function interpolateCamera(keys: PerformanceCameraKey[] | PerformanceCameraTrack | undefined, frame: number): EvaluatedCamera {
  const source = cameraKeys(keys);
  const ordered = [...source].sort((a, b) => frameOf(a) - frameOf(b));
  if (!ordered.length) return { x: 0, y: 0, z: 1, rotation: 0 };
  if (ordered.length === 1) {
    return {
      x: sampleCameraChannel(source, frame, (key) => key.x, 0),
      y: sampleCameraChannel(source, frame, (key) => key.y, 0),
      z: sampleCameraChannel(source, frame, (key) => key.z, 1),
      rotation: sampleCameraChannel(source, frame, (key) => key.rotation, 0),
    };
  }
  if (frame <= frameOf(ordered[0]!) || frame >= frameOf(ordered.at(-1)!)) {
    return {
      x: sampleCameraChannel(source, frame, (key) => key.x, 0),
      y: sampleCameraChannel(source, frame, (key) => key.y, 0),
      z: sampleCameraChannel(source, frame, (key) => key.z, 1),
      rotation: sampleCameraChannel(source, frame, (key) => key.rotation, 0),
    };
  }
  const left = ordered.findLast((key) => frameOf(key) <= frame)!;
  const right = ordered.find((key) => frameOf(key) > frame)!;
  const progress = ease(right.ease, (frame - frameOf(left)) / (frameOf(right) - frameOf(left)));
  return {
    x: cameraChannelInSegment(ordered, left, right, frame, (key) => key.x, 0, progress),
    y: cameraChannelInSegment(ordered, left, right, frame, (key) => key.y, 0, progress),
    z: cameraChannelInSegment(ordered, left, right, frame, (key) => key.z, 1, progress),
    rotation: cameraChannelInSegment(ordered, left, right, frame, (key) => key.rotation, 0, progress),
  };
}

function cameraChannelInSegment(
  keys: readonly PerformanceCameraKey[],
  left: PerformanceCameraKey,
  right: PerformanceCameraKey,
  frame: number,
  pick: (key: PerformanceCameraKey) => number | undefined,
  fallback: number,
  progress: number,
): number {
  const leftValue = [...keys].reverse().find((key) => frameOf(key) <= frameOf(left) && pick(key) !== undefined);
  const rightValue = [...keys].reverse().find((key) => frameOf(key) <= frameOf(right) && pick(key) !== undefined);
  const start = pick(leftValue ?? rightValue ?? left) ?? fallback;
  const end = pick(rightValue ?? leftValue ?? right) ?? start;
  return start + (end - start) * progress;
}

function sampleCameraChannel(
  keys: readonly PerformanceCameraKey[],
  frame: number,
  pick: (key: PerformanceCameraKey) => number | undefined,
  fallback: number,
): number {
  const values = keys
    .map((key) => ({ frame: frameOf(key), value: pick(key) }))
    .filter((value): value is { frame: number; value: number } => value.value !== undefined)
    .sort((a, b) => a.frame - b.frame);
  const first = values[0];
  if (!first) return fallback;
  if (frame <= first.frame) return first.value;
  const last = values.at(-1)!;
  if (frame >= last.frame) return last.value;
  const right = values.find((value) => value.frame > frame)!;
  const left = values[values.indexOf(right) - 1]!;
  const progress = (frame - left.frame) / (right.frame - left.frame);
  const rightKey = keys.find((key) => frameOf(key) === right.frame);
  return left.value + (right.value - left.value) * ease(rightKey?.ease, progress);
}

function lerpDefined(a: number | undefined, b: number | undefined, fallback: number, progress: number): number {
  const start = a ?? fallback;
  const end = b ?? start;
  return start + (end - start) * progress;
}

function actorState(
  actor: PerformanceActor,
  manifest: PerformanceManifest,
  frame: number,
  extraTracks: readonly PerformanceGenericTrack[] = [],
): EvaluatedActor {
  const placement = placementAt(actor, manifest, frame);
  const visual = actor.visual;
  const assets = asRecord(manifest.assets);
  const asset = actor.asset ? asRecord(assets?.[actor.asset]) : undefined;
  const present = latestAt(actor.presentTrack, frame)?.present;
  const pose = latestAt(actor.poseTrack, frame)?.value;
  const tracks = evaluateTracks([...(actor.tracks ?? []), ...extraTracks], frame);
  const lifecycle = tracks
    .filter((track) => track.kind === "lifecycle")
    .flatMap((track) => track.events)
    .filter((event) => trackEventStart(event) <= frame)
    .sort((a, b) => trackEventStart(a) - trackEventStart(b))
    .at(-1);
  const lifecycleValue = lifecycle ? eventValue(lifecycle) : undefined;
  const lifecyclePresent = typeof lifecycleValue?.present === "boolean" ? lifecycleValue.present : undefined;
  const lifecyclePose = typeof lifecycleValue?.pose === "string" ? lifecycleValue.pose : undefined;
  const expressionTrack = tracks.filter((track) => track.kind === "expression").flatMap((track) => track.events).filter((event) => trackEventStart(event) <= frame);
  const expressionFromTrack = expressionTrack.filter(event => eventValue(event).transient !== true).at(-1);
  const expressionValue = expressionFromTrack ? (asRecord(eventValue(expressionFromTrack).value) ?? eventValue(expressionFromTrack)) : undefined;
  const expression = expressionValue && (expressionValue.name || expressionValue.emotion)
    ? {name: String(expressionValue.name ?? expressionValue.emotion), ...expressionValue} as PerformanceExpression
    : undefined;
  const evaluatedExpression = expression ? {...DEFAULT_EXPRESSION, ...expression} : expressionAt(actor, frame);
  const restingEyeOpen = evaluatedExpression.eyeOpen;
  for (const event of expressionTrack) {
    const value = eventValue(event);
    if (value.transient !== true || !event.active || typeof value.eyeOpen !== "number") continue;
    // Eye-only envelope: open -> authored closure -> open; facial identity persists.
    const weight = Math.sin(Math.PI * event.progress) ** 2;
    evaluatedExpression.eyeOpen = Math.min(evaluatedExpression.eyeOpen,
      restingEyeOpen + (value.eyeOpen - restingEyeOpen) * weight);
  }
  const transformed = genericPlacement(tracks, frame, placement, manifest);
  // Orientation (45-degree facing): the newest semantic event at-or-before the
  // frame wins and PERSISTS — orientation is a body state, not a 0.2s gesture.
  // Procedure call events carry their bone-track events nested — read those too.
  const ORIENTATIONS = ["front", "back", "left", "right", "front-left", "front-right", "back-left", "back-right"];
  const orientation = tracks
    .flatMap((track) => track.events)
    .flatMap((event) => [event, ...(((event as {tracks?: Array<{events: PerformanceTrackEvent[]}>}).tracks ?? []).flatMap((nested) => nested.events))])
    .filter((event) => trackEventStart(event) <= frame)
    .map((event) => eventValue(event).orientation)
    .filter((value): value is string => typeof value === "string" && ORIENTATIONS.includes(value))
    .at(-1) as EvaluatedActor["orientation"] | undefined;
  const skeleton = actor.artwork?.views[figureViewForOrientation(orientation)].skeleton ?? actor.skeleton;
  const solvedRest = skeleton ? solveSkeleton(skeleton, {facing: transformed.flip === true ? -1 : 1}) : undefined;
  const handRadius = solvedRest ? (solvedRest.hands.hand_r?.radius ?? 26) * (transformed.scale ?? 1) : undefined;
  const cx = (skeleton?.space.width ?? 400) / 2;
  const ground = skeleton?.space.height ?? 720;
  const fkAnchors: Record<string, [number, number]> | undefined = solvedRest
    ? {
        hand_r: [Math.round(solvedRest.hands.hand_r!.center[0] - cx), Math.round(solvedRest.hands.hand_r!.center[1] - ground)],
        hand_l: [Math.round(solvedRest.hands.hand_l!.center[0] - cx), Math.round(solvedRest.hands.hand_l!.center[1] - ground)],
      }
    : undefined;
  return {
    id: actor.id,
    x: transformed.at?.[0] ?? transformed.x ?? 0,
    y: transformed.at?.[1] ?? transformed.y ?? 0,
    scale: numberOr(transformed.scale, 1),
    rotation: numberOr(transformed.rotation, 0),
    flip: transformed.flip === true,
    ...(skeleton === undefined ? {} : {skeleton}),
    ...(actor.artwork === undefined ? {} : {artwork: actor.artwork, fps: numberOr(manifest.video?.fps,24)}),
    ...(handRadius === undefined ? {} : {handRadius: Math.round(handRadius * 100) / 100}),
    ...(orientation === undefined ? {} : {orientation}),
    // The declared plane travels with the placement: a staging that puts two
    // actors at 40 and 50 is what lets a set layer at 45 stand between them, and
    // dropping it here drew both players at plane 0 with the net over both.
    z: numberOr(actor.z, numberOr(placement?.z, 0)),
    present: lifecyclePresent ?? present ?? actor.present !== false,
    ...(lifecyclePose ?? pose ?? actor.pose) === undefined ? {} : {pose: lifecyclePose ?? pose ?? actor.pose},
    expression: evaluatedExpression,
    gesture: gestureAt(actor, frame),
    tracks,
    anchors: Object.fromEntries(
      Object.entries({...actor.sockets, ...actor.anchors, ...(fkAnchors ?? {})}).map(([name, point]) => [name, [point[0], point[1]]]),
    ),
    ...((actor.src ?? visual?.src ?? (typeof asset?.src === "string" ? asset.src : undefined)) === undefined ? {} : { src: actor.src ?? visual?.src ?? asset?.src as string }),
    ...((actor.width ?? visual?.width ?? (typeof asset?.width === "number" ? asset.width : undefined)) === undefined ? {} : { width: actor.width ?? visual?.width ?? asset?.width as number }),
    ...((actor.height ?? visual?.height ?? (typeof asset?.height === "number" ? asset.height : undefined)) === undefined ? {} : { height: actor.height ?? visual?.height ?? asset?.height as number }),
  };
}

/** Ease-in-out curve for lift/drop windows (smoothstep). */
function smoothstep(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

/** Frames the hand takes to close around a prop and lift it (~0.375s at 24fps). */
const LIFT_FRAMES = 9;
/** Frames a released prop falls to its staged spot (~0.33s at 24fps). */
const DROP_FRAMES = 8;
/** Frames for the grip to seat the prop fully into the hand after a grab. */
const GRAB_SEAT_FRAMES = 6;

/**
 * Physical held-prop placement — the ONE authority for where a bound prop is
 * (docs/8_MOTOR.md). Continuity is unconditional:
 * - bind start: the prop eases from its staged position into the hand over
 *   LIFT_FRAMES (the holder walks to the prop first via motor intents, so
 *   the hand is adjacent when the lift begins — no teleport);
 * - held: the prop follows the hand exactly;
 * - release: the prop eases from the hand to its staged position over
 *   DROP_FRAMES (a drop, not a snap back).
 */
function applyHeldMotion(
  pos: {x: number; y: number; rotation: number; scale: number},
  stagedAtBind: {x: number; y: number; rotation: number; scale: number},
  stagedNow: {x: number; y: number; rotation: number; scale: number},
  interval: {t0: number; t1: number},
  handNow: {x: number; y: number; rotation: number; scale: number} | undefined,
  handAtRelease: {x: number; y: number; rotation: number; scale: number} | undefined,
  frame: number,
): void {
  if (frame < interval.t1) {
    if (!handNow) return;
    if (frame < interval.t0 + LIFT_FRAMES) {
      const eased = smoothstep((frame - interval.t0) / LIFT_FRAMES);
      pos.x = stagedAtBind.x + (handNow.x - stagedAtBind.x) * eased;
      pos.y = stagedAtBind.y + (handNow.y - stagedAtBind.y) * eased;
    } else {
      pos.x = handNow.x;
      pos.y = handNow.y;
    }
    pos.rotation += handNow.rotation;
    pos.scale *= handNow.scale;
  } else if (handAtRelease && frame < interval.t1 + DROP_FRAMES) {
    const eased = smoothstep((frame - interval.t1) / DROP_FRAMES);
    pos.x = handAtRelease.x + (stagedNow.x - handAtRelease.x) * eased;
    pos.y = handAtRelease.y + (stagedNow.y - handAtRelease.y) * eased;
    pos.rotation += handAtRelease.rotation;
    pos.scale *= handAtRelease.scale;
  }
  // Past the drop window: the staged position (already the fallback).
}

/**
 * World offset from the hand joint the motor carries a prop by to the palm the
 * ARTWORK PAINTS for that hand (R9). The bake is the physics hand; the drawing's
 * hand layer is where the finger ink is, and the two disagree wherever a view
 * paints its arm inboard of the declared joints (athlete_a `side`: 49.6 stage px
 * at the server's 0.88). A held prop's drawn socket rides the painted palm, so
 * the handle is in the hand a viewer sees; the offset is 0 for a legacy figure
 * (no artwork), for a drawing whose palm sits on its joint, and wherever the
 * frame carries no baked pose to compose.
 */
function paintedPalmOffset(actor: EvaluatedActor, side: "l" | "r"): [number, number] {
  const artwork = actor.artwork;
  const pose = actor.skeletonPose;
  if (!artwork || !pose) return [0, 0];
  const view = artwork.views[figureViewForOrientation(actor.orientation)];
  const skeleton = view.skeleton;
  const anchor = figureHandAnchor(view.hands[side].rest);
  const arm = side === "l" ? pose.armL : pose.armR;
  if (!anchor || !arm || !skeleton) return [0, 0];
  const flipped = isFlipped(actor);
  const torso = {drop: pose.waistY ?? 0, scaleY: pose.torsoScaleY ?? 1};
  const drawn = drawnArmPoint(actor, arm, anchor.at, side, flipped, torso);
  const joint = drawnArmPoint(actor, arm, skeleton.joints[`hand_${side}`]!, side, flipped, torso);
  return [drawn[0] - joint[0], drawn[1] - joint[1]];
}

/** Frames the drawn painted-palm offset takes to release after the bake stops
 *  reporting a hold (the same window the legacy held motion drops over). */
const DRAWN_OFFSET_RELEASE_FRAMES = 8;

/** The hand holding `id` this frame, if the frame reports one. */
function holderOf(id: string, actors: Map<string, EvaluatedActor>): {actor: EvaluatedActor; side: "l" | "r"} | undefined {
  for (const actor of actors.values()) {
    if (actor.holds === id) return {actor, side: "r"};
    if (actor.holdsL === id) return {actor, side: "l"};
  }
  return undefined;
}

/**
 * The drawn painted-palm offset a prop carries this frame (R9). While the bake
 * reports a hold it is the holder's own offset. Just after a release the prop is
 * a free body at its baked position, but its drawing still stands where the hand
 * was: the offset is released over DRAWN_OFFSET_RELEASE_FRAMES instead of
 * vanishing on the strike frame (measured: a 62 px jump at a-badminton's 2.208 s
 * strike, against the prop's own 22 px of motion per frame).
 */
function paintedPalmShift(
  id: string,
  actors: Map<string, EvaluatedActor>,
  frame: number,
  actorAtFrame?: (actorId: string, at: number) => EvaluatedActor | undefined,
): [number, number] {
  const held = holderOf(id, actors);
  if (held) return paintedPalmOffset(held.actor, held.side);
  if (!actorAtFrame) return [0, 0];
  for (let back = 1; back <= DRAWN_OFFSET_RELEASE_FRAMES; back += 1) {
    const at = frame - back;
    if (at < 0) return [0, 0];
    for (const actorId of actors.keys()) {
      const previous = actorAtFrame(actorId, at);
      const side = previous?.holds === id ? "r" as const : previous?.holdsL === id ? "l" as const : undefined;
      if (!previous || !side) continue;
      const offset = paintedPalmOffset(previous, side);
      const fade = 1 - smoothstep(back / DRAWN_OFFSET_RELEASE_FRAMES);
      return [offset[0] * fade, offset[1] * fade];
    }
  }
  return [0, 0];
}

function propState(
  prop: PerformanceProp,
  actors: Map<string, EvaluatedActor>,
  frame: number,
  context?: {actorAtFrame?: (actorId: string, at: number) => EvaluatedActor | undefined; motorPropFrame?: {x?: number; y?: number; falling?: boolean; rotation?: number}},
): EvaluatedProp {
  // Motor authority: when the motor simulation owns this prop, its baked
  // frame IS the position — the binding interpolation below never runs. Two
  // drawing terms ride on top of it (R9): the prop draws at its DECLARED stage
  // scale (the scale the motor sized its body and socket with — a `scale: 1`
  // drawing put the racket's handle 11.2 px below the socket), and while the
  // bake reports a hold the drawn prop rides the palm the artwork PAINTS, not
  // the hand joint the bake carries (`paintedPalmOffset`).
  const motorFrame = context?.motorPropFrame;
  if (motorFrame && typeof motorFrame.x === "number") {
    const staged = stagedPropPosition(prop, frame);
    const palm = paintedPalmShift(prop.id, actors, frame, context?.actorAtFrame);
    return projectedProp(prop, {
      x: motorFrame.x + palm[0],
      y: (motorFrame.y ?? staged.y) + palm[1],
      rotation: motorFrame.rotation ?? 0,
      scale: staged.scale,
    }, evaluateTracks(prop.tracks, frame));
  }
  const stagedNow = stagedPropPosition(prop, frame);
  const tracks = evaluateTracks(prop.tracks, frame);
  const position = latestPositionKey(prop.positionTrack, frame);
  if (position) {
    [stagedNow.x, stagedNow.y] = positionPoint(position, [stagedNow.x, stagedNow.y]);
    stagedNow.rotation = numberOr(position.rotation, stagedNow.rotation);
    stagedNow.scale = numberOr(position.scale, stagedNow.scale);
  }
  // Binding events govern placement. Events chain recursively: a bind lifts
  // the prop from wherever it actually was when the bind started (staged,
  // mid-drop, or another hand) — so handovers and quick re-binds stay
  // physically continuous (docs/8_MOTOR.md).
  const bindingTracks = tracks.filter((track) => track.kind === "binding");
  if (bindingTracks.some((track) => track.events.length)) {
    const events = bindingTracks
      .flatMap((track) => track.events)
      .sort((a, b) => trackEventStart(a) - trackEventStart(b));
    const pos = propPlacementAt(prop, events, events.length, actors, context, frame);
    return projectedProp(prop, pos, tracks);
  }
  // Declarative bind (boundTo / constraint / bind) — perpetual or interval
  // hand attachment, placed through the same physical continuity.
  const declared = prop.boundTo ?? prop.constraint ?? prop.bind;
  if (declared && intervalActive(declared, frame)) {
    const t0 = numberOr(declared.startFrame, numberOr(declared.start, 0));
    const t1 = numberOr(declared.endFrame, numberOr(declared.end, Number.POSITIVE_INFINITY));
    const holderId = String(declared.actor ?? declared.actorId ?? declared.holder ?? "");
    const handName = String(declared.hand ?? declared.socket ?? "hand_r");
    const offset = pointOf(declared.offset) ?? [0, 0];
    const holderNow = actors.get(holderId);
    const anchorNow = holderNow?.anchors[handName];
    const handNow = holderNow && anchorNow ? {
      x: holderNow.x + (holderNow.flip ? -anchorNow[0] : anchorNow[0]) * holderNow.scale + offset[0],
      y: holderNow.y + anchorNow[1] * holderNow.scale + offset[1],
      rotation: holderNow.rotation,
      scale: holderNow.scale,
    } : context?.actorAtFrame ? handAtFrame(context.actorAtFrame, holderId, handName, frame, offset) : undefined;
    const handAtRelease = Number.isFinite(t1) && context?.actorAtFrame
      ? handAtFrame(context.actorAtFrame, holderId, handName, Math.max(t0, t1 - 1), offset)
      : undefined;
    const pos = {...stagedNow};
    applyHeldMotion(pos, stagedPropPosition(prop, t0), stagedNow, {t0, t1}, handNow, handAtRelease, frame);
    return projectedProp(prop, pos, tracks);
  }
  return projectedProp(prop, stagedNow, tracks);
}

function projectedProp(prop: PerformanceProp, pos: {x: number; y: number; rotation: number; scale: number}, tracks: EvaluatedTrack[]): EvaluatedProp {
  return {
    id: prop.id,
    ...(prop.label === undefined ? {} : {label: prop.label}),
    x: pos.x,
    y: pos.y,
    rotation: pos.rotation,
    scale: pos.scale,
    z: numberOr(prop.z, 0),
    size: prop.size ? [prop.size[0], prop.size[1]] : [prop.width ?? 64, prop.height ?? 64],
    ...(prop.base === undefined ? {} : {base: prop.base}),
    // The declared drawn-body box survives projection: a push frames the
    // object on its silhouette, not on the element's nominal size box.
    ...(prop.body === undefined ? {} : {body: prop.body}),
    ...(prop.src === undefined ? {} : {src: prop.src}),
    tracks,
  };
}

/** Hand world position for a holder evaluated at an arbitrary frame. */
function handAtFrame(
  actorAtFrame: (actorId: string, at: number) => EvaluatedActor | undefined,
  holderId: string,
  handName: string,
  at: number,
  offset: [number, number],
): {x: number; y: number; rotation: number; scale: number; radius?: number} | undefined {
  const holder = actorAtFrame(holderId, at);
  if (!holder) return undefined;
  // While reaching (grab/push), the motor's reach point IS the hand.
  if (holder.reach) {
    return {x: holder.reach[0] + offset[0], y: holder.reach[1] + offset[1], rotation: holder.rotation, scale: holder.scale, radius: holder.handRadius};
  }
  const anchor = holder.anchors[handName];
  if (!anchor) return undefined;
  return {
    x: holder.x + (holder.flip ? -anchor[0] : anchor[0]) * holder.scale + offset[0],
    y: holder.y + anchor[1] * holder.scale + offset[1],
    rotation: holder.rotation,
    scale: holder.scale,
    radius: holder.handRadius,
  };
}

/**
 * Physical prop placement under a chain of binding events (newest first).
 * `limit` bounds the event prefix considered, so the recursive "where was
 * the prop when this bind started" lookup always terminates.
 */
function propPlacementAt(
  prop: PerformanceProp,
  events: ReturnType<typeof evaluateTracks>[number]["events"],
  limit: number,
  actors: Map<string, EvaluatedActor>,
  context: {actorAtFrame?: (actorId: string, at: number) => EvaluatedActor | undefined} | undefined,
  frame: number,
): {x: number; y: number; rotation: number; scale: number} {
  let index = -1;
  for (let i = 0; i < limit; i++) {
    if (trackEventStart(events[i]!) <= frame) index = i;
  }
  if (index < 0) return stagedPropPosition(prop, frame);
  const event = events[index]!;
  const value = eventValue(event);
  const t0 = trackEventStart(event);
  const t1 = trackEventEnd(event, t0);
  const holderId = String(value.actor ?? value.actorId ?? value.holder ?? event.subject ?? "");
  const handName = String(value.hand ?? value.socket ?? "hand_r");
  const offset = pointOf(value.offset) ?? [0, 0];
  const holderNow = actors.get(holderId);
  const anchorNow = holderNow?.anchors[handName];
  const handNow = holderNow && anchorNow
    ? {
        x: holderNow.x + (holderNow.flip ? -anchorNow[0] : anchorNow[0]) * holderNow.scale + offset[0],
        y: holderNow.y + anchorNow[1] * holderNow.scale + offset[1],
        rotation: holderNow.rotation,
        scale: holderNow.scale,
      }
    : context?.actorAtFrame
      ? handAtFrame(context.actorAtFrame, holderId, handName, frame, offset)
      : undefined;
  const isRelease = String(value.operation ?? "bind") === "release";
  if (!isRelease) {
    // Grab semantics (docs/8_MOTOR.md): the prop does not move by
    // magic. It stays wherever it physically is until the binding hand
    // actually arrives (hand circle overlapping the prop box), and from the grab frame on it
    // follows that hand exactly, keeping the grip offset it was grabbed with.
    if (!handNow) return stagedPropPosition(prop, frame);
    const handPosAt = (t: number) => context?.actorAtFrame
      ? handAtFrame(context.actorAtFrame, holderId, handName, t, offset)
      : handNow;
    // Hand circle radius from the holder's declared skeleton (FK rest hand).
    const handRadiusAt = (t: number): number => handPosAt(t)?.radius ?? 26;
    const prevAt = (t: number) => propPlacementAt(prop, events, index, actors, context, t);
    let grabFrame = -1;
    let gripOffset: {x: number; y: number} | null = null;
    for (let t = t0; t <= frame; t++) {
      const handT = handPosAt(t);
      if (!handT) break;
      const propScale = (prop.base === undefined ? 1 : (prevAt(t).scale ?? 1));
      const propT: {x: number; y: number; scale: number} = grabFrame >= 0
        ? {x: handT.x + gripOffset!.x, y: handT.y + gripOffset!.y, scale: propScale}
        : {...prevAt(t), scale: prevAt(t).scale ?? 1};
      const [pw, ph] = prop.size ?? [64, 64];
      const touches = circleOverlapsBox(
        {center: [handT.x, handT.y], radius: handRadiusAt(t)},
        {a: [propT.x - pw / 2, propT.y - ph], b: [propT.x + pw / 2, propT.y]},
      );
      if (grabFrame < 0 && touches) {
        grabFrame = t;
        gripOffset = {x: propT.x - handT.x, y: propT.y - handT.y};
      }
    }
    if (grabFrame >= 0) {
      const handF = handPosAt(frame)!;
      // The grip seats itself: any residual hand-to-prop gap at grab closes
      // over a few frames (the fingers pull the object into the hand).
      const seat = 1 - smoothstep((frame - grabFrame) / GRAB_SEAT_FRAMES);
      return {
        x: handF.x + gripOffset!.x * seat,
        y: handF.y + gripOffset!.y * seat,
        rotation: stagedPropPosition(prop, frame).rotation + handF.rotation,
        scale: stagedPropPosition(prop, frame).scale * handF.scale,
      };
    }
    // Not grabbed yet: the prop stays put — unless the hand is never going
    // to arrive (no approach intent authored); after a grace period, ease to
    // the hand so episodes without an approach still complete.
    const graceOver = frame >= t0 + 72;
    if (graceOver) {
      const eased = smoothstep((frame - t0 - 72) / 18);
      const from = prevAt(t0 + 72);
      return {
        x: from.x + (handNow.x - from.x) * eased,
        y: from.y + (handNow.y - from.y) * eased,
        rotation: stagedPropPosition(prop, frame).rotation + handNow.rotation,
        scale: stagedPropPosition(prop, frame).scale * handNow.scale,
      };
    }
    return prevAt(frame);
  }
  // Explicit release: the prop falls from the hand toward its staged
  // position over DROP_FRAMES.
  const handAtLoose = context?.actorAtFrame
    ? handAtFrame(context.actorAtFrame, holderId, handName, Math.max(t0, t1 - 1), offset)
    : handNow;
  const stagedNow = stagedPropPosition(prop, frame);
  if (handAtLoose) {
    const dropFrames = Math.max(DROP_FRAMES, Math.min(20, Math.round(Math.hypot(stagedNow.x - handAtLoose.x, stagedNow.y - handAtLoose.y) / 30)));
    if (frame < t1 + dropFrames) {
      const eased = smoothstep((frame - t1) / dropFrames);
      return {
        x: handAtLoose.x + (stagedNow.x - handAtLoose.x) * eased,
        y: handAtLoose.y + (stagedNow.y - handAtLoose.y) * eased,
        rotation: stagedNow.rotation + handAtLoose.rotation,
        scale: stagedNow.scale * handAtLoose.scale,
      };
    }
  }
  return stagedNow;
}

/** The prop's own placement (staging + transform/position tracks, no bindings). */
function stagedPropPosition(prop: PerformanceProp, frame: number): {x: number; y: number; rotation: number; scale: number} {
  const base = prop.at ?? prop.position ?? [0, 0];
  const staged = {x: base[0], y: base[1], rotation: numberOr(prop.rotation, 0), scale: numberOr(prop.scale, 1)};
  const stagedTracks = evaluateTracks(prop.tracks, frame);
  const transform = eventsAt(stagedTracks, "transform", frame).at(-1) ?? eventsAt(stagedTracks, "movement", frame).at(-1);
  if (transform) {
    const value = eventValue(transform);
    staged.x = numberOr(value.x as number | undefined, staged.x);
    staged.y = numberOr(value.y as number | undefined, staged.y);
    staged.rotation = numberOr(value.rotation as number | undefined, staged.rotation);
    staged.scale = numberOr(value.scale as number | undefined, staged.scale);
  }
  const position = latestPositionKey(prop.positionTrack, frame);
  if (position) {
    [staged.x, staged.y] = positionPoint(position, [staged.x, staged.y]);
    staged.rotation = numberOr(position.rotation, staged.rotation);
    staged.scale = numberOr(position.scale, staged.scale);
  }
  return staged;
}

function tracksForSubject(tracks: readonly PerformanceGenericTrack[], subject: string): PerformanceGenericTrack[] {
  return tracks.filter((track) => track.subject === subject || track.target === subject);
}

function applyManifestConstraints(
  props: EvaluatedProp[],
  constraints: PerformanceConstraint[] | undefined,
  actors: Map<string, EvaluatedActor>,
  frame: number,
  context?: {actorAtFrame?: (actorId: string, at: number) => EvaluatedActor | undefined; fps?: number},
): EvaluatedProp[] {
  if (!constraints?.length) return props;
  const fps = context?.fps ?? 24;
  const byId = new Map(props.map((prop) => [prop.id, prop]));
  for (const constraint of constraints) {
    const prop = byId.get(constraint.prop ?? constraint.object ?? "");
    const actorId = typeof constraint.actor === "string"
      ? constraint.actor
      : typeof constraint.actorId === "string" ? constraint.actorId : constraint.holder ?? "";
    // Props with binding events are owned by propState's physical resolver
    // for their whole timeline — compiler constraints never override them
    // (a constraint interval ending is NOT a release).
    if (!prop || prop.tracks.some((track) => track.kind === "binding" && track.events.length > 0)) continue;
    const t0 = constraint.startFrame ?? Math.round((constraint.start ?? 0) * fps);
    const t1 = constraint.endFrame
      ?? (constraint.end !== undefined ? Math.round(constraint.end * fps) : t0 + (constraint.durationFrames ?? Math.round((constraint.duration ?? 0) * fps)));
    if (frame < t0 || frame >= t1 + DROP_FRAMES) continue;
    const handName = constraint.hand ?? constraint.socket ?? "hand_r";
    const offset = constraint.offset ?? [0, 0];
    const handNow = handAtFrame(context?.actorAtFrame ?? (() => actors.get(actorId)), actorId, handName, frame, offset)
      ?? undefined;
    const handAtRelease = context?.actorAtFrame ? handAtFrame(context.actorAtFrame, actorId, handName, Math.max(t0, t1 - 1), offset) : undefined;
    applyHeldMotion(prop, prop, prop, {t0, t1}, handNow, handAtRelease, frame);
  }
  return props;
}

function activeSubtitles(subtitles: PerformanceSubtitle[] | undefined, frame: number): PerformanceSubtitle[] {
  return (subtitles ?? [])
    .filter((subtitle) => {
      const start = subtitle.startFrame ?? subtitle.start ?? 0;
      const end = subtitle.endFrame ?? subtitle.end ?? (subtitle.durationFrames ? start + subtitle.durationFrames : subtitle.duration ? start + subtitle.duration : Number.POSITIVE_INFINITY);
      return frame >= start && frame < end;
    })
    .map((subtitle) => ({ ...subtitle }));
}

function vfxTargetId(effect: PerformanceVfx | PerformanceTrackEvent, value: UnknownRecord): string | undefined {
  const target = value.target ?? effect.target;
  if (typeof target === "string") return target;
  const targetRecord = asRecord(target);
  if (typeof targetRecord?.id === "string") return targetRecord.id;
  return typeof value.targetId === "string" ? value.targetId : undefined;
}

function projectVfxTarget(
  effect: EvaluatedVfx,
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
  value: UnknownRecord = effect,
): EvaluatedVfx {
  const targetId = vfxTargetId(effect, value);
  const actor = targetId ? actors.find((candidate) => candidate.id === targetId) : undefined;
  const prop = targetId ? props.find((candidate) => candidate.id === targetId) : undefined;
  const authoredPosition = pointOf(value.targetPosition) ?? pointOf(value.position);
  // Explicit bind point: anchor the effect to a body socket (e.g. the hand
  // doing the action) instead of the body center.
  const bindName = typeof value.bind === "string" ? value.bind : undefined;
  const bindAnchor = actor && bindName ? actor.anchors?.[bindName] : undefined;
  const position = bindAnchor
    ? [actor!.x + bindAnchor[0] * actor!.scale, actor!.y + bindAnchor[1] * actor!.scale] as [number, number]
    : actor
    ? [actor.x, actor.y - 360 * actor.scale] as [number, number]
    : prop
      ? [prop.x, prop.y] as [number, number]
      : authoredPosition;
  if (!position) return effect;
  const targetMeta = actor
    ? {id: actor.id, kind: "actor", position, x: actor.x, y: actor.y, scale: actor.scale}
    : prop
      ? {id: prop.id, kind: "prop", position, x: prop.x, y: prop.y, scale: prop.scale, size: prop.size}
      : undefined;
  return {
    ...effect,
    progress: effect.progress,
    ...(targetId ? {target: targetId} : {}),
    targetPosition: position,
    ...(targetMeta ? {targetMeta} : {}),
  };
}

function activeVfx(
  vfx: PerformanceVfx[] | undefined,
  frame: number,
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
): EvaluatedVfx[] {
  return (vfx ?? [])
    .filter((effect) => {
      const start = effect.startFrame ?? effect.start ?? effect.at ?? 0;
      const end = effect.endFrame ?? effect.end ?? (effect.durationFrames ? start + effect.durationFrames : effect.duration ? start + effect.duration : start + 1);
      return frame >= start && frame < end;
    })
    .map((effect) => projectVfxTarget({
      ...effect,
      progress: (() => {
        const start = effect.startFrame ?? effect.start ?? effect.at ?? 0;
        const end = effect.endFrame ?? effect.end ?? (effect.durationFrames ? start + effect.durationFrames : effect.duration ? start + effect.duration : start + 1);
        return end > start ? clamp01((frame - start) / (end - start)) : 0;
      })(),
    } as EvaluatedVfx, actors, props));
}

function activeTrackVfx(
  tracks: readonly EvaluatedTrack[],
  frame: number,
  actors: readonly EvaluatedActor[],
  props: readonly EvaluatedProp[],
): EvaluatedVfx[] {
  return tracks
    .filter((track) => track.kind === "vfx")
    .flatMap((track, trackIndex) => track.events.map((event, eventIndex) => ({track, event, trackIndex, eventIndex})))
    .filter(({event}) => event.active)
    .map(({track, event, trackIndex, eventIndex}) => {
      const value = eventValue(event);
      const start = trackEventStart(event);
      return projectVfxTarget({
        id: `track-vfx-${trackIndex}-${eventIndex}`,
        type: String(value.type ?? value.style ?? value.effect ?? "effect"),
        startFrame: start,
        endFrame: trackEventEnd(event, start),
        progress: event.progress,
        ...value,
        ...(value.target === undefined && track.target ? {target: track.target} : {}),
        // Emotion/actor-category vfx without an explicit target bind to the
        // acting subject — the effect originates at the actor, not screen center.
        ...(value.target === undefined && !track.target && track.subject && value.bind === undefined ? {target: track.subject} : {}),
      } satisfies EvaluatedVfx, actors, props, value);
    });
}

/** The hang placement and whole-body rotation, verbatim from the bake: the
 *  motor's `y` is the placement's ground line (a hanging body's feet are not on
 *  the staged floor) and `grip` the design point it turns about. */
function hangChannels(motor: {y?: number; rotation?: number; grip?: [number, number]}): {y?: number; rotation?: number; grip?: [number, number]} {
  return {
    ...(motor.y === undefined ? {} : {y: motor.y}),
    ...(motor.rotation === undefined ? {} : {rotation: motor.rotation}),
    ...(motor.grip === undefined ? {} : {grip: motor.grip}),
  };
}

/** Pure runtime projection: the returned state depends only on manifest and frame. */
export function evaluatePerformance(manifest: PerformanceManifest, frame: number): PerformanceFrameState {
  const normalized = normalizePerformanceManifest({ ...manifest, timebase: manifest.timebase ?? "seconds" });
  const safeFrame = Number.isFinite(frame) ? Math.max(0, Math.floor(frame)) : 0;
  const tracks = (normalized.tracks ?? []).flatMap((track) => evaluateTracks([track], safeFrame));
  const rawActors = (normalized.actors ?? []).map((actor) => actorState(actor, normalized, safeFrame, tracksForSubject(tracks, actor.id)));
  // Motor-driven actors follow baked trajectories exactly (docs/8_MOTOR.md):
  // their positions are physical and must not be repelled or eased.
  const motorScenes = (manifest as {sceneTrack?: Array<{start?: number; motor?: {actors?: Record<string, Array<Record<string, unknown>>>; props?: Record<string, Array<{x?: number; y?: number; falling?: boolean; rotation?: number}>>}}>}).sceneTrack ?? [];
  const motorFps = normalized.video?.fps ?? 24;
  const activeMotorScene = motorScenes.find((scene) => {
    const start = Math.round((scene.start ?? 0) * motorFps);
    const end = Math.round(((scene.start ?? 0) + 1) * motorFps);
    return safeFrame >= start && safeFrame < Math.max(end, (scene.motor?.actors ? Object.values(scene.motor.actors)[0]?.length ?? 0 : 0) + start);
  });
  /** The baked motor channels an evaluated actor reads (slice B adds the hang
   *  placement and the whole-body rotation). */
  type MotorActorChannel = {x?: number; y?: number; rotation?: number; grip?: [number, number]; facing?: number; lean?: number; walk?: number; reach?: [number, number]; reachInfluence?: number; gripDepth?: "front"|"behind"; contact?: boolean; waist?: number;crouch?:number; skeletonPose?:import("@anim/core/skeleton").SkeletonPose; worldFootTargets?:{l:[number,number];r:[number,number]}; footSupport?:{l:boolean;r:boolean}; orientation?:EvaluatedActor["orientation"]; holds?: string; holdsL?: string; reachL?: [number, number]};
  const motorFrameAt = (id: string, at: number): Record<string, unknown> | undefined => {
    const scene = motorScenes.find((candidate) => {
      const start = Math.round((candidate.start ?? 0) * motorFps);
      const end = Math.round(((candidate.start ?? 0) + 1) * motorFps);
      return at >= start && at < Math.max(end, (candidate.motor?.actors ? Object.values(candidate.motor.actors)[0]?.length ?? 0 : 0) + start);
    });
    const frames = scene?.motor?.actors?.[id];
    if (!frames?.length) return undefined;
    const local = Math.max(0, Math.min(at - Math.round((scene!.start ?? 0) * motorFps), frames.length - 1));
    return frames[local];
  };
  const motorFrameFor = (id: string): Record<string, unknown> | undefined => motorFrameAt(id, safeFrame);
  // Motor prop frames are the SINGLE position authority for motor-driven
  // props: carried props ride the hand FK, pushed props slide by force, and
  // released props fall to the declared support — nothing interpolates.
  const motorPropFrameAt = (id: string, at: number): {x?: number; y?: number; falling?: boolean; rotation?: number} | undefined => {
    const scene = motorScenes.find((candidate) => {
      const start = Math.round((candidate.start ?? 0) * motorFps);
      const end = Math.round(((candidate.start ?? 0) + 1) * motorFps);
      return at >= start && at < Math.max(end, (candidate.motor?.props ? Object.values(candidate.motor.props)[0]?.length ?? 0 : 0) + start);
    });
    const frames = scene?.motor?.props?.[id];
    if (!frames?.length) return undefined;
    const local = Math.max(0, Math.min(at - Math.round((scene!.start ?? 0) * motorFps), frames.length - 1));
    return frames[local];
  };
  const actorAtFrame = (actorId: string, at: number): EvaluatedActor | undefined => {
    const def = (normalized.actors ?? []).find((candidate) => candidate.id === actorId);
    if (!def) return undefined;
    const base = actorState(def, normalized, at, tracksForSubject(tracks, actorId));
    const motor = motorFrameAt(actorId, at) as MotorActorChannel | undefined;
    if (!motor || typeof motor.x !== "number") return base;
    return {
      ...base,
      x: motor.x,
      flip: (motor.facing ?? (base.flip ? -1 : 1)) === -1,
      ...(motor.lean === undefined ? {} : {lean: motor.lean}),
      ...(motor.walk === undefined ? {} : {walk: motor.walk}),
      ...(motor.reach === undefined ? {} : {reach: motor.reach}),
      reachInfluence: motor.reachInfluence, gripDepth: motor.gripDepth,
      ...(motor.contact === undefined ? {} : {contact: motor.contact}),
      ...(motor.waist === undefined ? {} : {waist: motor.waist}),
      crouch: motor.crouch ?? 0, worldFootTargets:motor.worldFootTargets, footSupport:motor.footSupport, skeletonPose:motor.skeletonPose, ...(motor.orientation?{orientation:motor.orientation, skeleton:base.artwork?.views[figureViewForOrientation(motor.orientation)].skeleton??base.skeleton}:{}),
      ...(base.artwork ? {motor:true as const,facing:(motor.facing??(base.flip?-1:1)) as 1|-1} : {}),
      ...(motor.holds === undefined ? {} : {holds: motor.holds}),
      ...(motor.holdsL === undefined ? {} : {holdsL: motor.holdsL}),
      ...(motor.reachL === undefined ? {} : {reachLeft: motor.reachL}),
      ...hangChannels(motor),
    };
  };
  const actors = repelActors(
    rawActors.map((actor) => {
      const motor = motorFrameFor(actor.id) as MotorActorChannel | undefined;
      if (!motor || typeof motor.x !== "number") return actor;
      return {...actor, x: motor.x, lean: motor.lean ?? 0, walk: motor.walk ?? 0, facing: (motor.facing ?? (actor.flip ? -1 : 1)) as 1 | -1, flip: (motor.facing ?? (actor.flip ? -1 : 1)) === -1, reach: motor.reach as [number, number] | undefined, reachInfluence: motor.reachInfluence, gripDepth: motor.gripDepth, contact: motor.contact === true, waist: motor.waist ?? 0, motor: true as const, crouch: motor.crouch ?? 0, worldFootTargets:motor.worldFootTargets, footSupport:motor.footSupport, skeletonPose:motor.skeletonPose, ...(motor.orientation?{orientation:motor.orientation, skeleton:actor.artwork?.views[figureViewForOrientation(motor.orientation)].skeleton??actor.skeleton}:{}), ...(motor.holds === undefined ? {} : {holds: motor.holds}), ...(motor.holdsL === undefined ? {} : {holdsL: motor.holdsL}), ...(motor.reachL === undefined ? {} : {reachLeft: motor.reachL}), ...hangChannels(motor)};
    }),
  );
  const actorById = new Map(actors.map((actor) => [actor.id, actor]));
  const props = (normalized.props ?? normalized.objects ?? []).map((prop) => {
    const projected = {...prop, tracks: [...(prop.tracks ?? []), ...tracksForSubject(tracks, prop.id)]};
    return propState(projected, actorById, safeFrame, {actorAtFrame, motorPropFrame: motorPropFrameAt(projected.id, safeFrame)});
  });
  const propAtFrame = (id: string, at: number): EvaluatedProp | undefined => {
    const def = (normalized.props ?? normalized.objects ?? []).find((candidate) => candidate.id === id);
    if (!def) return undefined;
    const projected = {...def, tracks: [...(def.tracks ?? []), ...tracksForSubject(evaluateTracks(normalized.tracks, at), id)]};
    return propState(projected, actorById, at, {actorAtFrame, motorPropFrame: motorPropFrameAt(id, at)});
  };
  const evaluatedProps = applyManifestConstraints(
    props,
    [...(normalized.constraints ?? []), ...(normalized.propConstraints ?? []), ...(normalized.bindingConstraints ?? [])],
    actorById,
    safeFrame,
    {actorAtFrame, fps: normalized.video?.fps ?? 24},
  );
  /** A follow resolves its target on the frame the key belongs to, not on the
   *  frame being drawn: the keys span the window, and the prop's placement then
   *  is what the shot must frame. Motor bakes are the position authority, the
   *  binding constraints are what keep a carried prop's follow honest, and an
   *  actor target is followed on its own drawn band. */
  const followProbe: FollowProbe = (target, at) => {
    const prop = propAtFrame(target, at);
    if (prop) {
      const band = propFrameBand(prop);
      return {centre: [prop.x, (band[0] + band[1]) / 2], band, horizontal: "self", follow: true};
    }
    const actor = actorAtFrame(target, at);
    if (!actor?.present) return undefined;
    const band = actorFrameBand(actor);
    return {centre: [actor.x, (band[0] + band[1]) / 2], band, horizontal: "pair", follow: true};
  };
  const explicitCameraKeys = cameraKeys(normalized.camera ?? normalized.cameraTrack);
  const composition = interpolateCamera(explicitCameraKeys, 0);
  const projectedCameraKeys = cameraKeysFromTracks(tracks, actors, evaluatedProps, composition, normalized.video ?? {width: 1920, height: 1080, fps: 24}, followProbe);
  const interpolatedCamera = interpolateCamera([...explicitCameraKeys, ...projectedCameraKeys], safeFrame);
  return {
    frame: safeFrame,
    // The camera never leaves the painted stage: clamp every frame, whatever
    // path produced the key (containCamera, explicit camera tracks, defaults).
    camera: clampCameraToStage(
      manifest.locationScenes
        ? containCamera(interpolatedCamera, actors, normalized.video ?? {width: 1920, height: 1080}, shotSubjectAt(tracks, actors, evaluatedProps, safeFrame, followProbe))
        : interpolatedCamera,
      normalized.video ?? {width: 1280, height: 720},
    ),
    actors,
    props: evaluatedProps,
    subtitles: activeSubtitles(normalized.subtitles ?? normalized.subtitleTrack ?? normalized.captions, safeFrame),
    vfx: [
      ...activeVfx(normalized.vfx ?? normalized.effects, safeFrame, actors, evaluatedProps),
      ...activeTrackVfx(tracks, safeFrame, actors, evaluatedProps),
    ],
    tracks,
  };
}

export function performanceMetadata(manifest: PerformanceManifest): {
  durationInFrames: number;
  fps: number;
  width: number;
  height: number;
} {
  const normalized = normalizePerformanceManifest({ ...manifest, timebase: manifest.timebase ?? "seconds" });
  return {
    durationInFrames: Math.max(
      1,
      normalized.durationInFrames ?? 1,
    ),
    fps: normalized.video!.fps,
    width: normalized.video!.width,
    height: normalized.video!.height,
  };
}

function isCompiledEpisode(manifest: PerformanceManifest): boolean {
  return Array.isArray(manifest.sceneTrack) && Array.isArray(manifest.performanceTracks) && typeof manifest.totalDuration === "number";
}

function resolvedAsset(assets: UnknownRecord | undefined, group: string, id: string): UnknownRecord | undefined {
  const entry = asRecord(asRecord(assets?.[group])?.[id]);
  return asRecord(entry?.resolved) ?? asRecord(asRecord(entry?.use)?.resolved);
}

function resolvedAssetForInstance(assets: UnknownRecord | undefined, group: string, id: string): UnknownRecord | undefined {
  const resolved = resolvedAsset(assets, group, id);
  if (resolved) return resolved;
  const entries = asRecord(assets?.[group]);
  for (const entry of Object.values(entries ?? {})) {
    const record = asRecord(entry);
    if (record?.instance === id) return asRecord(record.resolved);
  }
  return undefined;
}

function assetAnchors(asset: UnknownRecord | undefined): Record<string, [number, number]> {
  const anchors = asRecord(asset?.anchors) ?? asRecord(asset?.sockets);
  const resolved = Object.fromEntries(
    Object.entries(anchors ?? {}).flatMap(([name, point]) => {
      const value = pointOf(point);
      return value ? [[name, value]] : [];
    }),
  );
  if (Object.keys(resolved).length > 0) return resolved;
  // Fallback hand socket in actor-local coordinates (right hand at mid-torso,
  // mirrored like HeldProp): keeps prop bindings working for figures whose
  // assets declare no explicit sockets.
  return {hand_r: [88, -218], hand_l: [-88, -218]};
}

function assetVisual(asset: UnknownRecord | undefined) {
  const visual = asRecord(asset?.visual) ?? asset;
  return {
    ...(typeof visual?.src === "string" ? {src: visual.src} : {}),
    ...(typeof visual?.width === "number" ? {width: visual.width} : {}),
    ...(typeof visual?.height === "number" ? {height: visual.height} : {}),
    ...(Array.isArray(visual?.size) ? {size: visual.size as [number, number]} : {}),
  };
}

function compiledPlacements(compiled: PerformanceManifest, assets: UnknownRecord): Record<string, PerformancePlacementValue> {
  const placements: Record<string, PerformancePlacementValue> = {};
  const video = compiled.video ?? {width: 1920, height: 1080};
  for (const scene of compiled.sceneTrack ?? []) {
    const layout = resolvedAsset(assets, "layouts", scene.layout);
    const marks = asRecord(layout?.marks);
    for (const [name, value] of Object.entries(marks ?? {})) {
      const point = pointOf(value);
      if (point) placements[name] = stagePoint(point, scene.staging, video);
      else if (asRecord(value)) placements[name] = value as PerformancePlacement;
    }
    for (const [id, actor] of Object.entries(scene.staging?.actors ?? {})) {
      placements[id] = {at: stagePoint([actor.at[0], actor.at[1]], scene.staging, video), scale: stageScale(actor.scale, scene.staging, video), flip: actor.flip, z: actor.z};
    }
    for (const [id, object] of Object.entries(scene.staging?.objects ?? {})) {
      placements[id] = {at: stagePoint([object.at[0], object.at[1]], scene.staging, video), scale: object.scale};
    }
  }
  return placements;
}

function compiledStateTracks(compiled: PerformanceManifest, actorId: string, fps: number): {
  placements: PerformancePlacementKey[];
  expressions: PerformanceExpressionKey[];
  presents: PerformancePresenceKey[];
  poses: PerformanceStateKey[];
} {
  const placements: PerformancePlacementKey[] = [];
  const expressions: PerformanceExpressionKey[] = [];
  const presents: PerformancePresenceKey[] = [];
  const poses: PerformanceStateKey[] = [];
  for (const scene of compiled.sceneTrack ?? []) {
    const state = scene.initial?.actors?.[actorId];
    if (!state) continue;
    const frame = Math.round(scene.start * fps);
    const staged = scene.staging?.actors?.[actorId];
    if (staged) {
      const video = compiled.video ?? {width: 1920, height: 1080};
      placements.push({frame, placement: {at: stagePoint([staged.at[0], staged.at[1]], scene.staging, video), scale: stageScale(staged.scale, scene.staging, video), flip: staged.flip, z: staged.z}});
    }
    else if (state.placement !== undefined) placements.push({frame, placement: state.placement as PerformancePlacement | SemanticPlacement | string});
    presents.push({frame, present: state.present});
    poses.push({frame, value: state.pose});
    if (state.face) expressions.push({frame, expression: state.face});
  }
  return {placements, expressions, presents, poses};
}

/** Declared placement data (base line + support surfaces) for a resolved prop. */
function propPlacementOf(asset: UnknownRecord | undefined): {base: number; size: [number, number]; supports: Array<{name: string; x: [number, number]; y: number}>; body?: [number, number, number, number]} | undefined {
  // For objects, resolvedAssetForInstance already returns the resolved
  // content — the placement lives directly on it.
  const resolved = asRecord(asset) ?? {};
  return resolved.placement as {base: number; size: [number, number]; supports: Array<{name: string; x: [number, number]; y: number}>; body?: [number, number, number, number]} | undefined;
}

/** The declared skeleton for a resolved figure asset, if any. */
function skeletonOf(asset: UnknownRecord | undefined): Skeleton | undefined {
  // resolvedAssetForInstance already unwraps to the resolved content.
  return asRecord(asset)?.skeleton as Skeleton | undefined;
}

function projectCompiledActors(compiled: PerformanceManifest, assets: UnknownRecord, fps: number): PerformanceActor[] {
  const actorAssets = asRecord(assets.actors);
  return Object.keys(actorAssets ?? {}).map((id) => {
    const asset = resolvedAssetForInstance(assets, "actors", id);
    const stateTracks = compiledStateTracks(compiled, id, fps);
    const expressions = [...stateTracks.expressions];
    const tracks: PerformanceGenericTrack[] = [];
    for (const event of compiled.performanceTracks?.find((track) => track.subject === id)?.events ?? []) {
      if (event.kind === "speech") {
        tracks.push({kind: "speech", events: [{frame: Math.round(event.start * fps), endFrame: Math.round(event.end * fps), text: event.text, speed: event.speed, ...(event.boundaries ? {boundaries: event.boundaries} : {}), ...(event.mouth ? {mouth: event.mouth} : {})}]});
        continue;
      }
      if (event.kind !== "call") continue;
      const start = Math.round(event.start * fps);
      const performance = asRecord(event.performance);
      for (const track of (event.tracks ?? []) as Array<{kind?: string; target?: string; events?: UnknownRecord[]}>) {
        if (!track.kind || !Array.isArray(track.events)) continue;
        tracks.push({
          kind: track.kind as PerformanceGenericTrack["kind"],
          ...(track.target ? {target: track.target} : {}),
          events: track.events.map((item) => ({...item, frame: start + Math.round(numberOr(item.at as number | undefined, 0) * fps), durationFrames: Math.max(1, Math.round(numberOr(item.duration as number | undefined, event.end - event.start) * fps))})),
        });
        if (track.kind === "expression") {
          for (const item of track.events) {
            if ((asRecord(item.value) ?? item).transient === true) continue;
            expressions.push({frame: start + Math.round(numberOr(item.at as number | undefined, 0) * fps), expression: (item.value ?? item) as PerformanceExpression});
          }
        }
      }
    }
    const visual = assetVisual(asset);
    return {
      id,
      placement: stateTracks.placements[0]?.placement,
      anchors: assetAnchors(asset),
      ...(skeletonOf(asset) === undefined ? {} : {skeleton: skeletonOf(asset)}),
      ...(asset?.artwork === undefined ? {} : {artwork: asset.artwork as FigureArtwork}),
      ...(stateTracks.placements.length ? {placementTrack: stateTracks.placements} : {}),
      ...(expressions.length ? {expressionTrack: expressions} : {}),
      ...(tracks.length ? {tracks} : {}),
      presentTrack: stateTracks.presents,
      poseTrack: stateTracks.poses,
      ...(visual.src ? {src: visual.src} : {}),
      ...(visual.width ? {width: visual.width} : {}),
      ...(visual.height ? {height: visual.height} : {}),
    };
  });
}

function projectCompiledProps(compiled: PerformanceManifest, assets: UnknownRecord): PerformanceProp[] {
  const objectAssets = asRecord(assets.objects);
  const video = compiled.video ?? {width: 1920, height: 1080};
  return Object.keys(objectAssets ?? {}).map((id) => {
    const asset = resolvedAssetForInstance(assets, "objects", id);
    const visual = assetVisual(asset);
    const initial = compiled.sceneTrack?.find((scene) => scene.initial?.props?.[id])?.initial.props[id];
    // Placement may be a mark name ("desk"), a placement object, or absent —
    // never spread a raw string (its characters/prototype leak into the prop).
    const rawPlacement = initial?.placement as unknown;
    const marks = (compiled.placements ?? compiled.marks) as Record<string, {at?: [number, number]; scale?: number} | undefined> | undefined;
    const markAt = typeof rawPlacement === "string" ? marks?.[rawPlacement]?.at : undefined;
    const placementRecord = typeof rawPlacement === "object" && rawPlacement !== null ? rawPlacement as {at?: [number, number]} : undefined;
    // Scene staging is the plugin-pipeline placement source (normalized
    // coordinates); without it props would be invisible.
    const staged = compiled.sceneTrack
      ?.map((scene) => scene.staging?.objects?.[id])
      .find((object) => object !== undefined) as {at: readonly number[]; scale: number; z?: number; relation?: string} | undefined;
    const at = staged ? stagePoint([Number(staged.at[0]), Number(staged.at[1])], compiled.sceneTrack?.[0]?.staging ?? {}, video) : (placementRecord?.at ?? markAt);
    const placement = propPlacementOf(asset);
    return {
      id,
      // Declared art size wins; procedural props default to their 200x160 box.
      size: (placement?.size ?? visual.size ?? (visual.width !== undefined && visual.height !== undefined ? [visual.width, visual.height] : [200, 160])) as [number, number],
      ...(at ? {at, x: at[0], y: at[1]} : {}),
      ...(propPlacementOf(asset) === undefined ? {} : {base: propPlacementOf(asset)!.base, supports: propPlacementOf(asset)!.supports, body: propPlacementOf(asset)!.body}),
      ...(placementRecord ?? {}),
      ...(staged ? {scale: staged.scale, z: staged.z ?? 30, label: staged.relation ? `${id} (${staged.relation})` : id} : {}),
      // The declared ASSET identity decides which art a prop draws. The
      // instance id cannot: an episode may name a scroll "register" and a desk
      // "table", and keying art off the instance silently drew the generic
      // placeholder card instead of the authored artwork.
      src: visual.src ?? (typeof asset?.identity === "string" ? asset.identity : undefined) ?? (typeof asset?.ref === "string" ? asset.ref : undefined),
    } satisfies PerformanceProp;
  });
}

function projectCompiledPerformance(compiled: PerformanceManifest, fps: number): Partial<PerformanceManifest> {
  const assets = asRecord(compiled.assets) ?? {};
  const subtitles: PerformanceSubtitle[] = [];
  const genericTracks: PerformanceGenericTrack[] = [];
  const camera: PerformanceCameraKey[] = [];
  let speechId = 0;
  for (const track of compiled.performanceTracks ?? []) {
    for (const event of track.events) {
      const startFrame = Math.round(event.start * fps);
      const endFrame = Math.round(event.end * fps);
      if (event.kind === "speech") {
        subtitles.push({id: `speech-${speechId++}`, startFrame, endFrame, text: event.text});
        genericTracks.push({kind: "speech", subject: track.subject, events: [{frame: startFrame, endFrame, text: event.text, speed: event.speed, ...(event.boundaries ? {boundaries: event.boundaries} : {})}]});
        continue;
      }
      const performance = asRecord(event.performance);
      for (const recipeTrack of (event.tracks ?? []) as Array<{kind?: string; target?: string; events?: UnknownRecord[]}>) {
        if (!recipeTrack.kind || !Array.isArray(recipeTrack.events)) continue;
        genericTracks.push({
          kind: recipeTrack.kind as PerformanceGenericTrack["kind"],
          subject: track.subject,
          ...(recipeTrack.target ? {target: recipeTrack.target} : {}),
          events: recipeTrack.events.map((item) => ({...item, frame: startFrame + Math.round(numberOr(item.at as number | undefined, 0) * fps), durationFrames: Math.max(1, Math.round(numberOr(item.duration as number | undefined, event.end - event.start) * fps))})),
        });
      }
      if (!event.tracks?.length && performance) {
        const kind = track.kind === "actor" ? "lifecycle" : track.subject === "camera" ? "camera" : track.subject === "vfx" ? "vfx" : "sfx";
        genericTracks.push({kind, subject: track.subject, events: [{frame: startFrame, endFrame, value: performance}]});
      }
      if (track.subject === "camera" && performance?.camera) {
        const value = asRecord(performance.camera);
        if (value) camera.push({frame: startFrame, ...value as PerformanceCameraKey});
      }
    }
  }
  const constraints = (compiled.bindingConstraints ?? []).map((binding) => ({
    object: binding.object,
    prop: binding.object,
    holder: binding.holder,
    actor: binding.holder,
    hand: "hand_r",
    startFrame: Math.round((binding.start ?? 0) * fps),
    endFrame: Math.round((binding.end ?? compiled.totalDuration ?? 0) * fps),
    sceneId: binding.sceneId,
    continuous: binding.continuous,
  }));
  const actors = projectCompiledActors(compiled, assets, fps);
  for (const scene of compiled.sceneTrack ?? []) {
    const staged = scene.staging?.camera;
    if (!staged) continue;
    const center = stagePoint([staged.center[0], staged.center[1]], scene.staging, compiled.video ?? CANVAS);
    const video = compiled.video ?? CANVAS;
    const fit = Math.min(video.width / CANVAS.width, video.height / CANVAS.height);
    const focused = staged.framing === "focus";
    const cameraCenter: [number, number] = focused ? center : [CANVAS.width / 2, CANVAS.height / 2];
    const focus = focused ? fitCameraToActors(center, actors as unknown as EvaluatedActor[], Math.max(fit, staged.zoom), video) : undefined;
    const zoom = focus?.zoom ?? fit * staged.zoom;
    const finalCenter = focus?.center ?? cameraCenter;
    camera.push({frame: Math.round(scene.start * fps), x: finalCenter[0] - video.width / (2 * zoom), y: finalCenter[1] - video.height / (2 * zoom), z: zoom});
  }
  return {
    timebase: "frames",
    placements: compiledPlacements(compiled, assets),
    actors,
    props: projectCompiledProps(compiled, assets),
    subtitles,
    camera,
    tracks: genericTracks,
    constraints,
    durationInFrames: Math.round((compiled.totalDuration ?? 0) * fps),
  };
}

/** Normalize alternate compiled time fields once at the composition boundary. */
export function normalizePerformanceManifest(manifest: PerformanceManifest): PerformanceManifest {
  const video = manifest.video ?? {width: 1920, height: 1080, fps: 24};
  const fps = video.fps;
  const projected = isCompiledEpisode(manifest) ? projectCompiledPerformance(manifest, fps) : {};
  const source = {...manifest, ...projected, video, timebase: projected.timebase ?? manifest.timebase};
  const toFrames = (value: number | undefined): number | undefined =>
    value === undefined ? undefined : source.timebase === "seconds" ? Math.round(value * fps) : value;
  const cameraValue = source.camera ?? source.cameraTrack;
  const camera = Array.isArray(cameraValue) ? cameraValue : cameraValue?.keys;
  return {
    ...source,
    video,
    durationInFrames: source.durationInFrames ?? toFrames(source.duration ?? source.total),
    actors: (source.actors ?? []).map((actor) => ({
      ...actor,
      tracks: actor.tracks,
      expressionTrack: (actor.expressionTrack ?? actor.expressions)?.map((key) => ({ ...key, frame: frameOf(key) })),
      gestureTrack: (actor.gestureTrack ?? actor.gestures)?.map((key) => ({ ...key, frame: frameOf(key) })),
      presentTrack: actor.presentTrack?.map((key) => ({...key, frame: frameOf(key)})),
      poseTrack: actor.poseTrack?.map((key) => ({...key, frame: frameOf(key)})),
      placementTrack: actor.placementTrack?.map((key) => ({...key, frame: frameOf(key)})),
    })),
    camera: camera?.map((key) => ({ ...key, frame: frameOf(key) })),
    props: (source.props ?? source.objects)?.map((prop) => ({
      ...prop,
      positionTrack: prop.positionTrack?.map((key) => ({ ...key, frame: frameOf(key) })),
    })),
    subtitles: (source.subtitles ?? source.subtitleTrack ?? source.captions)?.map((cue) => ({
      ...cue,
      startFrame: cue.startFrame ?? toFrames(cue.start),
      endFrame: cue.endFrame ?? toFrames(cue.end),
    })),
    vfx: (source.vfx ?? source.effects)?.map((effect) => ({
      ...effect,
      startFrame: effect.startFrame ?? toFrames(effect.start ?? effect.at),
      endFrame: effect.endFrame ?? toFrames(effect.end),
    })),
  };
}

export function gestureProgress(key: PerformanceGestureKey, frame: number): number {
  const start = frameOf(key);
  const end = gestureEnd(key, start);
  return end <= start ? 1 : clamp01((frame - start) / (end - start));
}
