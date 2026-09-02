// music.ending — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 3.733333333333333;

export function ending() {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "music", undefined, [{ at: 0.9333333333333332, duration: 2.8, cue: "ending-cadence", kind: "music", gain: 0.72, loop: false, operation: "play" }]);
      yield D;
    },
  };
}
