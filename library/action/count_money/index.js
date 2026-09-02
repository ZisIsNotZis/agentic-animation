// action.count_money — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1.1;

export function count_money(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.3666666666666667, phase: "fan", action: "spread the stack between both hands", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","hand_r","head"] }, { at: 0.3666666666666667, duration: 0.3666666666666667, phase: "count", action: "flick one bill at a time with the thumb", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","hand_r","head"] }, { at: 0.7333333333333334, duration: 0.3666666666666667, phase: "pocket", action: "square the stack and guard it", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","hand_r","head"] }]);
      yield D;
    },
  };
}

export default count_money;
