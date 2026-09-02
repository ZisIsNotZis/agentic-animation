// emotion.laughing — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.8;

export function laughing(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.26666666666666666, phase: "tickle", action: "eyes crinkle before the sound", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.26666666666666666, duration: 0.26666666666666666, phase: "laugh", action: "open the mouth and bounce the shoulders", parts: ["head","torso","hand_l","hand_r"] }, { at: 0.5333333333333333, duration: 0.26666666666666666, phase: "settle", action: "come down smiling", parts: ["head","torso","hand_l","hand_r"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.8, phase: "tickle", name: "laughing", emotion: "laughing", brow: "relaxed", eyes: "crinkled", mouth: "open-smile", intensity: 0.9 }]);
      track(world, "sfx", undefined, [{ at: 0.26666666666666666, duration: 0.45, cue: "laugh", kind: "sfx", gain: 0.28, loop: false, operation: "play" }]);
      yield D;
    },
  };
}
