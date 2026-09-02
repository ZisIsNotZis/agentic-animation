// sound.paper_snap — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.39999999999999997;

export function paper_snap() {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "sfx", undefined, [{ at: 0.09999999999999999, duration: 0.3, cue: "paper-snap", kind: "sfx", gain: 0.72, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default paper_snap;
