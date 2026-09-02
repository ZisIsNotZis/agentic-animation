// action.write — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1;

export function write(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.3333333333333333, phase: "position", action: "anchor the target with the free hand", parts: ["arm_u_r","arm_l_r","hand_r","head","torso"], target: target.id }, { at: 0.3333333333333333, duration: 0.3333333333333333, phase: "write", action: "move the wrist through legible strokes", parts: ["arm_u_r","arm_l_r","hand_r","head","torso"], target: target.id }, { at: 0.6666666666666666, duration: 0.3333333333333333, phase: "finish", action: "lift the pen and inspect the line", parts: ["arm_u_r","arm_l_r","hand_r","head","torso"], target: target.id }]);
      track(world, "sfx", undefined, [{ at: 0.3333333333333333, duration: 0.65, cue: "pen-scratch", kind: "sfx", gain: 0.35, loop: false, operation: "play" }]);
      yield D;
    },
  };
}
