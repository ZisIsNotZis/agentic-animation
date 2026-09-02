// camera.punch_in — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function punch_in(target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "camera", target.id, [{ at: 0, duration: 0.65, operation: "push", target: target.id, x: 0, y: 0, z: 1, key: "start" }, { at: 0.65, duration: 0, operation: "hold", target: target.id, x: 0, y: 0, z: 1.35, key: "end" }]);
      yield D;
    },
  };
}
