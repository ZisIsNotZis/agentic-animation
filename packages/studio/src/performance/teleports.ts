import { evaluatePerformance } from "./evaluate";
import { normalizePerformanceManifest, } from "./evaluate";
import type { PerformanceManifest } from "./types";
import {solveActorFigure} from "../components/performance/actorPose";
import {designHandToWorld} from "../components/performance/reach";
import {actorTurn, rotateAboutPivot, rotatePoint} from "./actorTurn";

export interface TeleportWarning {
  actor: string;
  /** The frame at which the displaced position is first visible. */
  frame: number;
  from: [number, number];
  to: [number, number];
  distance: number;
}

/**
 * Shift-left defect detection: flag actors whose visible position jumps
 * implausibly far between consecutive rendered frames (a "teleport"), which
 * almost always means a movement/transform track targeted the wrong subject.
 *
 * Positions can only change at track-event boundaries, so sampling the full
 * evaluation at those boundaries is exact without evaluating every frame.
 */
export function detectTeleports(
  manifest: PerformanceManifest,
  options: { threshold?: number } = {},
): TeleportWarning[] {
  const threshold = options.threshold ?? 260;
  const normalized = normalizePerformanceManifest({ ...manifest, timebase: manifest.timebase ?? "seconds" });
  const totalFrames = normalized.durationInFrames ?? 0;
  if (totalFrames <= 0) return [];

  // Candidate frames: every transform/movement/placement event boundary, the
  // frame right after it, and interior samples across each event span — so
  // eased displacements read as gradual steps, while instant repositioning
  // (a real teleport) still shows as one large jump between candidates.
  const candidates = new Set<number>([0]);
  for (const track of normalized.actors ?? []) {
    for (const key of track.placementTrack ?? []) candidates.add(Math.max(0, Math.floor(Number(key.frame) || 0)));
    for (const trackItem of track.tracks ?? []) {
      if (trackItem.kind !== "transform" && trackItem.kind !== "movement") continue;
      for (const event of trackItem.events ?? []) {
        const start = Math.max(0, Math.floor(Number(event.frame) || 0));
        const span = Math.max(0, Math.floor(Number(event.durationFrames) || 0));
        candidates.add(start);
        candidates.add(start + 1);
        for (let step = 1; step < 8; step++) candidates.add(Math.min(totalFrames, start + Math.round((span * step) / 8)));
        candidates.add(Math.min(totalFrames, start + span));
      }
    }
  }
  const frames = [...candidates].filter((frame) => frame <= totalFrames).sort((a, b) => a - b);
  if (frames.length < 2) return [];

  const positions = new Map<number, Map<string, [number, number]>>();
  for (const frame of frames) {
    const state = evaluatePerformance(manifest, frame);
    const map = new Map<string, [number, number]>();
    for (const actor of state.actors) {
      if (actor.present) map.set(actor.id, [actor.x, actor.y]);
    }
    positions.set(frame, map);
  }

  const warnings: TeleportWarning[] = [];
  const reported = new Set<string>();
  for (let index = 1; index < frames.length; index++) {
    const before = positions.get(frames[index - 1]!)!;
    const after = positions.get(frames[index]!)!;
    for (const [actor, to] of after) {
      const from = before.get(actor);
      if (!from) continue;
      const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
      if (distance > threshold) {
        const key = `${actor}:${frames[index]!}`;
        if (!reported.has(key)) {
          reported.add(key);
          warnings.push({actor, frame: frames[index]!, from, to, distance: Math.round(distance)});
        }
      }
    }
  }
  return warnings;
}

/** Human-readable one-line warnings for check/make output. */
export function describeTeleports(warnings: TeleportWarning[]): string[] {
  return warnings.map((warning) =>
    `teleport warning: actor "${warning.actor}" jumps ${warning.distance}px at frame ${warning.frame} (${Math.round(warning.from[0])},${Math.round(warning.from[1])} -> ${Math.round(warning.to[0])},${Math.round(warning.to[1])}) — a movement/transform track probably targets the wrong subject`,
  );
}

