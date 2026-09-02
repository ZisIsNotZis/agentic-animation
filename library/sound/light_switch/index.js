// sound.light_switch — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.27;

export function light_switch() {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "sfx", undefined, [{ at: 0.09, duration: 0.18, cue: "light-switch", kind: "sfx", gain: 0.6, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default light_switch;
