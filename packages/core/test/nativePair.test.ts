import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {simulateScene, type MotorPropInput, type MotorScene} from "../src/motor";
import {PropAssetManifestSchema, type Skeleton} from "../src/schemas/libraryMeta";

// EP (docs/ART_ASSET_PROGRAM.md, package 3): two NATIVE artwork figures in one
// bake. One native actor alone bakes clean, so the defect is in the pair: a
// native receiver, or a second native body anywhere in the scene, made the
// whole-body proposal refuse every substep of the return and freeze the beat.
// This file pins the two measured refusals so the fix has a fixed observation,
// and proves the fixed pair with a native serve followed by a native return.

const FLOOR = 691;
/** The serve is struck from the server's own hand (E2's hook): the shuttle
 *  starts in the palm, so the beat has nothing to walk to. */
const HAND_X = 700;
const HAND_Y = 310;
const SERVER_X = 640;

const artwork = JSON.parse(readFileSync(new URL("../../../library/figure/athlete_a/artwork.json", import.meta.url), "utf8"));
const ATHLETE_VIEWS = Object.fromEntries(Object.entries(artwork.views).map(([view, value]) => [view, (value as {skeleton: Skeleton}).skeleton])) as Record<string, Skeleton>;
const LEGACY_SKELETON: Skeleton = JSON.parse(readFileSync(new URL("../../../library/figure/lin/skeleton.json", import.meta.url), "utf8"));

/** The shuttle's declared physics and drawn body box, read through the same
 *  schema the asset registry loads it with (identical to projectile.test.ts). */
const SHUTTLE = (() => {
  const raw = JSON.parse(readFileSync(new URL("../../../library/prop/shuttle/manifest.json", import.meta.url), "utf8")) as {placement: unknown};
  const {placement} = PropAssetManifestSchema.parse({identity: "prop/shuttle", kind: "prop", placement: raw.placement});
  assert.ok(placement.projectile, "the shuttle must declare its flight physics");
  const scale = placement.stageWidth / placement.size[0];
  const [bx0, by0, bx1, by1] = placement.body!;
  return {placement, projectile: placement.projectile,
    touchBox: {a: [(bx0 - 100) * scale, -(placement.base - by0) * scale] as [number, number],
      b: [(bx1 - 100) * scale, -(placement.base - by1) * scale] as [number, number]}};
})();

interface PairOptions {
  /** Receiver staged on native artwork (the pair case) or the legacy figure. */
  nativeReceiver: boolean;
  beatAt: number;
  receiverX: number;
}

/** The serve, then the receiver's beat: the arc descends through hand height
 *  and a second native athlete strikes it in the air. */
function pairScene(options: PairOptions): MotorScene {
  const prop: MotorPropInput = {id: "shuttle", x: HAND_X, y: HAND_Y, size: SHUTTLE.placement.size,
    touchBox: SHUTTLE.touchBox, projectile: SHUTTLE.projectile, intents: []};
  return {
    durationSec: 5,
    actors: [
      {id: "athlete", x: SERVER_X, groundY: FLOOR, facing: 1, scale: 0.88,
        skeletonViews: ATHLETE_VIEWS, orientations: [{at: 0, orientation: "right"}], poseTracks: [],
        intents: [{at: 0, duration: 1, intent: "grab", target: "shuttle"},
          {at: 1.4, duration: 1.6, intent: "push", target: "shuttle", force: 1.2, forceSec: 0.25}]},
      {id: "receiver", x: options.receiverX, groundY: FLOOR, facing: -1, scale: 0.88,
        ...(options.nativeReceiver
          ? {skeletonViews: ATHLETE_VIEWS, orientations: [{at: 0, orientation: "left"}], poseTracks: []}
          : {skeleton: LEGACY_SKELETON}),
        intents: [{at: options.beatAt, duration: 1.6, intent: "push", target: "shuttle", force: 1.2, forceSec: 0.25}]},
    ],
    props: [prop],
    supports: [{x0: 0, x1: 1920, y: FLOOR}],
    groundY: FLOOR,
    resolveX: (id) => (id === "shuttle" ? HAND_X : id === "athlete" ? SERVER_X : id === "receiver" ? options.receiverX : undefined),
  };
}

const diagnosticsOf = (baked: ReturnType<typeof simulateScene>) => baked.diagnostics ?? [];
const strikesOf = (baked: ReturnType<typeof simulateScene>) =>
  (baked.events ?? []).filter((event) => event.kind === "projectile.struck");

/** The refusals the fix removes: a whole-body exhaustion, or a diagnostic that
 *  names a non-finite input. A missing strike is a different, authored miss. */
const frozenOf = (baked: ReturnType<typeof simulateScene>) =>
  diagnosticsOf(baked).filter((line) => /whole-body proposal exhausted|-non-finite/.test(line));