export interface CameraOverflowWarning {
  frame: number;
  x: number;
  y: number;
  z: number;
  overflow: string;
}

/**
 * Shift-left check: a camera key whose viewport would leave the painted
 * 1920x1080 background. The renderer clamps at evaluation time, so this never
 * reaches the video — the warning exists so authors fix the intent instead.
 */
export function detectCameraOverflows(
  manifest: PerformanceManifest,
  options: {margin?: number} = {},
): CameraOverflowWarning[] {
  const margin = options.margin ?? 2;
  const normalized = normalizePerformanceManifest({...manifest, timebase: manifest.timebase ?? "seconds"});
  const video = normalized.video ?? {width: 1280, height: 720};
  const keys = Array.isArray(normalized.camera) ? normalized.camera : normalized.camera?.keys ?? [];
  const warnings: CameraOverflowWarning[] = [];
  for (const key of keys) {
    const z = key.z ?? 1;
    const viewportWidth = video.width / z;
    const viewportHeight = video.height / z;
    const x = key.x ?? 0;
    const y = key.y ?? 0;
    const problems: string[] = [];
    if (x < -margin) problems.push(`left edge at ${Math.round(x)}px`);
    if (y < -margin) problems.push(`top edge at ${Math.round(y)}px`);
    if (x + viewportWidth > 1920 + margin) problems.push(`right edge at ${Math.round(x + viewportWidth)}px > 1920`);
    if (y + viewportHeight > 1080 + margin) problems.push(`bottom edge at ${Math.round(y + viewportHeight)}px > 1080`);
    if (problems.length) warnings.push({frame: key.frame ?? 0, x, y, z, overflow: problems.join("; ")});
  }
  return warnings;
}

export function describeCameraOverflows(warnings: CameraOverflowWarning[]): string[] {
  return warnings.map((warning) =>
    `camera overflow warning: key at frame ${warning.frame} (z=${warning.z.toFixed(2)}, viewport top-left ${Math.round(warning.x)},${Math.round(warning.y)}) leaves the background: ${warning.overflow} — the renderer clamps, but fix the camera intent`,
  );
}

export interface PropDiscontinuityWarning {
  frame: number;
  id: string;
  from: [number, number];
  to: [number, number];
  delta: number;
  metric?: "angle";
}

/** Per-frame visible FK/contact continuity, in stage pixels and degrees.
 * Mirrored snaps remain defects: no actor flip suppresses another object's jump.
 * Thresholds are diagnostics, not a substitute for rendered contact acceptance. */
