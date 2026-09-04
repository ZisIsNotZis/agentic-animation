// emotion.shocked — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.5;

export function shocked(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.16666666666666666, phase: "impact", action: "stop the body on the discovery", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.16666666666666666, duration: 0.16666666666666666, phase: "open", action: "eyes and mouth spring wide", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.3333333333333333, duration: 0.16666666666666666, phase: "hold", action: "let the audience read the shock", parts: ["head","torso","hand_l","hand_r"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.5, phase: "impact", name: "shocked", emotion: "shocked", brow: "high", eyes: "wide", mouth: "round-open", intensity: 1 }]);
      track(world, "vfx", subject.id, [{ at: 0.16666666666666666, duration: 0.3, effect: "manga-impact-lines", style: "manga-impact-lines", bind: "head", intensity: 0.7, operation: "apply" }]);
      yield D;
    },
  };
}

export default shocked;
