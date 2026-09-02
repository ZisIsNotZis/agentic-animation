// action.tap_head — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.7;

export function tap_head(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.2333333333333333, phase: "lift", action: "bring knuckles beside the temple", parts: ["arm_u_r","arm_l_r","hand_r","head"] }, { at: 0.2333333333333333, duration: 0.2333333333333333, phase: "tap", action: "land two quick taps", parts: ["arm_u_r","arm_l_r","hand_r","head"] }, { at: 0.4666666666666666, duration: 0.2333333333333333, phase: "spark", action: "look up as the idea arrives", parts: ["arm_u_r","arm_l_r","hand_r","head"] }]);
      track(world, "vfx", undefined, [{ at: 0.2333333333333333, duration: 0.3, effect: "manga-idea-spark", style: "manga-idea-spark", intensity: 0.55, operation: "apply" }]);
      yield D;
    },
  };
}

export default tap_head;
