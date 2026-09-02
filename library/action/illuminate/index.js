// action.illuminate — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.85;

export function illuminate(subject, object, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.2833333333333333, phase: "aim", action: "raise the object toward the target", parts: ["arm_u_r","arm_l_r","hand_r","head","torso"], target: target.id }, { at: 0.2833333333333333, duration: 0.2833333333333333, phase: "illuminate", action: "hold a focused beam on the target", parts: ["arm_u_r","arm_l_r","hand_r","head","torso"], target: target.id }, { at: 0.5666666666666667, duration: 0.2833333333333333, phase: "reveal", action: "turn attention to what the light found", parts: ["arm_u_r","arm_l_r","hand_r","head","torso"], target: target.id }]);
      track(world, "gaze", target.id, [{ at: 0, duration: 0.85, phase: "aim", target: target.id, lead: "head", hold: 0.4 }]);
      track(world, "vfx", undefined, [{ at: 0.2833333333333333, duration: 0.45, effect: "manga-light-cone", style: "manga-light-cone", intensity: 0.8, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.2833333333333333, duration: 0.12, cue: "flashlight-click", kind: "sfx", gain: 0.5, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default illuminate;
