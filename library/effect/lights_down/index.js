// effect.lights_down — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.9333333333333332;

export function lights_down() {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "vfx", undefined, [{ at: 0.2333333333333333, duration: 0.7, effect: "lighting-dim", style: "lighting-dim", intensity: 0.9, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.2333333333333333, duration: 0.25, cue: "power-down", kind: "sfx", gain: 0.42, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default lights_down;
