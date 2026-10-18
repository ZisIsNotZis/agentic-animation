// camera.punch_in — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.65;

/** @param zoom the close-shot zoom the push lands on; the authored beat decides
 *  it because a small object needs a closer shot than a person to be the
 *  subject (episodes/m6-film's thermos insert). */
export function punch_in(target, zoom = 1.35) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "camera", target.id, [{ at: 0, duration: 0.65, operation: "push", target: target.id, x: 0, y: 0, z: 1, key: "start" }, { at: 0.65, duration: 0, operation: "hold", target: target.id, x: 0, y: 0, z: zoom, key: "end" }]);
      yield D;
    },
  };
}

export default punch_in;
