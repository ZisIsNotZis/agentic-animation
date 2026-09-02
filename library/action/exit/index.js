// action.exit — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1;

export function exit(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.3333333333333333, phase: "decide", action: "turn attention away", parts: ["head","torso","leg_u_l","leg_u_r"] }, { at: 0.3333333333333333, duration: 0.3333333333333333, phase: "turn", action: "rotate the torso toward the exit", parts: ["head","torso","leg_u_l","leg_u_r"] }, { at: 0.6666666666666666, duration: 0.3333333333333333, phase: "depart", action: "take two clean steps out", parts: ["head","torso","leg_u_l","leg_u_r"] }]);
      track(world, "lifecycle", undefined, [{ at: 0, duration: 1, present: false, subject: subject.id, operation: "state" }]);
      yield D;
    },
  };
}
