// prop.handover — physical handover (docs/WORLD_PUPPET_MOTOR.md): the
// RECEIVER walks to the giver (his own legs — locomotion, not cooperation
// with the object), reaches for the object riding the giver's hand, and the
// grip binds on real contact. The bind physically takes the weight: the
// giver's hand opens (his holding clears) the moment the receiver grips.
import { track } from "@anim/core/stdlib";

const D = 1.6;

export function handover(subject, object, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "gaze", target.id, [{ at: 0, duration: D, phase: "offer", target: subject.id, lead: "head", hold: 0.42 }]);
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "move", actor: target.id, to: subject.id, target: subject.id, grab: object.id }]);
      // Motor tracks ride the call subject's track; `actor` redirects the
      // intent to the driven actor (the receiver does the walking).
      yield D;
    },
  };
}

export default handover;