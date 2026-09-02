// action.bow — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8999999999999999;

export function bow(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.3, phase: "prepare", action: "draw feet together and lengthen spine", parts: ["torso","head","arm_u_l","arm_u_r"] }, { at: 0.3, duration: 0.3, phase: "bow", action: "hinge from the hips with eyes down", parts: ["torso","head","arm_u_l","arm_u_r"] }, { at: 0.6, duration: 0.3, phase: "rise", action: "return to the audience with dignity", parts: ["torso","head","arm_u_l","arm_u_r"] }]);
      yield D;
    },
  };
}

export default bow;
