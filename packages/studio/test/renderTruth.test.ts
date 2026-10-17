/**
 * Render truth for the M5 acting study (docs/ART_ACTING_M5.md "Render truth").
 *
 * Every earlier m5-acting check measured the motor's own bake, so a bake could
 * only be compared to a render by hand — and the WP3 review compared one
 * revision's numbers with another revision's stills (frame 53 of the 12.15 s
 * bake is not frame 53 of the 14.35 s bake: the drawn holder stands 90 px left
 * of the baked one). This test closes that class: it derives each beat's key
 * frame FROM THE COMPILED BAKE and judges what the renderer draws there through
 * the renderer's own pose path (`evaluatePerformance` -> `solveActorFigure` ->
 * `designHandToWorld`), never through the motor's beliefs.
 *
 * Tolerances are px of drawing: the IK is exact, so 4 px is ink; 20 px is a
 * visibly hopeless contact.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {
  compileEpisode,
  loadAssetRegistry,
  loadPlugins,
  type CompiledEpisode,
} from "../../core/src/index";
import {solidSupport, thermosSolid, transformSolid} from "../../core/src/motor/propGeometry";
import {evaluatePerformance} from "../src/performance/evaluate";
import {solveActorFigure} from "../src/components/performance/Actor";
import {designHandToWorld} from "../src/components/performance/reach";
import type {PerformanceManifest} from "../src/performance/types";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const FPS = 24;
const STAGE_HEIGHT = 1080;
/** A drawn hand on its baked reach point: the IK is exact, so this is ink. */
const HAND_TOLERANCE_PX = 4;
/** A drawn pose channel against the baked one: exact, so this is float slop. */
const POSE_TOLERANCE = 0.5;

type Arm = {upper: number; lower: number; hand: string};
type Leg = {upper: number; lower: number};
type MotorFrame = {
  x: number; facing?: number; lean?: number; walk?: number; crouch?: number;
  reach?: [number, number]; reachInfluence?: number; contact?: boolean; holds?: string;
  skeletonPose?: {waistPitch?: number; waistY?: number; torsoScaleY?: number; armR?: Arm; armL?: Arm; legR?: Leg; legL?: Leg};
};
interface MotorScene {
  motor: {actors: Record<string, MotorFrame[]>; props: Record<string, Array<{x: number; y: number; rotation?: number}>>; diagnostics?: string[]};
  staging: {actors: Record<string, {at: [number, number]; scale: number}>; objects: Record<string, {scale: number}>};
  supportSurfaces?: Array<{name: string; x: [number, number]; y: number}>;
  performanceTracks: Array<{subject?: string; events: Array<{kind: string; start?: number; end?: number; call?: {path?: string}}>}>;
}

let compiledOnce: Promise<{compiled: CompiledEpisode; scene: MotorScene; manifest: PerformanceManifest}> | undefined;
function compilePromise() {
  return (compiledOnce ??= compile());
}

async function compile(): Promise<{compiled: CompiledEpisode; scene: MotorScene; manifest: PerformanceManifest}> {
  const registry = await loadAssetRegistry(resolve(REPO, "library"));
  const plugins = await loadPlugins(resolve(REPO, "library"));
  const compiled = await compileEpisode(resolve(REPO, "episodes", "m5-acting", "episode.yml"), {
    registry,
    plugins,
    speechTiming: () => ({durationSec: 1, markers: {}}),
  });
  // Exactly the renderer's input shape (packages/cli yamlPipeline performanceManifest).
  const manifest = {
    version: 1,
    timebase: "seconds" as const,
    video: {width: 1920, height: 1080, fps: FPS},
    duration: compiled.totalDuration,
    total: compiled.totalDuration,
    ...compiled,
  } as unknown as PerformanceManifest;
  return {compiled, scene: compiled.sceneTrack[0] as unknown as MotorScene, manifest};
}

/** The beat's frame window: from its authored cue to the next cue in the scene,
 *  both read from the compiled call track (never copied by hand). */
function beatWindow(scene: MotorScene, path: string): [number, number] {
  const starts = scene.performanceTracks
    .flatMap((track) => track.events)
    .filter((event) => event.call?.path)
    .map((event) => Math.round((event.start ?? 0) * FPS))
    .sort((a, b) => a - b);
  const cue = scene.performanceTracks
    .flatMap((track) => track.events)
    .find((event) => event.call?.path === path);
  if (!cue) throw new Error(`no compiled call ${path}`);
  const start = Math.round((cue.start ?? 0) * FPS);
  const next = starts.find((value) => value > start) ?? Number.POSITIVE_INFINITY;
  return [start, next];
}

