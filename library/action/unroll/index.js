// action.unroll — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1.1;

export function unroll(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.3666666666666667, phase: "grip", action: "catch both ends of the roll", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","arm_l_r","hand_r","torso"], target: target.id }, { at: 0.3666666666666667, duration: 0.3666666666666667, phase: "unroll", action: "draw hands apart in one continuous sweep", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","arm_l_r","hand_r","torso"], target: target.id }, { at: 0.7333333333333334, duration: 0.3666666666666667, phase: "flatten", action: "press the far edge flat", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","arm_l_r","hand_r","torso"], target: target.id }]);
      track(world, "sfx", undefined, [{ at: 0.3666666666666667, duration: 0.7, cue: "paper-unroll", kind: "sfx", gain: 0.65, loop: false, operation: "play" }]);
      yield D;
    },
  };
}
