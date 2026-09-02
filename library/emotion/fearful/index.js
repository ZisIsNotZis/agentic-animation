// emotion.fearful — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function fearful(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.21666666666666667, phase: "sense", action: "stop the breath", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.21666666666666667, duration: 0.21666666666666667, phase: "freeze", action: "widen eyes and pull the chin back", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.43333333333333335, duration: 0.21666666666666667, phase: "hold", action: "keep the threat in peripheral focus", parts: ["head","torso","hand_l","hand_r"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.65, phase: "sense", name: "fearful", emotion: "fearful", brow: "high-pinched", eyes: "wide", mouth: "small-open", intensity: 0.95 }]);
      yield D;
    },
  };
}
