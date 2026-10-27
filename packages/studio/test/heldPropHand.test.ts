// R9 — does the drawn RACKET's handle sit in the drawn HAND? (docs/0_ROADMAP.md
// §R9; contract in docs/8_MOTOR.md "Prop placement (one authority)").
//
// Two blind reviews of `episodes/a-rally` said the racket is never in a hand:
// "his hands are 30–70 px from the grip in every frame". The bake was right and
// the DRAWING was wrong twice over, so this file measures the drawing through
// the renderer's own path and nothing else:
//
//   drawn socket = the evaluated prop (x/y/rotation/scale) run through the
//                  `Prop` element's own placement of its declared art,
//   drawn palm   = the artwork's own hand layer (`figureHandAnchor`) composed
//                  through the drawn arm and torso (`drawnArmPoint`).
//
// Measured before the fix, per held frame: 53.7 px — 11.2 px of it the prop
// drawn at scale 1 while the motor sized its socket at the declared 1.7, and
// 49.6 px of it the hand joint the motor carried by versus the hand the side
// view paints. Tolerance: a hand is the declared palm circle's diameter, 2 x
// 9.5 art px x the actor's stage scale.
import {test} from "node:test";
import assert from "node:assert/strict";
import {resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {compileEpisode, loadAssetRegistry, loadPlugins} from "../../core/src/index";
import {figureHandAnchor, figureViewForOrientation} from "../../core/src/schemas/figureArtwork";
import {evaluatePerformance} from "../src/performance/evaluate";
import {solveActorFigure} from "../src/components/performance/Actor";
import {designHandToWorld, drawnArmPoint} from "../src/components/performance/reach";
import type {EvaluatedActor, EvaluatedProp, PerformanceFrameState, PerformanceManifest} from "../src/performance/types";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const FPS = 24;
const STAGE_HEIGHT = 1080;

/** The compiled manifest of one episode, exactly as the renderer receives it. */
async function compile(slug: string): Promise<PerformanceManifest> {
  const registry = await loadAssetRegistry(resolve(REPO, "library"));
  const plugins = await loadPlugins(resolve(REPO, "library"));
  const compiled = await compileEpisode(resolve(REPO, "episodes", slug, "episode.yml"), {
    registry,
    plugins,
    speechTiming: () => ({durationSec: 1, markers: {}}),
  });
  return {version: 1, timebase: "seconds", video: {width: 1920, height: 1080, fps: FPS}, duration: compiled.totalDuration, total: compiled.totalDuration, ...compiled} as unknown as PerformanceManifest;
}

type Placement = {base: number; size: [number, number]; stageWidth?: number; grip?: {at: [number, number]}; body?: [number, number, number, number]};

/** The prop's declared art geometry, read from the compiled asset the drawing uses. */
function placementOf(manifest: PerformanceManifest, id: string): Placement {
  const assets = (manifest as unknown as {assets: {objects: Record<string, {resolved?: {placement?: Placement}}>}}).assets;
  const placement = assets.objects[id]?.resolved?.placement;
  assert.ok(placement, `the compiled manifest declares no placement for ${id}`);
  return placement;
}

/** The declared stage scale staging puts on the prop — the scale the motor sized
 *  its body box and its socket with. */
function declaredScale(manifest: PerformanceManifest, id: string): number {
  const scenes = (manifest as unknown as {sceneTrack: Array<{staging: {objects: Record<string, {scale?: number}>}}>}).sceneTrack;
  const staged = scenes.map((scene) => scene.staging.objects[id]).find((object) => object !== undefined);
  assert.ok(staged?.scale, `staging declares no scale for ${id}`);
  return staged.scale;
}

/** Where `Prop.tsx` actually paints the declared socket: the element anchors the
 *  art's (100, base) point at (x, y) — the base origin — lays art unit u out at
 *  `size/200` and `size/160` px, then rotates and scales about that origin. */
function drawnSocket(prop: EvaluatedProp, placement: Placement): [number, number] {
  const [width, height] = placement.size;
  const at = placement.grip!.at;
  const relative: [number, number] = [width * (at[0] / 200 - 0.5), height * (at[1] - (placement.base ?? 160)) / 160];
  const radians = ((prop.rotation ?? 0) * Math.PI) / 180;
  const scale = prop.scale;
  return [
    prop.x + scale * (relative[0] * Math.cos(radians) - relative[1] * Math.sin(radians)),
    prop.y + scale * (relative[0] * Math.sin(radians) + relative[1] * Math.cos(radians)),
  ];
}

/** The palm the ARTWORK paints for one hand, in stage world coordinates. */
function drawnPalm(actor: EvaluatedActor, side: "l" | "r"): [number, number] {
  assert.ok(actor.artwork, `${actor.id} draws no native artwork`);
  const view = actor.artwork.views[figureViewForOrientation(actor.orientation)];
  const anchor = figureHandAnchor(view.hands[side].rest);
  assert.ok(anchor, `${actor.id}'s hand layer declares no paintable palm`);
  const figure = solveActorFigure(actor);
  const arm = side === "l" ? figure.pose.armLeft : figure.pose.armRight;
  return drawnArmPoint(actor, arm, anchor.at, side, figure.flipped, {drop: figure.pose.torsoY, scaleY: figure.pose.torsoScaleY});
}

/** The hand joint the motor carries a prop by — the point the drawing used to
 *  land on, and the point this test must be able to tell from the painted palm. */
function drawnJoint(actor: EvaluatedActor, side: "l" | "r"): [number, number] {
  const view = actor.artwork!.views[figureViewForOrientation(actor.orientation)];
  const figure = solveActorFigure(actor);
  const arm = side === "l" ? figure.pose.armLeft : figure.pose.armRight;
  return drawnArmPoint(actor, arm, view.skeleton.joints[`hand_${side}`]!, side, figure.flipped, {drop: figure.pose.torsoY, scaleY: figure.pose.torsoScaleY});
}

/** A hand's width: the declared palm contact circle's diameter at stage scale. */
function handWidth(actor: EvaluatedActor, side: "l" | "r"): number {
  const view = actor.artwork!.views[figureViewForOrientation(actor.orientation)];
  const shape = view.skeleton.parts[`hand_${side}`] as {circle?: {radius: number}} | undefined;
  assert.ok(shape?.circle, `${actor.id} declares no palm circle`);
  return 2 * shape.circle.radius * actor.scale;
}

const distance = (a: [number, number], b: [number, number]): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
const holderOf = (state: PerformanceFrameState, id: string): {actor: EvaluatedActor; side: "l" | "r"} | undefined => {
  for (const actor of state.actors) {
    if (actor.holds === id) return {actor, side: "r"};
    if (actor.holdsL === id) return {actor, side: "l"};
  }
  return undefined;
};

test("R9: the drawn racket's declared handle sits in the drawn palm on every held frame of the rally and the served episode", async () => {
  for (const slug of ["a-rally", "a-badminton"]) {
    const manifest = await compile(slug);
    const placement = placementOf(manifest, "racket");
    const frames = manifest.durationInFrames ?? Math.round((manifest.totalDuration ?? 0) * FPS);
    const scale = declaredScale(manifest, "racket");
    assert.equal(scale, placement.stageWidth! / placement.size[0], `${slug}: the staging scale is not stageWidth/size`);
    let held = 0;
    let worst = 0;
    let closestToJoint = Infinity;
    for (let frame = 0; frame < frames; frame += 1) {
      const state = evaluatePerformance(manifest, frame);
      const prop = state.props.find((candidate) => candidate.id === "racket");
      assert.ok(prop, `${slug} f${frame}: no racket`);
      assert.equal(prop.scale, scale, `${slug} f${frame}: the racket draws at ${prop.scale}, not its declared ${scale}`);
      const holder = holderOf(state, "racket");
      if (!holder) continue;
      held += 1;
      const socket = drawnSocket(prop, placement);
      const palm = drawnPalm(holder.actor, holder.side);
      const width = handWidth(holder.actor, holder.side);
      worst = Math.max(worst, distance(socket, palm));
      closestToJoint = Math.min(closestToJoint, distance(socket, drawnJoint(holder.actor, holder.side)));
      assert.ok(distance(socket, palm) <= width,
        `${slug} f${frame}: the drawn handle is ${distance(socket, palm).toFixed(1)} px from the drawn ${holder.side} palm, ${(distance(socket, palm) / width).toFixed(1)} hand widths`);
    }
    assert.ok(held >= frames * 0.9, `${slug}: the racket is held on only ${held} of ${frames} frames`);
    // The check can tell the painted palm from the hand joint: before R9 the
    // socket sat ON the joint, which is 49.6 px from the palm this view paints.
    assert.ok(closestToJoint > handWidth(evaluatePerformance(manifest, 0).actors.find((actor) => actor.id === "server")!, "l"),
      `${slug}: the socket is within a hand of the hand JOINT too, so this test cannot tell the painted palm from the joint`);
    console.log(`R9 ${slug}: ${held}/${frames} held frames, worst handle-to-palm ${worst.toFixed(2)} px, nearest to the joint ${closestToJoint.toFixed(1)} px`);
  }
});

test("R9: a picked-up prop and a prop carried after a handover draw in their holder's painted palm", async () => {
  // m5-acting is the authored pickup → handover → putdown: the thermos starts on
  // the floor, lin lifts it into his right hand, awei takes it across the gap.
  const manifest = await compile("m5-acting");
  const placement = placementOf(manifest, "thermos");
  const frames = manifest.durationInFrames ?? Math.round((manifest.totalDuration ?? 0) * FPS);
  const scale = declaredScale(manifest, "thermos");
  const seen = new Map<string, number>();
  for (let frame = 0; frame < frames; frame += 1) {
    const state = evaluatePerformance(manifest, frame);
    const prop = state.props.find((candidate) => candidate.id === "thermos");
    assert.ok(prop, `f${frame}: no thermos`);
    assert.equal(prop.scale, scale, `f${frame}: the thermos draws at ${prop.scale}, not its declared ${scale}`);
    const holder = holderOf(state, "thermos");
    if (!holder) continue;
    seen.set(holder.actor.id, (seen.get(holder.actor.id) ?? 0) + 1);
    const socket = drawnSocket(prop, placement);
    const palm = drawnPalm(holder.actor, holder.side);
    const width = handWidth(holder.actor, holder.side);
    assert.ok(distance(socket, palm) <= width,
      `f${frame}: ${holder.actor.id}'s ${holder.side} hand draws the handle ${distance(socket, palm).toFixed(1)} px away, ${(distance(socket, palm) / width).toFixed(1)} hand widths`);
  }
  const lin = seen.get("lin") ?? 0;
  const awei = seen.get("awei") ?? 0;
  assert.ok(lin > FPS, `the pickup binds the thermos for only ${lin} frames`);
  assert.ok(awei > FPS, `the handover carries the thermos for only ${awei} frames`);
  console.log(`R9 m5-acting: picked up ${lin} frames in lin's hand, carried ${awei} frames in awei's after the handover`);
});

const quad = (box: [number, number, number, number]): Array<[number, number]> => [[box[0], box[1]], [box[2], box[1]], [box[2], box[3]], [box[0], box[3]]];
const insideQuad = (point: [number, number], corners: Array<[number, number]>): boolean => {
  let side = 0;
  for (let i = 0; i < 4; i += 1) {
    const a = corners[i]!, b = corners[(i + 1) % 4]!;
    const cross = (b[0] - a[0]) * (point[1] - a[1]) - (b[1] - a[1]) * (point[0] - a[0]);
    if (Math.abs(cross) < 1e-9) continue;
    if (side === 0) side = Math.sign(cross);
    else if (Math.sign(cross) !== side) return false;
  }
  return true;
};
const boxCorners = (box: [number, number, number, number], placement: Placement, prop: EvaluatedProp): Array<[number, number]> => {
  const scale = prop.scale;
  const radians = ((prop.rotation ?? 0) * Math.PI) / 180;
  const base = placement.base ?? 160;
  return quad(box).map(([ax, ay]) => {
    const relative: [number, number] = [ax - 100, ay - base];
    return [prop.x + scale * (relative[0] * Math.cos(radians) - relative[1] * Math.sin(radians)),
      prop.y + scale * (relative[0] * Math.sin(radians) + relative[1] * Math.cos(radians))] as [number, number];
  });
};
/** The FACE, as the artwork itself paints it: the eye ellipses' centres and the
 *  mouth's path points (athlete_a `side`: eyes at design (219,106) and (229,106),
 *  mouth at 224..232 / 142). A prop solid that contains one of those points is
 *  painting over the face — a head BOX is not the test, because at a 69 deg torso
 *  pitch its corners reach a third of a metre past the drawn head. */
function facePoints(actor: EvaluatedActor): Array<[number, number]> {
  const view = actor.artwork!.views[figureViewForOrientation(actor.orientation)];
  const design: Array<[number, number]> = [];
  for (const match of view.eyes.open.matchAll(/<ellipse[^>]*\bcx="([\d.]+)"[^>]*\bcy="([\d.]+)"/g)) design.push([Number(match[1]), Number(match[2])]);
  for (const match of view.emotionMouths.calm.matchAll(/[MLQ]\s*([-\d.]+)[\s,]+([-\d.]+)/g)) design.push([Number(match[1]), Number(match[2])]);
  assert.ok(design.length >= 4, `${actor.id}: the artwork paints no face to check against`);
  const figure = solveActorFigure(actor);
  const waist = view.skeleton.joints.waist!;
  const space = view.skeleton.space;
  return design.map(([x, y]) => {
    const radians = (figure.waistPitch * Math.PI) / 180;
    const dx = x - waist[0], dy = (y - waist[1]) * figure.pose.torsoScaleY;
    const local: [number, number] = [waist[0] + dx * Math.cos(radians) - dy * Math.sin(radians), waist[1] + dx * Math.sin(radians) + dy * Math.cos(radians) + figure.pose.torsoY];
    return designHandToWorld(actor, local, space, figure.flipped);
  });
}

test("R9: the off-hand carry hangs the racket clear of the painted face and of the ground", async () => {
  for (const slug of ["a-rally", "a-badminton"]) {
    const manifest = await compile(slug);
    const placement = placementOf(manifest, "racket");
    assert.ok(placement.body, `${slug}: the racket must declare a body box for this check`);
    const frames = manifest.durationInFrames ?? Math.round((manifest.totalDuration ?? 0) * FPS);
    let worstFace = 0;
    let worstClearance = Infinity;
    let upright = 0;
    for (let frame = 0; frame < frames; frame += 1) {
      const state = evaluatePerformance(manifest, frame);
      const racket = state.props.find((candidate) => candidate.id === "racket");
      const holder = holderOf(state, "racket");
      if (!racket || !holder) continue;
      // The carry hangs the prop (R9): an upright carry stands a correctly-sized
      // racket's hoop at head height, which inked across the server's face.
      if (Math.abs(racket.rotation ?? 0) <= 90) upright += 1;
      const face = facePoints(holder.actor);
      const box = boxCorners(placement.body, placement, racket);
      const onFace = face.filter((point) => insideQuad(point, box)).length;
      worstFace = Math.max(worstFace, onFace);
      const lowest = Math.max(...boxCorners(placement.body, placement, racket).map((corner) => corner[1]));
      worstClearance = Math.min(worstClearance, holder.actor.y - lowest);
    }
    assert.equal(upright, 0, `${slug}: the off-hand carry stands the prop upright on ${upright} frames`);
    assert.equal(worstFace, 0, `${slug}: the carried racket covers ${worstFace} painted eye/mouth points of the server's face`);
    assert.ok(worstClearance >= 0, `${slug}: the carried racket's body box reaches ${(-worstClearance).toFixed(1)} px through the ground line`);
    console.log(`R9 ${slug}: painted face points covered ${worstFace}, ground clearance ${worstClearance.toFixed(1)} px, carry rotation ${evaluatePerformance(manifest, 0).props.find((p) => p.id === "racket")!.rotation!.toFixed(1)} deg`);
  }
});

test("R9: the drawn prop does not jump on the frame its hold ends", async () => {
  // The painted-palm offset is a DRAWING term; on the strike frame it must be
  // released over the drop window, not vanish (measured 62 px of jump at
  // a-badminton's 2.208 s strike against the prop's own 22 px/frame).
  for (const [slug, strike] of [["a-rally", 2.307], ["a-badminton", 2.207]] as const) {
    const manifest = await compile(slug);
    const release = Math.round(strike * FPS);
    const drawn = (frame: number) => {
      const prop = evaluatePerformance(manifest, frame).props.find((candidate) => candidate.id === "shuttle");
      assert.ok(prop, `${slug} f${frame}: no shuttle`);
      return [prop.x, prop.y] as [number, number];
    };
    const step = (frame: number) => {
      const [ax, ay] = drawn(frame - 1), [bx, by] = drawn(frame);
      return Math.hypot(bx - ax, by - ay);
    };
    const atRelease = step(release);
    const after = Math.max(step(release + 1), step(release + 2));
    assert.ok(atRelease <= after * 1.5,
      `${slug}: the drawn shuttle jumps ${atRelease.toFixed(1)} px on the release frame ${release} against ${after.toFixed(1)} px of its own motion`);
    console.log(`R9 ${slug}: release-frame step ${atRelease.toFixed(1)} px vs ${after.toFixed(1)} px after`);
  }
});
