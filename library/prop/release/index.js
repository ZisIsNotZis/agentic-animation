// One semantic call opens the live grip; gravity/support and arm withdrawal
// are motor-owned. Unlike putdown, this never lifts onto a higher support.
import {track} from '@anim/core/stdlib';

const D = 0.8;
/** @param options.hand "left" opens the OFF hand (R7); omit it and the
 *  striking hand releases, exactly as before. */
export function release(subject, object, options = {}) {
  const hand = options.hand === 'left' ? 'hand_l' : options.hand === 'right' ? 'hand_r' : undefined;
  return {
    durationSec: D,
    mode: 'block',
    *run(world) {
      track(world, 'motor', subject.id, [{at: 0, duration: D, intent: 'release', releaseMode: 'free', target: object.id, ...(hand ? {hand} : {})}]);
      yield D;
    },
  };
}
export default release;
