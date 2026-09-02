// voice.interrupt — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.25;

export function interrupt(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.125, phase: "catch", action: "turn sharply to the speaker", parts: ["head","torso","hand_r"], target: target.id }, { at: 0.125, duration: 0.125, phase: "cut", action: "raise a stop hand over the line", parts: ["head","torso","hand_r"], target: target.id }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.25, phase: "catch", name: "urgent", emotion: "urgent", brow: "raised", eyes: "direct", mouth: "open-cutoff", intensity: 0.8 }]);
      yield D;
    },
  };
}
