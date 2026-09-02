// prop.pickup — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.95;

export function pickup(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.31666666666666665, phase: "reach", action: "lower center of mass toward the object", parts: ["torso","head","arm_u_r","arm_l_r","hand_r","leg_u_r"], target: target.id }, { at: 0.31666666666666665, duration: 0.31666666666666665, phase: "grasp", action: "close fingers around the object", parts: ["torso","head","arm_u_r","arm_l_r","hand_r","leg_u_r"], target: target.id }, { at: 0.6333333333333333, duration: 0.31666666666666665, phase: "lift", action: "stand with the weight secure", parts: ["torso","head","arm_u_r","arm_l_r","hand_r","leg_u_r"], target: target.id }]);
      track(world, "binding", target.id, [{ at: 0.58, duration: 0.37, operation: "bind", object: target.id, holder: subject.id, hand: "hand_r" }]);
      track(world, "object", target.id, [{ at: 0.58, duration: 0.37, operation: "state", object: target.id, status: "held", holder: subject.id }]);
      track(world, "lifecycle", target.id, [{ at: 0.58, duration: 0.37, operation: "bind", object: target.id, status: "held", holder: subject.id }]);
      yield D;
    },
  };
}

export default pickup;
