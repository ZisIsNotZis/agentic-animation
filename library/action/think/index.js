// action.think — motor reach gesture (docs/WORLD_PUPPET_MOTOR.md, slice 3):
// the hand travels to the chin while the expression channel carries the knit
// brow and pressed mouth. No regex pose layer.
import { track } from "@anim/core/stdlib";

const D = 0.9;

export function think(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "think" }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.9, phase: "focus", name: "thinking", emotion: "thinking", brow: "knit", eyes: "off-axis", mouth: "pressed", intensity: 0.7 }]);
      yield D;
    },
  };
}

export default think;
