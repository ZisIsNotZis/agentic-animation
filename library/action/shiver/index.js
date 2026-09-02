// action.shiver — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.7;

export function shiver(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.2333333333333333, phase: "shock", action: "shoulders rise toward the ears", parts: ["torso","head","arm_u_l","arm_u_r"] }, { at: 0.2333333333333333, duration: 0.2333333333333333, phase: "shiver", action: "rattle the torso in two quick pulses", parts: ["torso","head","arm_u_l","arm_u_r"] }, { at: 0.4666666666666666, duration: 0.2333333333333333, phase: "warm", action: "wrap arms closer and breathe out", parts: ["torso","head","arm_u_l","arm_u_r"] }]);
      track(world, "vfx", undefined, [{ at: 0.2333333333333333, duration: 0.35, effect: "manga-chill-lines", style: "manga-chill-lines", intensity: 0.58, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.2333333333333333, duration: 0.3, cue: "shiver-rattle", kind: "sfx", gain: 0.3, loop: false, operation: "play" }]);
      yield D;
    },
  };
}

export default shiver;
