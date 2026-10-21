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

test("reproduced: a native receiver freezes the return at palm-contact/hand_r NaN", () => {
  // The measured refusal, verbatim from mail/2026-10-21-e2-report.md §"Could
  // not land" 1: the native receiver's palm solve lands a non-finite hand, and
  // the proposal reports it as a tolerance miss on a NaN ratio.
  const baked = simulateScene(pairScene({nativeReceiver: true, beatAt: 2.04, receiverX: 1400}));
  const diagnostics = diagnosticsOf(baked);
  assert.equal(diagnostics.length, 1, `expected one diagnostic, got ${JSON.stringify(diagnostics)}`);
  assert.match(diagnostics[0]!, /^whole-body proposal exhausted: receiver at [\d.]+s; palm-contact\/hand_r NaN > 0\.020/);
  assert.equal(strikesOf(baked).length, 1, "the serve lands and the frozen return never does");
});

test("reproduced: two native actors freeze the bake and the diagnostic names a NaN/Infinity ratio", () => {
  // The same refusal with a native body on both sides: the second native actor
  // is the one the report measured (`foot-reach/foot_r Infinity`, §"Could not
  // land" 2). The class is shared: a non-finite input surfaces as a ratio.
  const baked = simulateScene(pairScene({nativeReceiver: true, beatAt: 2.04, receiverX: 1400}));
  assert.ok(diagnosticsOf(baked).some((line) => /^whole-body proposal exhausted: receiver at [\d.]+s/.test(line)),
    `two native actors must freeze the bake, got ${JSON.stringify(diagnosticsOf(baked))}`);
  const frozen = simulateScene(pairScene({nativeReceiver: true, beatAt: 1.4, receiverX: 1200}));
  assert.ok(diagnosticsOf(frozen).some((line) => /whole-body proposal exhausted/.test(line)),
    "a second native body freezes the bake at any staged distance");
  // One native actor alone is clean — the defect is the pair, not the figure.
  const single = simulateScene(pairScene({nativeReceiver: false, beatAt: 2.04, receiverX: 1400}));
  assert.deepEqual(diagnosticsOf(single), []);
  assert.equal(strikesOf(single).length, 2, "the legacy receiver lands the return");
});
