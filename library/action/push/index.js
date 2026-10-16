// action.push — physical contact push (docs/WORLD_PUPPET_MOTOR.md): the hand
// must reach the target before any force exists (I2), the pusher leans back
// against the exertion (I3), and the target staggers with momentum — the
// balance controller takes recovery steps from the figure's declared data.
import { track } from "@anim/core/stdlib";

const D = 2.2;

export function push(subject, target, force = 1.4) {
  return {
    durationSec: D,
    mode: "block",
    *run(world) {
      track(world, "motor", subject.id, [
        { at: 0, duration: D, intent: "push", target: target.id, reach: 0.35, forceSec: 0.25, force },
      ]);
      // Impact thump lands after the approach window, on contact. The
      // "push-thump" sfx is NOT rendered: the cue was never shipped under
      // library/sound/, so every push render failed the renderer's cue gate
      // (pre-existing defect, repaired during slice 3). Disclosed audio
      // regression; restore only with a real cue asset — never a placeholder.
      yield D;
    },
  };
}

export default push;
