// gaze.audience — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.35;

export function audience(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.11666666666666665, phase: "turn", action: "eyes leave the scene", parts: ["head"] }, { at: 0.11666666666666665, duration: 0.11666666666666665, phase: "address", action: "head settles on the audience", parts: ["head"] }, { at: 0.2333333333333333, duration: 0.11666666666666665, phase: "hold", action: "invite the viewer in", parts: ["head"] }]);
      track(world, "gaze", "audience", [{ at: 0, duration: 0.35, phase: "turn", target: "audience", lead: "head", hold: 0.3 }]);
      yield D;
    },
  };
}
