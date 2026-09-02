// action.point — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function point(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.21666666666666667, phase: "aim", action: "turn head toward the target", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }, { at: 0.21666666666666667, duration: 0.21666666666666667, phase: "point", action: "extend one finger with a clean line", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }, { at: 0.43333333333333335, duration: 0.21666666666666667, phase: "hold", action: "keep the accusation readable", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }]);
      track(world, "gaze", target.id, [{ at: 0, duration: 0.65, phase: "aim", target: target.id, lead: "head", hold: 0.35 }]);
      yield D;
    },
  };
}
