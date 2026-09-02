// effect.lights_up — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.9333333333333332;

export function lights_up() {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "vfx", undefined, [{ at: 0.2333333333333333, duration: 0.7, effect: "lighting-rise", style: "lighting-rise", intensity: 0.9, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.2333333333333333, duration: 0.22, cue: "power-up", kind: "sfx", gain: 0.35, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default lights_up;
