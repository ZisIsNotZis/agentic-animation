import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluatePerformance, type EvaluatedProp, type PerformanceGenericTrack, type PerformanceManifest } from "../src/performance";

/**
 * E4 — the tracking camera. `library/camera/follow` declares ONE `follow` camera
 * event spanning a window; `evaluate.ts` resolves that window to one key per
 * frame from the target's live position. These tests hold the two claims that
 * makes a following shot usable: the shot is legal on every frame of the window
 * (nothing leaves the painted 1920x1080 stage, so no black bands), and the
 * camera really travels with the prop instead of holding a midpoint.
 *
 * The arc is E1's struck shuttle, as measured: launch at y 310 on the strike,
 * apex near y 130, landing on the ground line y 691, 1066 px of travel, settled
 * 1.875 s later. It is a fixture, not a bake — the numbers are the point.
 */

const VIDEO = { width: 1280, height: 720, fps: 24 };
const CANVAS = { width: 1920, height: 1080 };
const FRAMES = 60;
const STRIKE = 6;
const LAND = 51;
const WINDOW_SEC = (LAND - STRIKE) / VIDEO.fps; // 1.875 s, E1's settling time

/** The struck shuttle's arc, frame by frame: launch (400, 310), apex y ~130 a
 *  third of the way out, ground (1466, 691). The parabola through those three
 *  points is y = 1377.5t^2 - 996.5t + 310. */
const ARC = Array.from({ length: FRAMES }, (_, frame) => {
  const t = Math.min(1, Math.max(0, (frame - STRIKE) / (LAND - STRIKE)));
  return frame < STRIKE
    ? { x: 400, y: 310 }
    : { x: 400 + 1066 * t, y: 1377.5 * t * t - 996.5 * t + 310 };
});

type RecipeTrack = { kind: string; target?: string; events: Array<Record<string, unknown> & {at: number; duration: number}> };

/** Drive the authored recipe the way the compiler does — one generator step
 *  into a stub world — and project its recipe track to manifest frames at
 *  `startFrame`, which is `projectCompiledPerformance`'s arithmetic. */
async function recipeCameraTrack(startFrame: number): Promise<{durationSec: number; track: PerformanceGenericTrack}> {
  const module = await import(new URL("../../../library/camera/follow/index.js", import.meta.url).href) as {
    follow: (target: unknown, options?: {sec?: number; zoom?: number}) => {durationSec?: number; mode?: string; run(world: unknown): Generator<unknown>};
  };
  const invocation = module.follow({ id: "shuttle" }, { sec: WINDOW_SEC });
  const world = { canvas: { tracks: [] as RecipeTrack[] }, invocation: { localSec: 0 }, frame: 0, seconds: 0, fps: VIDEO.fps, seed: 0, plugins: {} };
  const run = invocation.run(world);
  run.next(); // the whole recipe body writes its track, then yields the window
  run.return?.();
  assert.equal(world.canvas.tracks.length, 1, "camera.follow writes exactly one camera track");
  const recipe = world.canvas.tracks[0]!;
  assert.equal(recipe.kind, "camera");
  assert.equal(recipe.target, "shuttle", "the track names the followed prop, not the camera");
  const track: PerformanceGenericTrack = {
    kind: "camera",
    subject: "camera",
    target: recipe.target,
    events: recipe.events.map((event) => ({
      ...event,
      frame: startFrame + Math.round(event.at * VIDEO.fps),
      durationFrames: Math.max(1, Math.round(event.duration * VIDEO.fps)),
    })),
  };
  return { durationSec: invocation.durationSec!, track};
}

async function followManifest(): Promise<PerformanceManifest> {
  const {track, durationSec} = await recipeCameraTrack(STRIKE);
  assert.equal(durationSec, WINDOW_SEC, "the block's duration is the declared window");
  return {
    video: VIDEO,
    durationInFrames: FRAMES,
    // A location scene switches the containment pass on, so the test measures
    // the route an episode actually renders, not a shortcut around it.
    locationScenes: {yard: "<svg/>"},
    sceneTrack: [{ start: 0, motor: { props: { shuttle: ARC } } }],
    actors: [{ id: "server", placement: { at: [300, 691] }, scale: 0.88, present: true }],
    props: [{ id: "shuttle", at: [400, 310], size: [40, 32], base: 160, body: [60, 80, 140, 160] }],
    tracks: [track],
  };
}

/** The prop's drawn world box, from the evaluated prop: the vertical extent is
 *  the declared body measured off the base anchor (propFrameBand's rule), the
 *  horizontal extent is the drawn width around the anchor. */
function propBox(prop: EvaluatedProp) {
  const unit = (prop.size[1] / 160) * (prop.scale || 1);
  const base = prop.base ?? 160;
  const body = prop.body ?? [0, 0, prop.size[0], 160];
  const halfWidth = (prop.size[0] / 2) * (prop.scale || 1);
  return {
    left: prop.x - halfWidth,
    right: prop.x + halfWidth,
    top: prop.y + (body[1] - base) * unit,
    bottom: prop.y + (body[3] - base) * unit,
  };
}

const EPSILON = 1e-6;

