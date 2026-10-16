// action.bow — motor gesture (docs/WORLD_PUPPET_MOTOR.md, slice 3): the waist
// hinge is a baked physical envelope — planted feet, no contact, upright again
// within the authored duration. No regex pose layer.
import { track } from "@anim/core/stdlib";

const D = 0.8999999999999999;

export function bow(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "bow" }]);
      yield D;
    },
  };
}

export default bow;
