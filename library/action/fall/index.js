// action.fall — motor slice 4 (docs/WORLD_PUPPET_MOTOR.md): a fall-classified
// event cuts balance; the figure physically collapses through the shared FK
// and stays down (get-up is out of scope). No regex pose layer.
import { track } from "@anim/core/stdlib";

const D = 1.1;

export function fall(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [
        { at: 0, duration: D, intent: "fall", ...(target ? { target: target.id } : {}) },
      ]);
      yield D;
    },
  };
}

export default fall;
