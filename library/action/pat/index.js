// action.pat — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8;

export function pat(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.26666666666666666, phase: "approach", action: "reach toward the target's shoulder", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }, { at: 0.26666666666666666, duration: 0.26666666666666666, phase: "pat", action: "land two light reassuring taps", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }, { at: 0.5333333333333333, duration: 0.26666666666666666, phase: "reassure", action: "leave the hand warm before withdrawing", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }]);
      yield D;
    },
  };
}

export default pat;
