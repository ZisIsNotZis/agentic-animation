// effect.screen_error — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.9666666666666666;

export function screen_error(target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "vfx", target.id, [{ at: 0.26666666666666666, duration: 0.7, effect: "screen-error-red", style: "screen-error-red", target: target.id, intensity: 0.88, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.26666666666666666, duration: 0.35, cue: "error-chime", kind: "sfx", gain: 0.65, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default screen_error;
