// sound.static_buzz — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.7999999999999999;

export function static_buzz() {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "vfx", undefined, [{ at: 0.19999999999999998, duration: 0.6, effect: "manga-scanline", style: "manga-scanline", intensity: 0.55, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.19999999999999998, duration: 0.6, cue: "static-buzz", kind: "sfx", gain: 0.58, loop: false, operation: "play" }]);
      yield D;
    },
  };
}
