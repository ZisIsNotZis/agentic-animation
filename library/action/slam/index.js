// action.slam — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.65;

export function slam(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.21666666666666667, phase: "load", action: "lift the target with angry control", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }, { at: 0.21666666666666667, duration: 0.21666666666666667, phase: "slam", action: "drive it down on the surface", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }, { at: 0.43333333333333335, duration: 0.21666666666666667, phase: "hold", action: "freeze over the impact", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }]);
      track(world, "vfx", undefined, [{ at: 0.21666666666666667, duration: 0.24, effect: "manga-impact-star", style: "manga-impact-star", intensity: 1, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.21666666666666667, duration: 0.2, cue: "desk-slam", kind: "sfx", gain: 0.95, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default slam;
