// One semantic call opens the live grip; gravity/support and arm withdrawal
// are motor-owned. Unlike putdown, this never lifts onto a higher support.
import {track} from '@anim/core/stdlib';

const D = 0.8;
export function release(subject, object) {
  return {
    durationSec: D,
    mode: 'block',
    *run(world) {
      track(world, 'motor', subject.id, [{at: 0, duration: D, intent: 'release', releaseMode: 'free', target: object.id}]);
      yield D;
    },
  };
}
export default release;
