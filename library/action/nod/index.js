// action.nod — motor gesture (docs/WORLD_PUPPET_MOTOR.md, slice 3): two baked
// waist dips across the duration; the head and eyeline ride the torso.
// No regex pose layer.
import { track } from "@anim/core/stdlib";

const D = 0.44999999999999996;

export function nod(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "nod" }]);
      yield D;
    },
  };
}

export default nod;
