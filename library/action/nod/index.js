// action.nod — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.44999999999999996;

export function nod(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.15, phase: "dip", action: "first small nod acknowledges", parts: ["head","torso"] }, { at: 0.15, duration: 0.15, phase: "confirm", action: "second nod commits the answer", parts: ["head","torso"] }, { at: 0.3, duration: 0.15, phase: "hold", action: "keep the eyeline steady", parts: ["head","torso"] }]);
      yield D;
    },
  };
}

export default nod;
