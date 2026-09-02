// action.type — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1.0833333333333333;

export function type(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.3333333333333333, phase: "ready", action: "hover both hands over the target", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","arm_l_r","hand_r","head"], target: target.id }, { at: 0.3333333333333333, duration: 0.3333333333333333, phase: "type", action: "alternate fingers in a brisk rhythm", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","arm_l_r","hand_r","head"], target: target.id }, { at: 0.6666666666666666, duration: 0.3333333333333333, phase: "send", action: "stop and look to the screen", parts: ["arm_u_l","arm_l_l","hand_l","arm_u_r","arm_l_r","hand_r","head"], target: target.id }]);
      track(world, "sfx", undefined, [{ at: 0.3333333333333333, duration: 0.75, cue: "keyboard-taps", kind: "sfx", gain: 0.42, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default type;
