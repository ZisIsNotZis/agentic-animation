// emotion.crying — persistent weeping state: knit brows, squeezed-shut
// tearful eyes, trembling frown (docs/WORLD_PLUGIN_CONTRACT.md).
import { track } from "@anim/core/stdlib";

const D = 0.8;

export function crying(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.26666666666666666, phase: "sink", action: "let the shoulders drop and the head hang", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.26666666666666666, duration: 0.26666666666666666, phase: "weep", action: "shake with quiet sobs", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.5333333333333333, duration: 0.26666666666666666, phase: "hold", action: "keep weeping", parts: ["head","torso","hand_l","hand_r"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: D, phase: "weep", name: "crying", emotion: "crying", brow: "knit-sad", eyes: "shut-tearful", mouth: "trembling-frown", tears: 1, intensity: 1 }]);
      yield D;
    },
  };
}

export default crying;