function firstFrame(frames: MotorFrame[], from: number, to: number, pred: (frame: MotorFrame, index: number) => boolean): number {
  for (let frame = from; frame < to && frame < frames.length; frame++) {
    if (pred(frames[frame]!, frame)) return frame;
  }
  throw new Error(`no matching frame in [${from}, ${to})`);
}

/** Each beat's key frame, derived from the bake rather than copied by hand. */
function keyFrames(scene: MotorScene) {
  const lin = scene.motor.actors.lin!;
  const awei = scene.motor.actors.awei!;
  const [pickupStart, pickupEnd] = beatWindow(scene, "prop.pickup");
  const [handoverStart, handoverEnd] = beatWindow(scene, "prop.handover");
  const [putdownStart, putdownEnd] = beatWindow(scene, "prop.putdown");
  const [pointStart, pointEnd] = beatWindow(scene, "action.point");
  const [surpriseStart, surpriseEnd] = beatWindow(scene, "action.raise_hand");
  const [pushStart] = beatWindow(scene, "action.push");
  /** The frame whose baked reach is furthest along `axis` (the aim/apex). */
  const extreme = (frames: MotorFrame[], from: number, to: number, better: (value: number, best: number) => boolean, axis: 0 | 1) => {
    let found = -1;
    let best = 0;
    for (let frame = from; frame < to && frame < frames.length; frame++) {
      const value = frames[frame]!.reach?.[axis];
      if (value === undefined) continue;
      if (found < 0 || better(value, best)) { found = frame; best = value; }
    }
    assert.ok(found >= 0, `no baked reach in [${from}, ${to})`);
    return found;
  };
  const bind = firstFrame(lin, pickupStart, pickupEnd, (frame) => frame.holds !== undefined);
  // The pickup's key pose is the LIFT, not the grip: the first frame after the
  // bind whose baked prop is clearly off the floor (docs/ART_ACTING_M5.md).
  const floorY = scene.staging.actors.lin!.at[1] * STAGE_HEIGHT;
  const carriedFrames = scene.motor.props.thermos!;
  let lift = bind;
  for (let frame = bind; frame < pickupEnd; frame++) {
    if (carriedFrames[frame]!.y <= floorY - 24) { lift = frame; break; }
  }
  return {
    pickup: {frame: lift, cue: pickupStart, actor: "lin"},
    handover: {frame: firstFrame(awei, handoverStart, handoverEnd, (frame) => frame.holds !== undefined), cue: handoverStart, actor: "awei"},
    putdown: {frame: firstFrame(awei, putdownStart, putdownEnd, (frame, index) => index > putdownStart && frame.holds === undefined), cue: putdownStart, actor: "awei"},
    point: {frame: extreme(awei, pointStart, pointEnd, (value, best) => value > best, 0), cue: pointStart, actor: "awei"},
    surprise: {frame: extreme(lin, surpriseStart, surpriseEnd, (value, best) => value < best, 1), cue: surpriseStart, actor: "lin"},
    push: {frame: firstFrame(awei, pushStart, awei.length, (frame) => frame.contact === true), cue: pushStart, actor: "awei"},
  };
}

/** The pose the renderer draws at `frame`, in world stage px. */
function drawn(manifest: PerformanceManifest, _scene: MotorScene, frame: number, id: string) {
  const state = evaluatePerformance(manifest, frame);
  const actor = state.actors.find((candidate) => candidate.id === id);
  assert.ok(actor, `actor ${id} missing from frame ${frame}`);
  const figure = solveActorFigure(actor);
  const joints = figure.solved!.joints as unknown as Record<string, [number, number]>;
  const world = (joint: "hand_r" | "elbow_r" | "shoulder_r") => {
    const design = joints[joint];
    assert.ok(design, `drawn ${joint} missing at frame ${frame}`);
    return designHandToWorld(actor, design, figure.space, figure.flipped);
  };
  return {actor, figure, world};
}

/** Distance between the drawn right hand and the bake's own reach point. A
 *  loaded key frame has no withdrawal influence: the hand is exactly on its
 *  aim, so the gap is measured against the reach itself. */
function handGap(manifest: PerformanceManifest, scene: MotorScene, frame: number, id: string): number {
  const bake = scene.motor.actors[id]![frame]!;
  assert.ok(bake.reach, `${id} f${frame} has no baked reach`);
  assert.equal(bake.reachInfluence ?? 1, 1, `${id} f${frame} is withdrawing; a loaded key frame has no blend`);
  const hand = drawn(manifest, scene, frame, id).world("hand_r");
  return Math.hypot(hand[0] - bake.reach[0], hand[1] - bake.reach[1]);
}

