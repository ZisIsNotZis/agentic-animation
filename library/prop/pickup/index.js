// prop.pickup — physical pickup (docs/WORLD_PUPPET_MOTOR.md): the actor
// walks to the object, and the binding eases it into the hand only once the
// hand actually arrives — the prop never teleports.
import { track } from "@anim/core/stdlib";

const D = 0.95;

export function pickup(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [{ at: 0, duration: D, intent: "move", to: target.id, target: target.id }]);
      track(world, "bone", subject.id, [{ at: 0.3, duration: 0.2, phase: "reach", action: "lower center of mass toward the object", parts: ["torso","head","arm_u_r","arm_l_r","hand_r","leg_u_r"], target: target.id }, { at: 0.5, duration: 0.2, phase: "grasp", action: "close fingers around the object", parts: ["torso","head","arm_u_r","arm_l_r","hand_r","leg_u_r"], target: target.id }, { at: 0.7, duration: 0.25, phase: "lift", action: "stand with the weight secure", parts: ["torso","head","arm_u_r","arm_l_r","hand_r","leg_u_r"], target: target.id }]);
      track(world, "binding", target.id, [{ at: 0.5, duration: 0.45, operation: "bind", object: target.id, holder: subject.id, hand: "hand_r" }]);
      track(world, "object", target.id, [{ at: 0.5, duration: 0.45, operation: "state", object: target.id, status: "held", holder: subject.id }]);
      track(world, "lifecycle", target.id, [{ at: 0.5, duration: 0.45, operation: "bind", object: target.id, status: "held", holder: subject.id }]);
      yield D;
    },
  };
}

export default pickup;
