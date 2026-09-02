// action.check_watch — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.75;

export function check_watch(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.25, phase: "lift", action: "bring the wrist into view", parts: ["arm_u_l","arm_l_l","hand_l","head"] }, { at: 0.25, duration: 0.25, phase: "read", action: "drop gaze to the watch", parts: ["arm_u_l","arm_l_l","hand_l","head"] }, { at: 0.5, duration: 0.25, phase: "decide", action: "look up with a time-conscious beat", parts: ["arm_u_l","arm_l_l","hand_l","head"] }]);
      yield D;
    },
  };
}

export default check_watch;
