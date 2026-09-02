// emotion.embarrassed — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.6;

export function embarrassed(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.19999999999999998, phase: "realize", action: "eyes widen at the mistake", parts: ["head","hand_l"] }, { at: 0.19999999999999998, duration: 0.19999999999999998, phase: "hide", action: "drop gaze and pinch the mouth", parts: ["head","hand_l"] }, { at: 0.39999999999999997, duration: 0.19999999999999998, phase: "recover", action: "peek back up cautiously", parts: ["head","hand_l"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.6, phase: "realize", name: "embarrassed", emotion: "embarrassed", brow: "raised", eyes: "downcast", mouth: "tight", intensity: 0.75 }]);
      yield D;
    },
  };
}
