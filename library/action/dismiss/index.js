// action.dismiss — motor reach gesture (docs/WORLD_PUPPET_MOTOR.md, slice 3):
// the hand cuts outward in a baked lateral oscillation at arm's length, then
// retracts. No regex pose layer.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function dismiss(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "wave" }]);
      yield D;
    },
  };
}

export default dismiss;
