// emotion.excited — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.6;

export function excited(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.19999999999999998, phase: "spark", action: "eyes catch the idea", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.19999999999999998, duration: 0.19999999999999998, phase: "brighten", action: "lift cheeks and brows", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.39999999999999997, duration: 0.19999999999999998, phase: "hold", action: "share the eager look", parts: ["head","torso","hand_l","hand_r"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.6, phase: "spark", name: "excited", emotion: "excited", brow: "high", eyes: "bright-wide", mouth: "smile-open", intensity: 0.9 }]);
      yield D;
    },
  };
}

export default excited;
