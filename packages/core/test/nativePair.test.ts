import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {simulateScene, type MotorPropInput, type MotorScene} from "../src/motor";
import {PropAssetManifestSchema, type Skeleton} from "../src/schemas/libraryMeta";

// EP (docs/0_ROADMAP.md, package 3): two NATIVE artwork figures in one
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
  // Measured before the fix (evidence/tickets/SLICE-A-ENGINE.md §EP, limit 1):
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

  // Both native actors ran: the receiver was the one the return needed. R8's
  // interception solves the meeting point from the arm envelope and the walk,
  // so the receiver no longer has to march to the shuttle's live x — it may
  // stand and reach. What must stay true is that it never chases the STAGED
  // serve mark (x 700): a beat aimed there would walk it out of the rally.
  const receiverX = Math.min(...baked.actors.receiver!.map((frame) => frame.x));
  assert.ok(receiverX > 1300,
    `the receiver walked toward the staged serve mark (min x ${receiverX.toFixed(1)})`);
  assert.ok((baked.props.shuttle ?? []).every((frame) => Number.isFinite(frame.x) && Number.isFinite(frame.y)),
    "the shuttle's flight must stay finite");
});

test("the return is cueable across a 0.26 s window: seven of the eleven beats land a second struck contact", () => {
  // R8's acceptance: slice A's return only landed from the one cue that happened
  // to put the hand inside the box at the lucky frame (measured before the fix:
  // cue 2.12 only; 1.90–2.04 and 2.16–2.40 failed, two of them freezing the
  // whole-body proposal). The interception solve makes a hand-authorable band.
  const CUES = [1.90, 1.96, 2.00, 2.04, 2.08, 2.12, 2.16, 2.20, 2.26, 2.32, 2.40];
  const landed: number[] = [];
  for (const cue of CUES) {
    const baked = simulateScene(pairScene({nativeReceiver: true, beatAt: cue, receiverX: 1500}));
    const struck = strikesOf(baked);
    if (struck.length < 2) continue;
    assert.deepEqual(diagnosticsOf(baked), [], `cue ${cue.toFixed(2)} landed with diagnostics`);
    assert.equal(struck.length, 2, `cue ${cue.toFixed(2)} struck ${struck.length} times`);
    const [serve, returned] = struck as [typeof struck[number], typeof struck[number]];
    assert.ok(returned.at > serve.at, `cue ${cue.toFixed(2)}: the return does not follow the serve`);
    // Every return is a real strike on the engine's one arc, back toward the
    // server: the same 40° elevation and the same speed the serve leaves at.
    const elevation = Math.atan2(-returned.velocity![1], Math.abs(returned.velocity![0])) * 180 / Math.PI;
    assert.ok(Math.abs(elevation - 40) < 0.5, `cue ${cue.toFixed(2)}: the return is off the 40° arc (${elevation.toFixed(2)}°)`);
    assert.ok(returned.velocity![0] < 0, `cue ${cue.toFixed(2)}: the return did not travel back toward the server`);
    landed.push(cue);
  }
  // The measured band: 1.90 through 2.16 inclusive (0.26 s), seven cues. The AC
  // floor is six; the first six are the minimum a shot may author against.
  assert.ok(landed.length >= 6, `only ${landed.length} of eleven cues landed a return: ${landed.join(', ')}`);
  assert.deepEqual(landed, [1.90, 1.96, 2.00, 2.04, 2.08, 2.12, 2.16],
    `the cueable band moved: ${landed.join(', ')}`);
  assert.ok(landed.at(-1)! - landed[0]! >= 0.25,
    `the cueable window is only ${(landed.at(-1)! - landed[0]!).toFixed(2)} s wide`);
});

test("a return cue outside the window is named a strike miss: never a freeze, never a non-finite frame", () => {
  // AC (b): a beat that cannot meet the shuttle is an authored miss the author
  // can read. Before R8 two of these froze the whole-body proposal
  // (`whole-body proposal exhausted` / `segment-angle-rate/hand_r 8.419`). The
  // miss is decided by the solve at the cue (no drive is staged at a pose no
  // body can hold), so the class is stable and the trajectory stays finite.
  for (const cue of [2.20, 2.26, 2.32, 2.40]) {
    const baked = simulateScene(pairScene({nativeReceiver: true, beatAt: cue, receiverX: 1500}));
    assert.equal(strikesOf(baked).length, 1, `cue ${cue.toFixed(2)}: only the serve may land`);
    assert.deepEqual(frozenOf(baked), [], `cue ${cue.toFixed(2)} froze: ${JSON.stringify(frozenOf(baked))}`);
    const diagnostics = diagnosticsOf(baked);
    assert.equal(diagnostics.length, 1, `cue ${cue.toFixed(2)}: ${JSON.stringify(diagnostics)}`);
    assert.match(diagnostics[0]!, /^strike missed: receiver never touched shuttle; /, `cue ${cue.toFixed(2)}: ${diagnostics[0]}`);
    assert.ok(!/NaN|Infinity|-non-finite/.test(diagnostics[0]!), `cue ${cue.toFixed(2)} names a non-finite value: ${diagnostics[0]}`);
    assert.ok((baked.props.shuttle ?? []).every((frame) => Number.isFinite(frame.x) && Number.isFinite(frame.y)),
      `cue ${cue.toFixed(2)}: the shuttle's flight went non-finite`);
    assert.ok(baked.actors.receiver!.every((frame) => Number.isFinite(frame.x)),
      `cue ${cue.toFixed(2)}: the receiver's trajectory went non-finite`);
  }
});

test("the interception leaves the serve exactly where it was: 1.407 s on the 40° arc, whether the return lands or not", () => {
  // AC (c): the rally's mechanism must not move the accepted serve. The first
  // struck contact is identical for a cue inside and outside the return window,
  // and for the pre-R8 beat that landed — the interception only changes what the
  // RECEIVER does after the shuttle is already in flight.
  const serveOf = (cue: number) => strikesOf(simulateScene(pairScene({nativeReceiver: true, beatAt: cue, receiverX: 1500})))[0]!;
  const serve = serveOf(2.12);
  assert.equal(serve.at, 1.407, `the serve moved to ${serve.at} s`);
  assert.deepEqual(serve.velocity, [1000, -839], `the serve left at ${JSON.stringify(serve.velocity)}`);
  for (const cue of [1.90, 2.16, 2.40]) {
    const other = serveOf(cue);
    assert.equal(other.at, serve.at, `cue ${cue.toFixed(2)} moved the serve to ${other.at} s`);
    assert.deepEqual(other.velocity, serve.velocity, `cue ${cue.toFixed(2)} changed the serve's launch velocity`);
  }
});
