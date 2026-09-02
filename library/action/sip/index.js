// action.sip — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8999999999999999;

export function sip(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.3, phase: "reach", action: "lift the target from below", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }, { at: 0.3, duration: 0.3, phase: "sip", action: "tilt it to the mouth and drink", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }, { at: 0.6, duration: 0.3, phase: "lower", action: "return it with a satisfied breath", parts: ["arm_u_r","arm_l_r","hand_r","head"], target: target.id }]);
      track(world, "sfx", undefined, [{ at: 0.3, duration: 0.3, cue: "sip", kind: "sfx", gain: 0.22, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default sip;
