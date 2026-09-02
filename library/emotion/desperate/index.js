// emotion.desperate — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.7;

export function desperate(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.2333333333333333, phase: "break", action: "draw breath into the chest", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.2333333333333333, duration: 0.2333333333333333, phase: "plead", action: "raise brows and open the mouth", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.4666666666666666, duration: 0.2333333333333333, phase: "hold", action: "keep the appeal exposed", parts: ["head","torso","hand_l","hand_r"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.7, phase: "break", name: "desperate", emotion: "desperate", brow: "pinched-high", eyes: "wide-wet", mouth: "open-pleading", intensity: 1 }]);
      yield D;
    },
  };
}

export default desperate;
