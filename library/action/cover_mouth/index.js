// action.cover_mouth — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function cover_mouth(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.21666666666666667, phase: "notice", action: "eyes catch the target's reaction", parts: ["arm_u_l","arm_l_l","hand_l","head"], target: target.id }, { at: 0.21666666666666667, duration: 0.21666666666666667, phase: "cover", action: "bring palm to mouth", parts: ["arm_u_l","arm_l_l","hand_l","head"], target: target.id }, { at: 0.43333333333333335, duration: 0.21666666666666667, phase: "peek", action: "look past the hand", parts: ["arm_u_l","arm_l_l","hand_l","head"], target: target.id }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.65, phase: "notice", name: "suppressed", emotion: "suppressed", brow: "raised", eyes: "bright", mouth: "covered", intensity: 0.7 }]);
      yield D;
    },
  };
}
