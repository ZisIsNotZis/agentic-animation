// action.swing — giant swing (docs/WORLD_PUPPET_MOTOR.md, slice B): the body
// attaches to a hanging support's grip line, both hands on the one grip point,
// and turns about the pivot through the support's declared rotationLimit. A 360
// forward limit is one full circle. Stage it in a SIDE orientation: the swing
// plane is perpendicular to the bar, and the side view is the only one whose two
// hands coincide at one point.
import { track } from "@anim/core/stdlib";

const D = 2.4;

export function swing(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "swing" }]);
      yield D;
    },
  };
}

export default swing;
