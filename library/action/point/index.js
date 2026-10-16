// action.point — motor reach gesture (docs/WORLD_PUPPET_MOTOR.md, slice 3):
// the body faces the target and the hand travels to the pointing aim itself;
// the arm IK renders the baked reach point. Gaze stays an eyes-channel track.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function point(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "point", target: target.id }]);
      track(world, "gaze", target.id, [{ at: 0, duration: 0.65, phase: "aim", target: target.id, lead: "head", hold: 0.35 }]);
      yield D;
    },
  };
}

export default point;
