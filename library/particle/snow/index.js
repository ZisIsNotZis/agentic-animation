// particle.snow — deterministic ambient snowfall layered over the scene
// (docs/WORLD_PLUGIN_CONTRACT.md). Non-blocking: the timeline keeps moving
// while the particles fall; the overlay lives for its declared duration.
import { track } from "@anim/core/stdlib";

const DEFAULT_COUNT = 90;
const DEFAULT_DURATION = 6;

function clamp(value, lo, hi) {
  return Math.min(hi, Math.max(lo, value));
}

export function snow(options = {}) {
  const duration = clamp(Number(options.durationSec) || DEFAULT_DURATION, 0.5, 30);
  const count = Math.round(clamp(Number(options.count) || DEFAULT_COUNT, 1, 400));
  const intensity = clamp(Number(options.intensity ?? 1), 0.1, 2);
  const seed = Math.round(clamp(Number(options.seed) || 1, 1, 9999));
  return {
    durationSec: duration,
    mode: "nonblock",
    *run(world) {
      track(world, "vfx", undefined, [{ at: 0, duration, effect: "snow", style: "particle-snow", intensity, count, seed, operation: "apply" }]);
      yield duration;
    },
  };
}

export default snow;
