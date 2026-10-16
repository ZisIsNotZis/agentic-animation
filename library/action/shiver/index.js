// action.shiver — motor gesture (docs/WORLD_PUPPET_MOTOR.md, slice 3): a
// baked torso lean oscillation — planted feet, no contact. The chill-lines
// vfx and rattle sfx stay on their own channels. No regex pose layer.
import { track } from "@anim/core/stdlib";

const D = 0.7;

export function shiver(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "shiver" }]);
      track(world, "vfx", undefined, [{ at: 0.2333333333333333, duration: 0.35, effect: "manga-chill-lines", style: "manga-chill-lines", intensity: 0.58, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.2333333333333333, duration: 0.3, cue: "shiver-rattle", kind: "sfx", gain: 0.3, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default shiver;
