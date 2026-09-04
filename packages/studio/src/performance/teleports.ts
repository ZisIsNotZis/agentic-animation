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
