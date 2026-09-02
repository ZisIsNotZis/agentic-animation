// prop.putdown — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1;

export function putdown(subject, object, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.3333333333333333, phase: "position", action: "lower the object toward its support", parts: ["arm_u_r","arm_l_r","hand_r","torso","head"], target: target.id }, { at: 0.3333333333333333, duration: 0.3333333333333333, phase: "release", action: "open fingers just above the surface", parts: ["arm_u_r","arm_l_r","hand_r","torso","head"], target: target.id }, { at: 0.6666666666666666, duration: 0.3333333333333333, phase: "settle", action: "withdraw and let the object land", parts: ["arm_u_r","arm_l_r","hand_r","torso","head"], target: target.id }]);
      track(world, "binding", object.id, [{ at: 0.62, duration: 0.01, operation: "release", object: object.id, holder: subject.id, hand: "hand_r" }]);
      track(world, "object", object.id, [{ at: 0.94, duration: 0.06000000000000005, operation: "state", object: object.id, status: "supported", support: target.id }]);
      track(world, "lifecycle", object.id, [{ at: 0.62, duration: 0.01, operation: "release", object: object.id, status: "loose" }, { at: 0.94, duration: 0.06000000000000005, operation: "state", object: object.id, status: "supported", support: target.id }]);
      yield D;
    },
  };
}
