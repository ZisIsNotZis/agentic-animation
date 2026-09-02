// action.count_three — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8999999999999999;

export function count_three(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.3, phase: "one", action: "raise the index finger", parts: ["arm_u_r","arm_l_r","hand_r"] }, { at: 0.3, duration: 0.3, phase: "two", action: "add the middle finger", parts: ["arm_u_r","arm_l_r","hand_r"] }, { at: 0.6, duration: 0.3, phase: "three", action: "add the ring finger and present the count", parts: ["arm_u_r","arm_l_r","hand_r"] }]);
      yield D;
    },
  };
}

export default count_three;
