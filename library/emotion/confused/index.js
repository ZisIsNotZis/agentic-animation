// emotion.confused — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.55;

export function confused(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.18333333333333335, phase: "notice", action: "pause the blink and lift one brow", parts: ["head","arm_u_l"] }, { at: 0.18333333333333335, duration: 0.18333333333333335, phase: "search", action: "cant the head while eyes scan", parts: ["head","arm_u_l"] }, { at: 0.3666666666666667, duration: 0.18333333333333335, phase: "hold", action: "leave the question unresolved", parts: ["head","arm_u_l"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.55, phase: "notice", name: "confused", emotion: "confused", brow: "asymmetric-raised", eyes: "searching", mouth: "parted", intensity: 0.8 }]);
      yield D;
    },
  };
}

export default confused;
