// action.close — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8;

export function close(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.26666666666666666, phase: "reach", action: "align hand with the target", parts: ["arm_u_r","arm_l_r","hand_r"], target: target.id }, { at: 0.26666666666666666, duration: 0.26666666666666666, phase: "close", action: "press the moving piece shut", parts: ["arm_u_r","arm_l_r","hand_r"], target: target.id }, { at: 0.5333333333333333, duration: 0.26666666666666666, phase: "confirm", action: "withdraw after the click", parts: ["arm_u_r","arm_l_r","hand_r"], target: target.id }]);
      track(world, "sfx", undefined, [{ at: 0.26666666666666666, duration: 0.12, cue: "close-click", kind: "sfx", gain: 0.7, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default close;
