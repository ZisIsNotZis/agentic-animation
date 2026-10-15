import { evaluatePerformance } from "./evaluate";
import { normalizePerformanceManifest, } from "./evaluate";
import type { PerformanceManifest } from "./types";

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
}

/**
 * Shift-left check: a prop or actor that jumps more than `threshold` px in a
 * single frame. Real objects move continuously — a jump means something
 * teleported (a snap placement, a missing approach). Cheap: pure manifest
 * evaluation, no rendering.
 */
export function detectPropDiscontinuities(
  manifest: PerformanceManifest,
  options: {threshold?: number} = {},
): PropDiscontinuityWarning[] {
  const threshold = options.threshold ?? 60;
  const normalized = normalizePerformanceManifest({...manifest, timebase: manifest.timebase ?? "seconds"});
  const fps = normalized.video?.fps ?? 24;
  const frames = normalized.durationInFrames ?? Math.round((normalized.totalDuration ?? 0) * fps);
  const warnings: PropDiscontinuityWarning[] = [];
  let previous = new Map<string, {x: number; y: number}>();
  let previousFlips = new Map<string, boolean>();
  for (let frame = 0; frame < frames; frame++) {
    const state = evaluatePerformance(normalized, frame);
    const current = new Map<string, {x: number; y: number}>();
    let flipped = false;
    for (const actor of state.actors) {
      current.set(actor.id, {x: actor.x, y: actor.y});
      if (previous.has(actor.id) && previousFlips.get(actor.id) !== actor.flip) flipped = true;
    }
    for (const prop of state.props) current.set(prop.id, {x: prop.x, y: prop.y});
    const previousFlipsNow = new Map(state.actors.map((actor) => [actor.id, actor.flip]));
    for (const [id, at] of current) {
      const before = previous.get(id);
      if (!before) continue;
      const delta = Math.hypot(at.x - before.x, at.y - before.y);
      // A holder turning around swings its hand anchor to the mirrored side —
      // a rig artifact, not a teleport.
      if (delta > threshold && !flipped) warnings.push({frame, id, from: [before.x, before.y], to: [at.x, at.y], delta});
    }
    previous = current;
    previousFlips = previousFlipsNow;
  }
  return warnings;
}

export function describePropDiscontinuities(warnings: PropDiscontinuityWarning[]): string[] {
  return warnings.map((warning) =>
    `sudden-move warning: ${warning.id} jumps ${Math.round(warning.delta)}px at frame ${warning.frame} (${Math.round(warning.from[0])},${Math.round(warning.from[1])} -> ${Math.round(warning.to[0])},${Math.round(warning.to[1])}) — objects must move continuously`,
  );
}
