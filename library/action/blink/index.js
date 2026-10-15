// A transient eye-only expression; the evaluator preserves identity and speech.
import { track } from "@anim/core/stdlib";

export function blink(subject) {
  return {
    durationSec: 0.5,
    mode: "block",
    *run(world) {
      track(world, "expression", subject.id, [
        { at: 0, duration: 0.5, transient: true, eyeOpen: 0 },
      ]);
      yield 0.5;
    },
  };
}

export default blink;