test("a native receiver no longer freezes the bake on a non-finite palm solve", () => {
  // Measured before the fix (mail/2026-10-21-e2-report.md §"Could not land" 1):
  // `whole-body proposal exhausted: receiver at 2.25s; palm-contact/hand_r NaN`.
  // The native receiver's palm solve was fed a non-finite hip drop, because the
  // taut push arm dragged the root BACKWARD 885 px through its own stance in
  // one substep (a body behind the arm clamped the step), the stance feet
  // stayed where they were, and the overstretched leg annulus wrote Infinity
  // into the posture. Both the seam and the refusal class are fixed.
  const baked = simulateScene(pairScene({nativeReceiver: true, beatAt: 2.04, receiverX: 1400}));
  assert.deepEqual(frozenOf(baked), [], JSON.stringify(diagnosticsOf(baked)));
  assert.equal(strikesOf(baked).length, 1, "only the serve lands at this staged beat");
});

test("two native actors never drag a root backward and never freeze the bake", () => {
  // The same refusal with a native body on both sides. A taut push arm may only
  // pull its root in the direction the hand travels: the walk's rule, kept here
  // too, so a body behind the arm bounds nothing.
  for (const [beatAt, receiverX] of [[2.04, 1400], [1.4, 1200], [2.04, 1200]] as const) {
    const baked = simulateScene(pairScene({nativeReceiver: true, beatAt, receiverX}));
    assert.deepEqual(frozenOf(baked), [], `beat ${beatAt} @ ${receiverX}: ${JSON.stringify(frozenOf(baked))}`);
    // Backward WALKING is the beat (the receiver walks at the shuttle); a body
    // yanked through its own stance is not: no frame may travel further than a
    // walk step plus the separation allowance.
    const xs = baked.actors.receiver!.map((frame) => frame.x);
    const steps = xs.slice(1).map((x, index) => Math.abs(x - xs[index]!));
    assert.ok(Math.max(...steps) < 60,
      `the receiver's root jumped ${Math.max(...steps).toFixed(1)} px in one frame (${beatAt} @ ${receiverX})`);
  }
  // One native actor alone was already clean — the defect was the pair, not the
  // figure, and it stays clean.
  const single = simulateScene(pairScene({nativeReceiver: false, beatAt: 2.04, receiverX: 1400}));
  assert.deepEqual(diagnosticsOf(single), []);
  assert.equal(strikesOf(single).length, 2, "the legacy receiver lands the return");
});

test("a native athlete serves and a second native athlete returns: two struck contacts, empty diagnostics", () => {
  // EP's acceptance: the pair E2 could not bake — a native server and a native
  // receiver, staged where the descending arc comes back down to hand height.
  // The serve is struck from the server's own hand (E2's hook at 35b8ffd); the
  // receiver walks at the shuttle's LIVE x and strikes it in the air (a1f848a).
  const baked = simulateScene(pairScene({nativeReceiver: true, beatAt: 2.12, receiverX: 1500}));
  assert.deepEqual(diagnosticsOf(baked), [], JSON.stringify(diagnosticsOf(baked)));

  const struck = strikesOf(baked);
  assert.equal(struck.length, 2, `expected the serve and the return, got ${JSON.stringify((baked.events ?? []).map((event) => `${event.kind}@${event.at.toFixed(3)}`))}`);
  const [serve, returned] = struck as [typeof struck[number], typeof struck[number]];
  assert.ok(returned.at > serve.at, "the return follows the serve");
  assert.equal(returned.prop, "shuttle", "the return is a second beat on the same prop");

  // The serve leaves the server's hand on the engine's 40° arc, and the return
  // leaves on the same arc back toward the server's side (+x for the receiver
  // facing left: the engine strikes away from the striker's own facing).
  const elevationOf = (event: typeof serve) => Math.atan2(-event.velocity![1], Math.abs(event.velocity![0])) * 180 / Math.PI;
  assert.ok(Math.abs(elevationOf(serve) - 40) < 0.5, `the serve is not on the 40° arc: ${elevationOf(serve).toFixed(2)}°`);
  assert.ok(Math.abs(elevationOf(returned) - 40) < 0.5, `the return is not on the 40° arc: ${elevationOf(returned).toFixed(2)}°`);
  assert.ok(serve.velocity![1] < 0 && returned.velocity![1] < 0, "both strikes launch upward");
  assert.ok(Math.sign(returned.velocity![0]) !== Math.sign(serve.velocity![0]),
    "the return travels back the way the serve came");

  // Both native actors ran: the receiver was the one the return needed, and it
  // walked at the live shuttle rather than at the staged serve mark (x 700).
  const receiverX = Math.min(...baked.actors.receiver!.map((frame) => frame.x));
  assert.ok(receiverX < 1500 - 20,
    `the receiver never walked at the shuttle's live x (min x ${receiverX.toFixed(1)})`);
  assert.ok((baked.props.shuttle ?? []).every((frame) => Number.isFinite(frame.x) && Number.isFinite(frame.y)),
    "the shuttle's flight must stay finite");
});
