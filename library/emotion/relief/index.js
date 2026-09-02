// emotion.relief — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.7;

export function relief(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.2333333333333333, phase: "release", action: "drop the held breath", parts: ["torso","head"] }, { at: 0.2333333333333333, duration: 0.2333333333333333, phase: "soften", action: "unclench eyes and jaw", parts: ["torso","head"] }, { at: 0.4666666666666666, duration: 0.2333333333333333, phase: "rest", action: "remain safely present", parts: ["torso","head"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.7, phase: "release", name: "relief", emotion: "relief", brow: "smooth", eyes: "soft", mouth: "exhale", intensity: 0.8 }]);
      yield D;
    },
  };
}

export default relief;
