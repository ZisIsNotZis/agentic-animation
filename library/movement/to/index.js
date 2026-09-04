// movement.to — locomotion with planted feet (docs/WORLD_PUPPET_MOTOR.md):
// the pelvis eases toward the target while steps alternate under the center
// of mass; feet never glide.
import { track } from "@anim/core/stdlib";

const D = 1.4;

export function to(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "move", to: target.id, target: target.id }]);
      yield D;
    },
  };
}

export default to;
