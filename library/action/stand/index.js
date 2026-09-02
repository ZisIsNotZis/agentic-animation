// action.stand — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.9;

export function stand(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.3, phase: "plant", action: "set both feet under the hips", parts: ["leg_u_l","leg_u_r","torso","head"] }, { at: 0.3, duration: 0.3, phase: "rise", action: "stack the torso over the legs", parts: ["leg_u_l","leg_u_r","torso","head"] }, { at: 0.6, duration: 0.3, phase: "settle", action: "release shoulders into neutral", parts: ["leg_u_l","leg_u_r","torso","head"] }]);
      track(world, "lifecycle", undefined, [{ at: 0, duration: 0.9, pose: "standing", subject: subject.id, operation: "state" }]);
      yield D;
    },
  };
}

export default stand;
