// emotion.proud — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.55;

export function proud(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.18333333333333335, phase: "lift", action: "raise the sternum", parts: ["torso","head","arm_u_l"] }, { at: 0.18333333333333335, duration: 0.18333333333333335, phase: "claim", action: "chin rises into the eyeline", parts: ["torso","head","arm_u_l"] }, { at: 0.3666666666666667, duration: 0.18333333333333335, phase: "hold", action: "keep the smile controlled", parts: ["torso","head","arm_u_l"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.55, phase: "lift", name: "proud", emotion: "proud", brow: "smooth", eyes: "direct", mouth: "closed-smile", intensity: 0.75 }]);
      yield D;
    },
  };
}

export default proud;
