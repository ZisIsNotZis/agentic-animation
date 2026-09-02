// action.collapse — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 1.2;

export function collapse(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.39999999999999997, phase: "brace", action: "lock the torso before losing height", parts: ["torso","head","leg_u_l","leg_u_r"] }, { at: 0.39999999999999997, duration: 0.39999999999999997, phase: "collapse", action: "bend knees and sink the shoulders", parts: ["torso","head","leg_u_l","leg_u_r"] }, { at: 0.7999999999999999, duration: 0.39999999999999997, phase: "rest", action: "settle weight low with head dipped", parts: ["torso","head","leg_u_l","leg_u_r"] }]);
      track(world, "lifecycle", undefined, [{ at: 0, duration: 1.2, pose: "collapsed", subject: subject.id, operation: "state" }]);
      yield D;
    },
  };
}

export default collapse;
