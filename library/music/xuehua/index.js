// music.xuehua — "雪花飘飘~北风萧萧" pentatonic synth homage (一剪梅),
// looped as scene BGM. Non-blocking ambient music bed.
import { track } from "@anim/core/stdlib";

const D = 7.25;

export function xuehua(options = {}) {
  const duration = Math.max(1, Number(options.durationSec) || D);
  return {
    durationSec: duration,
    mode: "nonblock",
    *run(world) {
      track(world, "music", undefined, [{ at: 0, duration, cue: "xuehua-piaopiao", kind: "music", gain: 0.6, loop: true, operation: "play" }]);
      yield duration;
    },
  };
}

export default xuehua;
