// action.scatter — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.95;

export function scatter(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.31666666666666665, phase: "gather", action: "cup the object near the centerline", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }, { at: 0.31666666666666665, duration: 0.31666666666666665, phase: "scatter", action: "sweep the hand through a broad arc", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }, { at: 0.6333333333333333, duration: 0.31666666666666665, phase: "release", action: "leave the fingers splayed after the throw", parts: ["arm_u_r","arm_l_r","hand_r","torso"], target: target.id }]);
      track(world, "vfx", undefined, [{ at: 0.31666666666666665, duration: 0.3, effect: "manga-scatter-lines", style: "manga-scatter-lines", intensity: 0.75, operation: "apply" }]);
      track(world, "sfx", undefined, [{ at: 0.31666666666666665, duration: 0.35, cue: "paper-rattle", kind: "sfx", gain: 0.7, loop: false, operation: "play" }]);
      yield D;
    },
  };
}
