// pose.orient — set an actor's body orientation (docs/WORLD_PUPPET_MOTOR.md
// §45-degree facing). One of: front, front-left, front-right, back-left,
// back-right. front-left/right render the quarter-front view, back-left/right
// the back view; left/right selects the mirror. Use it so two characters face
// each other diagonally instead of both staring into the camera.
import { track } from "@anim/core/stdlib";

const ORIENTATIONS = ["front", "front-left", "front-right", "back-left", "back-right"];
const D = 0.2;

export function orient(subject, orientation = "front-right") {
  if (!ORIENTATIONS.includes(orientation)) {
    throw new Error(`pose.orient: unknown orientation "${orientation}" (expected one of ${ORIENTATIONS.join(", ")})`);
  }
  return {
    durationSec: D,
    mode: "nonblock",
    *run(world) {
      track(world, "bone", subject.id, [
        { at: 0, duration: D, phase: "turn", action: `turn the body ${orientation}`, parts: ["torso", "head", "leg_u_r"], orientation },
      ]);
      yield D;
    },
  };
}

export default orient;