export function detectPropDiscontinuities(
  manifest: PerformanceManifest,
  options: {threshold?: number; angleThreshold?: number} = {},
): PropDiscontinuityWarning[] {
  const threshold = options.threshold ?? 30;
  const angleThreshold = options.angleThreshold ?? 35;
  const normalized = normalizePerformanceManifest({...manifest, timebase: manifest.timebase ?? "seconds"});
  const fps = normalized.video?.fps ?? 24;
  const frames = normalized.durationInFrames ?? Math.round((normalized.totalDuration ?? 0) * fps);
  const warnings: PropDiscontinuityWarning[] = [];
  type Sample = {point: [number, number]; metric?: "angle"; turn?: string};
  let previous = new Map<string, Sample>();
  // The body frame each joint was drawn in last frame: turning about its pivot
  // is rigid, so a joint's own travel is measured after the current rotation is
  // removed, and only posture change counts as a jump (slice B).
  let previousTurn = new Map<string, {pivot: [number, number]; rotation: number}>();
  for (let frame = 0; frame < frames; frame++) {
    const state = evaluatePerformance(normalized, frame);
    const current = new Map<string, Sample>();
    const turns = new Map<string, {pivot: [number, number]; rotation: number}>();
    for (const actor of state.actors) {
      if (!actor.present) continue;
      current.set(actor.id, {point: [actor.x, actor.y]});
      current.set(`${actor.id}.rotation`, {point: [actor.rotation, 0], metric: "angle"});
      const figure = solveActorFigure(actor);
      if (!figure.solved) continue;
      const turn = actorTurn(actor);
      // The drawn rotation, signed by the mirror: a flipped body turns the
      // other way on screen, so its spin is measured the way it is drawn.
      const rot = actor.rotation * (figure.flipped ? -1 : 1);
      turns.set(actor.id, {pivot: turn.pivot, rotation: rot});
      const joints = new Map<string, [number, number]>();
      for (const [name, joint] of Object.entries(figure.solved.joints)) {
        const world = designHandToWorld(actor, joint, figure.space, actor.artwork ? figure.flipped : false);
        const r = rot * Math.PI / 180;
        const dx = world[0] - turn.pivot[0], dy = world[1] - turn.pivot[1];
        const point: [number, number] = [turn.pivot[0] + dx * Math.cos(r) - dy * Math.sin(r), turn.pivot[1] + dx * Math.sin(r) + dy * Math.cos(r)];
        joints.set(name, point);
        current.set(`${actor.id}.${name}`, {point, turn: actor.id});
      }
      // Segment directions expose abrupt IK branch/angle changes even when a
      // short limb's positional displacement is below the pixel threshold.
      for (const side of ["l", "r"]) for (const [a, b] of [[`shoulder_${side}`, `elbow_${side}`], [`elbow_${side}`, `hand_${side}`], [`hip_${side}`, `knee_${side}`], [`knee_${side}`, `foot_${side}`]]) {
        const from = joints.get(a!), to = joints.get(b!);
        if (from && to) current.set(`${actor.id}.${a}-${b}.angle`, {point: [Math.atan2(to[1]-from[1], to[0]-from[0])*180/Math.PI, 0], metric: "angle", turn: actor.id});
      }
    }
    for (const prop of state.props) {
      current.set(prop.id, {point: [prop.x, prop.y]});
      current.set(`${prop.id}.rotation`, {point: [prop.rotation, 0], metric: "angle"});
    }
    for (const [id, at] of current) {
      const before = previous.get(id);
      if (!before) continue;
      // Rotation-aware continuity: a body turning rigidly about its pivot is
      // not a joint discontinuity. Both samples are measured in the body frame
      // (each un-rotated about its own pivot by its own rotation), so what is
      // left is the body's own posture change — the same measure a standing
      // body gets. The rotation keeps its own gate (35deg), not an exemption.
      const turn = at.turn ? turns.get(at.turn) : undefined;
      const oldTurn = at.turn ? previousTurn.get(at.turn) : undefined;
      const spin = turn && oldTurn ? turn.rotation - oldTurn.rotation : 0;
      const bodyFrame = (point: [number, number], frameTurn: typeof turn): [number, number] =>
        frameTurn && frameTurn.rotation !== 0 ? rotatePoint(frameTurn.pivot, point, -frameTurn.rotation) : point;
      const delta = at.metric === "angle"
        ? Math.abs(((at.point[0] - before.point[0] - spin + 540) % 360 + 360) % 360 - 180)
        : (() => {
          const fromBody = bodyFrame(before.point, oldTurn);
          const toBody = bodyFrame(at.point, turn);
          return Math.hypot(toBody[0] - fromBody[0], toBody[1] - fromBody[1]);
        })();
      if (delta > (at.metric === "angle" ? angleThreshold : threshold)) warnings.push({frame, id, from: before.point, to: at.point, delta, ...(at.metric ? {metric: at.metric} : {})});
    }
    previous = current;
    previousTurn = turns;
  }
  return warnings;
}

export function describePropDiscontinuities(warnings: PropDiscontinuityWarning[]): string[] {
  return warnings.map((warning) => warning.metric === "angle"
    ? `sudden-move warning: ${warning.id} turns ${Math.round(warning.delta)}deg at frame ${warning.frame} (${Math.round(warning.from[0])} -> ${Math.round(warning.to[0])}deg) — joints and objects must turn continuously`
    : `sudden-move warning: ${warning.id} jumps ${Math.round(warning.delta)}px at frame ${warning.frame} (${Math.round(warning.from[0])},${Math.round(warning.from[1])} -> ${Math.round(warning.to[0])},${Math.round(warning.to[1])}) — objects must move continuously`,
  );
}
