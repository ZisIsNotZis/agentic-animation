// emotion.satisfied — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.55;

export function satisfied(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.18333333333333335, phase: "recognize", action: "eyes settle on the result", parts: ["head","torso"] }, { at: 0.18333333333333335, duration: 0.18333333333333335, phase: "savor", action: "close the mouth into a knowing smile", parts: ["head","torso"] }, { at: 0.3666666666666667, duration: 0.18333333333333335, phase: "hold", action: "keep the private satisfaction", parts: ["head","torso"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.55, phase: "recognize", name: "satisfied", emotion: "satisfied", brow: "level", eyes: "narrow-warm", mouth: "knowing-smile", intensity: 0.72 }]);
      yield D;
    },
  };
}

export default satisfied;
