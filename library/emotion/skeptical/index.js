// emotion.skeptical — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.6;

export function skeptical(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.19999999999999998, phase: "listen", action: "hold the mouth neutral", parts: ["head","arm_u_l"] }, { at: 0.19999999999999998, duration: 0.19999999999999998, phase: "doubt", action: "raise one brow and cant the head", parts: ["head","arm_u_l"] }, { at: 0.39999999999999997, duration: 0.19999999999999998, phase: "judge", action: "pin the speaker with a side-eye", parts: ["head","arm_u_l"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.6, phase: "listen", name: "skeptical", emotion: "skeptical", brow: "one-raised", eyes: "side-eye", mouth: "flat", intensity: 0.8 }]);
      yield D;
    },
  };
}
