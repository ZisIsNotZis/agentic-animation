// action.count_two — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.7;

export function count_two(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.35, phase: "one", action: "raise the index finger", parts: ["arm_u_r","arm_l_r","hand_r"] }, { at: 0.35, duration: 0.35, phase: "two", action: "add the middle finger and hold the count", parts: ["arm_u_r","arm_l_r","hand_r"] }]);
      yield D;
    },
  };
}

export default count_two;
