// gaze.at — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.35;

export function at(subject, target) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", target.id, [{ at: 0, duration: 0.11666666666666665, phase: "lead", action: "eyes travel first", parts: ["head"], target: target.id }, { at: 0.11666666666666665, duration: 0.11666666666666665, phase: "land", action: "head follows to the target", parts: ["head"], target: target.id }, { at: 0.2333333333333333, duration: 0.11666666666666665, phase: "hold", action: "maintain connection", parts: ["head"], target: target.id }]);
      track(world, "gaze", target.id, [{ at: 0, duration: 0.35, phase: "lead", target: target.id, lead: "eyes", hold: 0.25 }]);
      yield D;
    },
  };
}
