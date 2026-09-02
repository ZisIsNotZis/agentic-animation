// action.think — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.9;

export function think(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.3, phase: "focus", action: "narrow attention away from the room", parts: ["head","arm_u_l","arm_l_l","hand_l"] }, { at: 0.3, duration: 0.3, phase: "consider", action: "support chin with one hand", parts: ["head","arm_u_l","arm_l_l","hand_l"] }, { at: 0.6, duration: 0.3, phase: "resolve", action: "lift eyes when the answer forms", parts: ["head","arm_u_l","arm_l_l","hand_l"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.9, phase: "focus", name: "thinking", emotion: "thinking", brow: "knit", eyes: "off-axis", mouth: "pressed", intensity: 0.7 }]);
      yield D;
    },
  };
}
