// prop.putdown — physical putdown (docs/WORLD_PUPPET_MOTOR.md): the holder
// opens his hand and the prop falls under gravity to the highest declared
// support below (counter, desk, ground). No scripted lowering path.
import { track } from "@anim/core/stdlib";

const D = 0.8;

export function putdown(subject, object, _target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "release", target: object.id }]);
      yield D;
    },
  };
}

export default putdown;
