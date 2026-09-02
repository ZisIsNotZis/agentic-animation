// action.touch_hair — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.75;

export function touch_hair(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.25, phase: "reach", action: "hand rises to the hairline", parts: ["arm_u_r","arm_l_r","hand_r","head"] }, { at: 0.25, duration: 0.25, phase: "smooth", action: "fingers make one deliberate pass", parts: ["arm_u_r","arm_l_r","hand_r","head"] }, { at: 0.5, duration: 0.25, phase: "answer", action: "hand drops as eye contact returns", parts: ["arm_u_r","arm_l_r","hand_r","head"] }]);
      yield D;
    },
  };
}
