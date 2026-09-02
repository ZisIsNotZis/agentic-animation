// prop.handover — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1.15;

export function handover(subject, object, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.3833333333333333, phase: "offer", action: "extend the object and meet the receiver's eyes", parts: ["arm_u_r","arm_l_r","hand_r","torso","head"], target: target.id }, { at: 0.3833333333333333, duration: 0.3833333333333333, phase: "handover", action: "receiver's grip takes the weight", parts: ["arm_u_r","arm_l_r","hand_r","torso","head"], target: target.id }, { at: 0.7666666666666666, duration: 0.3833333333333333, phase: "release", action: "open the fingers and return to neutral", parts: ["arm_u_r","arm_l_r","hand_r","torso","head"], target: target.id }]);
      track(world, "gaze", target.id, [{ at: 0, duration: 1.15, phase: "offer", target: target.id, lead: "head", hold: 0.42 }]);
      track(world, "binding", object.id, [{ at: 0.68, duration: 0.01, operation: "release", object: object.id, holder: subject.id, hand: "hand_r" }, { at: 0.6900000000000001, duration: 0.45999999999999985, operation: "bind", object: object.id, holder: target.id, hand: "hand_r" }]);
      track(world, "object", object.id, [{ at: 0.68, duration: 0.01, operation: "release", object: object.id, status: "loose", holder: subject.id }, { at: 0.6900000000000001, duration: 0.45999999999999985, operation: "state", object: object.id, status: "held", holder: target.id }]);
      track(world, "lifecycle", object.id, [{ at: 0.68, duration: 0.01, operation: "release", object: object.id, status: "loose" }, { at: 0.6900000000000001, duration: 0.45999999999999985, operation: "bind", object: object.id, status: "held", holder: target.id }]);
      yield D;
    },
  };
}
