// movement.to — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1.4;

export function to(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "movement", subject.id, [{ at: 0, duration: 0.4666666666666666, action: "turn hips and find the route", phase: "orient", parts: ["leg_u_l","leg_l_l","foot_l","leg_u_r","leg_l_r","foot_r","torso","head"], target: target.id, operation: "move", mode: "toward-target" }, { at: 0.4666666666666666, duration: 0.4666666666666666, action: "take two even steps toward the target", phase: "travel", parts: ["leg_u_l","leg_l_l","foot_l","leg_u_r","leg_l_r","foot_r","torso","head"], target: target.id, operation: "move", mode: "toward-target" }, { at: 0.9333333333333332, duration: 0.4666666666666666, action: "plant and restore the eyeline", phase: "arrive", parts: ["leg_u_l","leg_l_l","foot_l","leg_u_r","leg_l_r","foot_r","torso","head"], target: target.id, operation: "move", mode: "toward-target" }]);
      track(world, "transform", subject.id, [{ at: 0, duration: 1.4, operation: "move", target: target.id, from: "current", to: target.id, progress: 0 }]);
      track(world, "lifecycle", undefined, [{ at: 0, duration: 1.4, pose: "standing", subject: subject.id, operation: "state" }]);
      yield D;
    },
  };
}

export default to;