test("camera.follow keeps the followed prop and the camera viewport inside the painted stage for every frame of its window", async () => {
  const manifest = await followManifest();
  const fit = Math.min(VIDEO.width / CANVAS.width, VIDEO.height / CANVAS.height);
  assert.equal(Number(fit.toFixed(4)), 0.6667, "the stage fit on 1280x720 is 0.6667");

  const centres: number[] = [];
  for (let frame = STRIKE; frame <= LAND; frame += 1) {
    const state = evaluatePerformance(manifest, frame);
    const prop = state.props.find((candidate) => candidate.id === "shuttle")!;
    const box = propBox(prop);
    const viewport = {
      left: state.camera.x,
      top: state.camera.y,
      right: state.camera.x + VIDEO.width / state.camera.z,
      bottom: state.camera.y + VIDEO.height / state.camera.z,
    };

    // 1. The followed prop's world box is inside the painted 1920x1080 stage.
    assert.ok(box.left >= -EPSILON && box.right <= CANVAS.width + EPSILON, `frame ${frame}: prop x [${box.left.toFixed(1)}, ${box.right.toFixed(1)}] inside the stage`);
    assert.ok(box.top >= -EPSILON && box.bottom <= CANVAS.height + EPSILON, `frame ${frame}: prop y [${box.top.toFixed(1)}, ${box.bottom.toFixed(1)}] inside the stage`);

    // 2. The camera viewport is inside the painted stage too: below the stage
    //    fit the 1920x1080 stage shrinks inside the video frame and the episode
    //    background leaks in as black bands.
    assert.ok(state.camera.z >= fit - EPSILON, `frame ${frame}: zoom ${state.camera.z} at or above the stage fit`);
    assert.ok(viewport.left >= -EPSILON && viewport.right <= CANVAS.width + EPSILON, `frame ${frame}: viewport x [${viewport.left.toFixed(1)}, ${viewport.right.toFixed(1)}] inside the stage`);
    assert.ok(viewport.top >= -EPSILON && viewport.bottom <= CANVAS.height + EPSILON, `frame ${frame}: viewport y [${viewport.top.toFixed(1)}, ${viewport.bottom.toFixed(1)}] inside the stage`);

    // 3. And it is a follow, not a wide: the prop's own centre stays in frame.
    const centreX = (box.left + box.right) / 2;
    const centreY = (box.top + box.bottom) / 2;
    assert.ok(centreX >= viewport.left && centreX <= viewport.right, `frame ${frame}: prop centre x ${centreX.toFixed(1)} inside the viewport`);
    assert.ok(centreY >= viewport.top && centreY <= viewport.bottom, `frame ${frame}: prop centre y ${centreY.toFixed(1)} inside the viewport`);
    centres.push(centreX);
  }

  // The camera travels: a window resolved at its midpoint or held on one key
  // would show a single camera x here.
  const stateAt = (frame: number) => evaluatePerformance(manifest, frame).camera.x;
  const travel = Math.max(...centres.map((_, index) => Math.abs(stateAt(STRIKE + index) - stateAt(STRIKE)))) ;
  assert.ok(travel > 300, `the camera panned ${travel.toFixed(1)} px with the shuttle`);
  // ... and it travels smoothly: one frame of the arc is ~24 px, never a cut.
  for (let frame = STRIKE + 1; frame <= LAND; frame += 1) {
    const step = Math.abs(stateAt(frame) - stateAt(frame - 1));
    assert.ok(step <= 40, `frame ${frame}: camera moved ${step.toFixed(1)} px in one frame`);
  }
});

test("camera.follow holds a legal frame after its window ends", async () => {
  const manifest = await followManifest();
  const end = evaluatePerformance(manifest, LAND).camera;
  const fit = Math.min(VIDEO.width / CANVAS.width, VIDEO.height / CANVAS.height);
  assert.ok(end.z >= fit - EPSILON, `the hold is at or above the stage fit (z ${end.z})`);
  assert.ok(end.x >= -EPSILON && end.y >= -EPSILON, `the hold is inside the stage (${end.x}, ${end.y})`);
  assert.ok(end.x + VIDEO.width / end.z <= CANVAS.width + EPSILON && end.y + VIDEO.height / end.z <= CANVAS.height + EPSILON);
  for (let frame = LAND; frame < FRAMES; frame += 1) {
    const camera = evaluatePerformance(manifest, frame).camera;
    assert.deepEqual(camera, end, `frame ${frame}: the camera holds the window's last frame`);
  }
});

test("a follow whose target cannot be resolved holds the shot instead of flying to the stage origin", () => {
  const manifest: PerformanceManifest = {
    video: VIDEO,
    durationInFrames: 24,
    actors: [{ id: "server", placement: { at: [300, 691] }, scale: 0.88, present: true }],
    camera: [{ frame: 0, x: 120, y: 40, z: 1, rotation: 0 }],
    tracks: [{ kind: "camera", subject: "camera", target: "ghost", events: [
      { frame: 0, durationFrames: 12, operation: "follow", target: "ghost", x: 0, y: 0, z: 1, value: { operation: "follow", target: "ghost", zoom: 1 } },
    ] }],
  };
  const state = evaluatePerformance(manifest, 6);
  assert.equal(state.camera.x, 120, "an unresolvable follow leaves the camera where it was");
  assert.equal(state.camera.y, 40);
  assert.equal(state.camera.z, 1);
});
