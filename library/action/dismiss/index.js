// action.dismiss — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function dismiss(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.21666666666666667, phase: "load", action: "draw elbow beside the torso", parts: ["arm_u_r","arm_l_r","hand_r"] }, { at: 0.21666666666666667, duration: 0.21666666666666667, phase: "wave", action: "cut the hand outward twice", parts: ["arm_u_r","arm_l_r","hand_r"] }, { at: 0.43333333333333335, duration: 0.21666666666666667, phase: "drop", action: "return to neutral without discussion", parts: ["arm_u_r","arm_l_r","hand_r"] }]);
      yield D;
    },
  };
}
