// action.laugh — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8;

export function laugh(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.26666666666666666, phase: "spark", action: "smile arrives before the sound", parts: ["head","torso","arm_u_l","arm_u_r"] }, { at: 0.26666666666666666, duration: 0.26666666666666666, phase: "laugh", action: "bounce shoulders and open the chest", parts: ["head","torso","arm_u_l","arm_u_r"] }, { at: 0.5333333333333333, duration: 0.26666666666666666, phase: "settle", action: "wipe the laugh into a grin", parts: ["head","torso","arm_u_l","arm_u_r"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.8, phase: "spark", name: "amused", emotion: "amused", brow: "relaxed", eyes: "crinkled", mouth: "open-smile", intensity: 0.88 }]);
      track(world, "sfx", undefined, [{ at: 0.26666666666666666, duration: 0.5, cue: "laugh", kind: "sfx", gain: 0.3, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default laugh;
