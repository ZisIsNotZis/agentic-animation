// action.discard — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.75;

export function discard(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.25, phase: "grip", action: "secure the object", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }, { at: 0.25, duration: 0.25, phase: "flick", action: "send it away from the body", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }, { at: 0.5, duration: 0.25, phase: "dismiss", action: "leave the hand open and empty", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }]);
      track(world, "vfx", undefined, [{ at: 0.25, duration: 0.25, effect: "manga-speed-lines", style: "manga-speed-lines", intensity: 0.65, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.25, duration: 0.22, cue: "object-whoosh", kind: "sfx", gain: 0.55, loop: false, operation: "play" }]);
      yield D;
    },
  };
}
