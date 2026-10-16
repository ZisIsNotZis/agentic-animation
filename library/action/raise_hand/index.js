// action.raise_hand — motor reach gesture (docs/WORLD_PUPPET_MOTOR.md,
// slice 3): the hand travels above shoulder height at real hand speed and
// returns through the shared retract path. No regex pose layer.
import { track } from "@anim/core/stdlib";

const D = 0.75;

export function raise_hand(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "raise" }]);
      yield D;
    },
  };
}

export default raise_hand;
