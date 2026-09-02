// emotion.somber — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function somber(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.21666666666666667, phase: "receive", action: "eyes lose their sparkle", parts: ["head","torso"] }, { at: 0.21666666666666667, duration: 0.21666666666666667, phase: "sink", action: "lower chin and mouth corners", parts: ["head","torso"] }, { at: 0.43333333333333335, duration: 0.21666666666666667, phase: "hold", action: "stay with the weight of it", parts: ["head","torso"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.65, phase: "receive", name: "somber", emotion: "somber", brow: "low", eyes: "downcast", mouth: "downturned", intensity: 0.82 }]);
      yield D;
    },
  };
}

export default somber;
