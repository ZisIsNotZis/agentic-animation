// action.scratch_head — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8;

export function scratch_head(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.26666666666666666, phase: "search", action: "eyes look up for an answer", parts: ["arm_u_r","arm_l_r","hand_r","head"] }, { at: 0.26666666666666666, duration: 0.26666666666666666, phase: "scratch", action: "fingers rub behind the head", parts: ["arm_u_r","arm_l_r","hand_r","head"] }, { at: 0.5333333333333333, duration: 0.26666666666666666, phase: "admit", action: "return with an apologetic shrug", parts: ["arm_u_r","arm_l_r","hand_r","head"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.8, phase: "search", name: "awkward", emotion: "awkward", brow: "knit", eyes: "upward", mouth: "small", intensity: 0.55 }]);
      yield D;
    },
  };
}
