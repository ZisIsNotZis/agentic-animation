// action.present — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8999999999999999;

export function present(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.3, phase: "frame", action: "draw both hands around the target", parts: ["arm_u_l","arm_l_l","hand_l","torso","head"], target: target.id }, { at: 0.3, duration: 0.3, phase: "reveal", action: "open the arms and lift the chin", parts: ["arm_u_l","arm_l_l","hand_l","torso","head"], target: target.id }, { at: 0.6, duration: 0.3, phase: "offer", action: "hold the display for the audience", parts: ["arm_u_l","arm_l_l","hand_l","torso","head"], target: target.id }]);
      track(world, "vfx", undefined, [{ at: 0.3, duration: 0.28, effect: "manga-reveal-burst", style: "manga-reveal-burst", intensity: 0.6, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.3, duration: 0.3, cue: "reveal-chime", kind: "sfx", gain: 0.45, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default present;
