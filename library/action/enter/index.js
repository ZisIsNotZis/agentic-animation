// action.enter — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1.1;

export function enter(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.3666666666666667, phase: "approach", action: "walk on with measured stride", parts: ["leg_u_l","leg_u_r","torso","head"] }, { at: 0.3666666666666667, duration: 0.3666666666666667, phase: "arrive", action: "plant the leading foot", parts: ["leg_u_l","leg_u_r","torso","head"] }, { at: 0.7333333333333334, duration: 0.3666666666666667, phase: "acknowledge", action: "lift the head toward the scene", parts: ["leg_u_l","leg_u_r","torso","head"] }]);
      track(world, "lifecycle", undefined, [{ at: 0, duration: 1.1, present: true, subject: subject.id, operation: "state" }]);
      yield D;
    },
  };
}
