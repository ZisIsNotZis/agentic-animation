// emotion.thoughtful — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.7;

export function thoughtful(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.2333333333333333, phase: "focus", action: "quiet the face", parts: ["head","hand_l","torso"] }, { at: 0.2333333333333333, duration: 0.2333333333333333, phase: "consider", action: "eyes move off-axis while brow gathers", parts: ["head","hand_l","torso"] }, { at: 0.4666666666666666, duration: 0.2333333333333333, phase: "return", action: "bring attention back with a decision", parts: ["head","hand_l","torso"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.7, phase: "focus", name: "thoughtful", emotion: "thoughtful", brow: "knit", eyes: "off-axis", mouth: "pressed", intensity: 0.7 }]);
      yield D;
    },
  };
}