test("m5-acting: at every beat's key frame the renderer draws the baked pose", async () => {
  const {scene, manifest} = await compilePromise();
  const keys = keyFrames(scene);
  for (const [beat, {frame, actor}] of Object.entries(keys)) {
    for (const id of ["lin", "awei"]) {
      const bake = scene.motor.actors[id]![frame]!;
      const pose = bake.skeletonPose;
      assert.ok(pose, `${beat}/${id} f${frame}: baked frame carries no drawn pose`);
      const draw = drawn(manifest, scene, frame, id);
      const figure = draw.figure;
      assert.ok(Math.abs(figure.waistPitch - (pose.waistPitch ?? 0)) <= POSE_TOLERANCE,
        `${beat}/${id} f${frame}: drawn waist pitch ${figure.waistPitch.toFixed(2)}° is not the baked ${(pose.waistPitch ?? 0).toFixed(2)}°`);
      assert.ok(Math.abs((figure.pose.torsoY ?? 0) - (pose.waistY ?? 0)) <= POSE_TOLERANCE,
        `${beat}/${id} f${frame}: drawn pelvis drop ${(figure.pose.torsoY ?? 0).toFixed(2)} is not the baked ${(pose.waistY ?? 0).toFixed(2)}`);
      for (const [side, drawnArm, bakedArm] of [["r", figure.pose.armRight, pose.armR], ["l", figure.pose.armLeft, pose.armL]] as const) {
        if (!bakedArm) continue;
        assert.ok(Math.abs(drawnArm.upper - bakedArm.upper) <= POSE_TOLERANCE && Math.abs(drawnArm.lower - bakedArm.lower) <= POSE_TOLERANCE,
          `${beat}/${id} f${frame}: drawn arm_${side} ${drawnArm.upper.toFixed(1)}/${drawnArm.lower.toFixed(1)} is not the baked ${bakedArm.upper.toFixed(1)}/${bakedArm.lower.toFixed(1)}`);
      }
      for (const [side, drawnLeg, bakedLeg] of [["r", figure.pose.legRight, pose.legR], ["l", figure.pose.legLeft, pose.legL]] as const) {
        if (!bakedLeg) continue;
        assert.ok(Math.abs(drawnLeg.upper - bakedLeg.upper) <= POSE_TOLERANCE && Math.abs(drawnLeg.lower - bakedLeg.lower) <= POSE_TOLERANCE,
          `${beat}/${id} f${frame}: drawn leg_${side} ${drawnLeg.upper.toFixed(1)}/${drawnLeg.lower.toFixed(1)} is not the baked ${bakedLeg.upper.toFixed(1)}/${bakedLeg.lower.toFixed(1)}`);
      }
    }
    const baked = scene.motor.actors[actor]![frame]!;
    // A release frame is already withdrawing: its hand is between the aim and
    // rest by design, so only a loaded key frame pins the hand to the aim.
    if (baked.reach && (baked.reachInfluence ?? 1) === 1) {
      const gap = handGap(manifest, scene, frame, actor);
      assert.ok(gap <= HAND_TOLERANCE_PX,
        `${beat}/${actor} f${frame}: the drawn hand is ${gap.toFixed(1)} px off the baked reach`);
    }
  }
});

