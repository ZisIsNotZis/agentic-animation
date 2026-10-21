// camera.follow — generated from the authored recipe (docs/WORLD_PLUGIN_CONTRACT.md).
// Hand-polish freely; keep the descriptor contract: {durationSec, mode, run}.
//
// One camera track with ONE `follow` event spanning the declared window. The
// recipe does not sample: it declares the window and names the live prop, and
// the evaluator resolves the target's position per frame
// (packages/studio/src/performance/evaluate.ts, `cameraKeysFromTracks`), because
// only the evaluator knows where a struck prop is on frame 27.
//
// The window is the shot. `camera.follow(shuttle, {sec: 1.875})` covers the
// flight E1 bakes: the strike releases the shuttle, the arc runs ~1066 px and
// settles 1.6-1.9 s later. A window longer than the flight holds on the last
// followed frame, which is a legal hold, not a return to the wide.
import { track } from "@anim/core/stdlib";

/** The struck shuttle's own flight: strike to rest, measured in E1's bake. */
const D = 1.875;

/** @param target the live prop (or actor) handle to keep in frame — the
 *  episode writes `camera.follow(shuttle)`.
 *  @param options.sec the declared window, in seconds; it is the block's
 *  duration as well, so the shot and the timeline agree by construction.
 *  @param options.zoom the tightest zoom the shot may ask for. It is a CAP, not
 *  a value: the evaluator floors every key at the stage fit (0.667 on 1280x720)
 *  so the painted 1920x1080 stage never shrinks inside the frame and leaks
 *  black bands, and widens further if the target would not fit the frame. */
export function follow(target, options = {}) {
  const id = target?.id;
  if (typeof id !== "string" || !id) throw new Error(`camera.follow: target must be a live prop or actor handle (missing id), got ${String(target)}`);
  const sec = options.sec ?? D;
  if (!(sec > 0)) throw new Error(`camera.follow: options.sec must be positive, got ${sec}`);
  const zoom = options.zoom ?? 1;
  return {
    durationSec: sec,
    mode: "block",
    *run(world) {
      const start = world.invocation?.localSec ?? 0;
      track(world, "camera", id, [{ at: start, duration: sec, operation: "follow", target: id, x: 0, y: 0, z: zoom, key: "start", ease: "linear" }]);
      yield sec;
    },
  };
}

export default follow;
