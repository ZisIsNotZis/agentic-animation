// sound.error_burst — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.675;

export function error_burst() {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "vfx", undefined, [{ at: 0.225, duration: 0.28, effect: "manga-error-rays", style: "manga-error-rays", intensity: 0.72, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.225, duration: 0.45, cue: "error-burst", kind: "sfx", gain: 0.85, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default error_burst;
