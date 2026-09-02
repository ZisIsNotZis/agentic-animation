// camera.wide — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8;

export function wide() {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "camera", undefined, [{ at: 0, duration: 0.8, operation: "pull", x: 0, y: 0, z: 1, key: "start" }, { at: 0.8, duration: 0, operation: "hold", x: 0, y: 0, z: 0.72, key: "end" }]);
      yield D;
    },
  };
}
