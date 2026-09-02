// effect.ai_glitch — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1.1;

export function ai_glitch(target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "vfx", target.id, [{ at: 0.3, duration: 0.8, effect: "ai-glitch-chromatic", style: "ai-glitch-chromatic", target: target.id, intensity: 0.95, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.3, duration: 0.55, cue: "digital-glitch", kind: "sfx", gain: 0.62, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default ai_glitch;
