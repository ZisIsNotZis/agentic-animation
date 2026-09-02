// emotion.secretive — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
import { track } from "@anim/core/stdlib";

const D = 0.6;

export function secretive(subject) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "bone", undefined, [{ at: 0, duration: 0.19999999999999998, phase: "check", action: "look toward the listener", parts: ["head","hand_l"] }, { at: 0.19999999999999998, duration: 0.19999999999999998, phase: "conceal", action: "lower voice-face and narrow the eyes", parts: ["head","hand_l"] }, { at: 0.39999999999999997, duration: 0.19999999999999998, phase: "invite", action: "finish with a tiny side smile", parts: ["head","hand_l"] }]);
      track(world, "expression", undefined, [{ at: 0, duration: 0.6, phase: "check", name: "secretive", emotion: "secretive", brow: "angled", eyes: "sidelong", mouth: "pressed-smile", intensity: 0.78 }]);
      yield D;
    },
  };
}
