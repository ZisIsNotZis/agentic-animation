// emotion.calm — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.35;

export function calm(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.175, phase: "release", action: "soften brow and jaw", parts: ["torso","head"] }, { at: 0.175, duration: 0.175, phase: "hold", action: "keep a quiet attentive mask", parts: ["torso","head"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.35, phase: "release", name: "calm", emotion: "calm", brow: "level", eyes: "steady", mouth: "closed-soft", intensity: 0.35 }]);
      yield D;
    },
  };
}

export default calm;
