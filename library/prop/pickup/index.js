// prop.pickup — physical pickup (docs/WORLD_PUPPET_MOTOR.md): the actor
// walks to the object (his own legs), the grab controller bends/crouches the
// MINIMUM amount whose extended hand touches the object's declared body box,
// and the prop binds to the hand joint on contact — never before, never by
// script. All timing is physical; this plugin only states the intent.
import { track } from "@anim/core/stdlib";

const D = 1.6;

/** @param options.hand "left" picks the prop up with the OFF hand (R7); omit
 *  it, or write "right", and the striking hand takes it exactly as before. */
export function pickup(subject, target, options = {}) {
  const hand = options.hand === "left" ? "hand_l" : options.hand === "right" ? "hand_r" : undefined;
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "move", to: target.id, target: target.id, grab: target.id, ...(hand ? { hand } : {}) }]);
      yield D;
    },
  };
}

export default pickup;
