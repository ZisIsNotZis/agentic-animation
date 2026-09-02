// action.push — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.85;

export function push(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.2833333333333333, phase: "brace", action: "set the rear foot and load the shoulder", parts: ["arm_u_r","arm_l_r","hand_r","torso","leg_u_r"], target: target.id }, { at: 0.2833333333333333, duration: 0.2833333333333333, phase: "push", action: "drive the palm through the target", parts: ["arm_u_r","arm_l_r","hand_r","torso","leg_u_r"], target: target.id }, { at: 0.5666666666666667, duration: 0.2833333333333333, phase: "recoil", action: "return weight to a stable stance", parts: ["arm_u_r","arm_l_r","hand_r","torso","leg_u_r"], target: target.id }]);
      track(world, "vfx", undefined, [{ at: 0.2833333333333333, duration: 0.2, effect: "impact-burst", style: "impact-burst", intensity: 0.65, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.2833333333333333, duration: 0.18, cue: "push-thump", kind: "sfx", gain: 0.65, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default push;
