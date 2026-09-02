// action.raise_hand — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.75;

export function raise_hand(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.25, phase: "signal", action: "catch the listener's eye", parts: ["arm_u_r","arm_l_r","hand_r","head"] }, { at: 0.25, duration: 0.25, phase: "raise", action: "lift the hand above shoulder height", parts: ["arm_u_r","arm_l_r","hand_r","head"] }, { at: 0.5, duration: 0.25, phase: "wait", action: "hold patiently for recognition", parts: ["arm_u_r","arm_l_r","hand_r","head"] }]);
      yield D;
    },
  };
}

export default raise_hand;