test("m5-acting: the drawn prop follows the bake at the pickup and putdown keys", async () => {
  const {compiled, scene, manifest} = await compilePromise();
  const objects = (compiled as unknown as {assets: {objects: Record<string, {resolved?: {placement?: {size?: [number, number]; base?: number}}}>}}).assets.objects;
  const placement = objects.thermos!.resolved!.placement!;
  const solid = transformSolid(thermosSolid, placement.size ?? [200, 160], placement.base ?? 160, scene.staging.objects.thermos!.scale);
  const drawnProp = (frame: number) => {
    const prop = evaluatePerformance(manifest, frame).props.find((candidate) => candidate.id === "thermos");
    assert.ok(prop, `frame ${frame} draws no thermos`);
    const support = solidSupport(solid, prop.rotation ?? 0);
    return {drawn: prop.y + support.y, x: prop.x + support.x, bake: scene.motor.props.thermos![frame]!};
  };
  const keys = keyFrames(scene);
  const floorY = scene.staging.actors.lin!.at[1] * STAGE_HEIGHT;
  const pickup = drawnProp(keys.pickup.frame);
  assert.ok(Math.abs(pickup.drawn - (pickup.bake.y + solidSupport(solid, pickup.bake.rotation ?? 0).y)) <= 1.5,
    `pickup f${keys.pickup.frame}: the drawn prop follows a different position than the bake`);
  assert.ok(pickup.drawn <= floorY - 20,
    `pickup f${keys.pickup.frame}: the drawn thermos base ${pickup.drawn.toFixed(1)} has not left the floor ${floorY.toFixed(1)} at the key pose`);

  const release = keys.putdown.frame;
  const rest = drawnProp(scene.motor.actors.awei!.length - 1);
  const support = scene.supportSurfaces?.find((surface) => rest.x >= surface.x[0] * 1920 && rest.x <= surface.x[1] * 1920);
  assert.ok(support, `putdown rest f${scene.motor.actors.awei!.length - 1}: drawn prop x ${rest.x.toFixed(1)} is off every declared support`);
  assert.ok(Math.abs(rest.drawn - support.y * STAGE_HEIGHT) <= 2,
    `putdown rest: drawn prop base ${rest.drawn.toFixed(2)} is not on the declared line ${(support.y * STAGE_HEIGHT).toFixed(2)}`);
  // The placing hand returns to rest after the release instead of holding a shelf.
  // The retract influence decays over .65 s on substeps, so a sampled frame can
  // miss the exact 0; a settled retract is the influence effectively gone.
  const RETRACT_SETTLED = 0.01;
  const releaseFrame = firstFrame(scene.motor.actors.awei!, release, release + FPS,
    (frame) => frame.reachInfluence !== undefined && frame.reachInfluence <= RETRACT_SETTLED);
  const released = drawn(manifest, scene, releaseFrame, "awei");
  const arm = released.figure.pose.armRight;
  assert.ok(Math.abs(arm.upper) <= POSE_TOLERANCE && Math.abs(arm.lower) <= POSE_TOLERANCE,
    `putdown: the drawn placing arm is still ${arm.upper.toFixed(1)}/${arm.lower.toFixed(1)}° ${releaseFrame - release} frames after the release, not at rest`);
});

test("m5-acting: the point key draws a shaped elbow and the pickup key a crouch", async () => {
  const {scene, manifest} = await compilePromise();
  const keys = keyFrames(scene);
  const point = drawn(manifest, scene, keys.point.frame, "awei");
  const shoulder = point.world("shoulder_r");
  const elbow = point.world("elbow_r");
  const hand = point.world("hand_r");
  const upper = [elbow[0] - shoulder[0], elbow[1] - shoulder[1]];
  const fore = [hand[0] - elbow[0], hand[1] - elbow[1]];
  const interior = 180 - Math.acos(Math.max(-1, Math.min(1,
    (upper[0] * fore[0] + upper[1] * fore[1]) / (Math.hypot(upper[0], upper[1]) * Math.hypot(fore[0], fore[1]) || 1)))) * 180 / Math.PI;
  assert.ok(interior >= 100 && interior <= 165,
    `point f${keys.point.frame}: drawn elbow interior ${interior.toFixed(1)}° is not a shaped point (100–165°)`);
  const pickup = drawn(manifest, scene, keys.pickup.frame, "lin");
  const standing = drawn(manifest, scene, 0, "lin");
  const drop = (pickup.figure.pose.torsoY ?? 0);
  assert.ok(drop >= 60,
    `pickup f${keys.pickup.frame}: drawn pelvis drop ${drop.toFixed(1)} px is not a crouch (standing ${(standing.figure.pose.torsoY ?? 0).toFixed(1)})`);
});

test("m5-acting: the key-frame check can tell one frame from another", async () => {
  // Falsifiability (@gate_probe): the drawn pose measured against a DIFFERENT
  // frame's baked reach fails loudly, so a stale frame index cannot pass.
  const {scene, manifest} = await compilePromise();
  const point = keyFrames(scene).point.frame;
  const hand = drawn(manifest, scene, point, "awei").world("hand_r");
  assert.ok(handGap(manifest, scene, point, "awei") <= HAND_TOLERANCE_PX,
    `point f${point}: the drawn hand is off its own baked reach`);
  const stale = point - 40;
  const reach = scene.motor.actors.awei![stale]!.reach!;
  const elsewhere = Math.hypot(hand[0] - reach[0], hand[1] - reach[1]);
  assert.ok(elsewhere > 20,
    `point f${point}: the drawn hand is only ${elsewhere.toFixed(1)} px from f${stale}'s baked reach — the check cannot see a stale frame index`);
});
