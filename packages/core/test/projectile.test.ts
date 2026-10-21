import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {simulateScene, type MotorPropInput, type MotorScene} from "../src/motor";
import {PropAssetManifestSchema, PropPlacementSchema, type Projectile, type Skeleton} from "../src/schemas/libraryMeta";

// E1 projectile + struck contact (docs/ART_ASSET_PROGRAM.md, slice A). A prop
// the manifest declares as a projectile is struck once, leaves on an arc under
// the motor's gravity, keeps the bounce its restitution declares, and the bake
// carries `projectile.struck` then `projectile.settled` as events a cue can
// attach to. Mass and the struck rule are varied directly; restitution is
// asserted as the bounce its own declaration predicts.

const FPS = 24;
const FLOOR = 691;
/** The shuttle in the air at head height — the only band a standing figure's
 *  arm reaches, so the beat slice A's first hit is authored as. One athlete
 *  strikes it from the left. */
const PROP_X = 820;
const PROP_Y = 420;

const artwork = JSON.parse(readFileSync(new URL("../../../library/figure/athlete_a/artwork.json", import.meta.url), "utf8"));
const ATHLETE_VIEWS = Object.fromEntries(Object.entries(artwork.views).map(([view, value]) => [view, (value as {skeleton: Skeleton}).skeleton])) as Record<string, Skeleton>;
const LEGACY_SKELETON: Skeleton = JSON.parse(readFileSync(new URL("../../../library/figure/lin/skeleton.json", import.meta.url), "utf8"));

/** The shuttle's declared physics, read through the same schema the asset
 *  registry loads it with. */
const SHUTTLE = (() => {
  const raw = JSON.parse(readFileSync(new URL("../../../library/prop/shuttle/manifest.json", import.meta.url), "utf8")) as {placement: unknown};
  const {placement} = PropAssetManifestSchema.parse({identity: "prop/shuttle", kind: "prop", placement: raw.placement});
  assert.ok(placement.projectile, "the shuttle must declare its flight physics");
  // The drawn body's stage-space box, derived exactly as the compiler does, so
  // these scenes are as reachable as a compiled episode's prop really is.
  const scale = placement.stageWidth / placement.size[0];
  const [bx0, by0, bx1, by1] = placement.body!;
  const touchBox = {a: [(bx0 - 100) * scale, -(placement.base - by0) * scale] as [number, number],
    b: [(bx1 - 100) * scale, -(placement.base - by1) * scale] as [number, number]};
  return {placement, projectile: placement.projectile, touchBox};
})();

interface StrikeOptions {
  projectile?: Projectile;
  /** Native athlete (the slice A case) or the legacy figure that skips the
   *  whole-body proposal. */
  native?: boolean;
  /** Staged base line of the shuttle. */
  propY?: number;
}

function strikeScene(options: StrikeOptions = {}): MotorScene {
  const prop: MotorPropInput = {id: "shuttle", x: PROP_X, y: options.propY ?? PROP_Y, size: SHUTTLE.placement.size,
    touchBox: SHUTTLE.touchBox, projectile: options.projectile ?? SHUTTLE.projectile, intents: []};
  return {
    durationSec: 5,
    actors: [{
      id: "athlete", x: 640, groundY: FLOOR, facing: 1, scale: 0.88,
      ...(options.native
        ? {skeletonViews: ATHLETE_VIEWS, orientations: [{at: 0, orientation: "right"}], poseTracks: []}
        : {skeleton: LEGACY_SKELETON}),
      intents: [{at: 0.2, duration: 1.6, intent: "push", target: "shuttle", force: 1.4, forceSec: 0.25, reach: 0.35}],
    }],
    props: [prop],
    supports: [{x0: 0, x1: 1920, y: FLOOR}],
    groundY: FLOOR,
    resolveX: (id) => (id === "shuttle" ? PROP_X : id === "athlete" ? 640 : undefined),
  };
}

/** The serve: the shuttle is in the striker's own hand (a `grab` beat binds it
 *  there) and the strike targets the prop it holds. Staged at the carry hand's
 *  height — the only place slice A's first hit can be authored, since two
 *  actors keep their drawn bodies apart and no authored toss exists. */
const HAND_X = 700;
const HAND_Y = 310;

function serveScene(options: {grabAt?: number; pushAt?: number; force?: number} = {}): MotorScene {
  const prop: MotorPropInput = {id: "shuttle", x: HAND_X, y: HAND_Y, size: SHUTTLE.placement.size,
    touchBox: SHUTTLE.touchBox, projectile: SHUTTLE.projectile, intents: []};
  return {
    durationSec: 5,
    actors: [{
      id: "athlete", x: 640, groundY: FLOOR, facing: 1, scale: 0.88,
      skeletonViews: ATHLETE_VIEWS, orientations: [{at: 0, orientation: "right"}], poseTracks: [],
      intents: [{at: options.grabAt ?? 0, duration: 1, intent: "grab", target: "shuttle"},
        {at: options.pushAt ?? 1.4, duration: 1.6, intent: "push", target: "shuttle", force: options.force ?? 1.2, forceSec: 0.25}],
    }],
    props: [prop],
    supports: [{x0: 0, x1: 1920, y: FLOOR}],
    groundY: FLOOR,
    resolveX: (id) => (id === "shuttle" ? HAND_X : id === "athlete" ? 640 : undefined),
  };
}
/** Frames on which the striker carries the shuttle (the bake's hold flag). */
const heldFramesOf = (baked: ReturnType<typeof simulateScene>): number[] =>
  baked.actors.athlete!.map((frame, index) => (frame.holds === "shuttle" ? index : -1)).filter((index) => index >= 0);

const eventsOf = (baked: ReturnType<typeof simulateScene>) => baked.events ?? [];
const height = (frame: {y: number}): number => FLOOR - frame.y;
/** Frame index of the beat, so a test can slice the trajectory at an event. */
const frameOf = (at: number): number => Math.ceil(at * FPS);

test("the shuttle manifest parses as a projectile through the library schema", () => {
  const {placement} = SHUTTLE;
  assert.equal(placement.kind, "projectile");
  assert.deepEqual(PropPlacementSchema.parse(placement), placement);
  const physics = placement.projectile!;
  assert.ok(physics.mass > 0, "a projectile declares a mass");
  assert.ok(physics.restitution >= 0 && physics.restitution <= 1, "restitution is the share of the impact the bounce keeps");
  assert.ok(["instant", "sustained"].includes(physics.struck), "a projectile declares its struck rule");
  // The slice needs an instantaneous hit (the shuttle leaves on the strike).
  assert.equal(physics.struck, "instant");
});

test("a struck shuttle emits projectile.struck then projectile.settled under the declared physics", () => {
  const baked = simulateScene(strikeScene());
  const events = eventsOf(baked);
  assert.deepEqual(events.map((event) => event.kind), ["projectile.struck", "projectile.settled"]);
  assert.ok(events.every((event) => event.prop === "shuttle"), "both beats name the prop they are about");
  const [struck, settled] = events as [(typeof events)[number], (typeof events)[number]];
  assert.ok(struck.at < settled.at, "the strike precedes the settle");

  const frames = baked.props.shuttle!;
  const from = frameOf(struck.at);
  const to = frameOf(settled.at);

  // The strike leaves the ground and travels away from the striker.
  const [vx, vy] = struck.velocity!;
  assert.ok(vy < 0, `a strike launches upward, got vy ${vy}`);
  assert.ok(vx > 0, `a strike travels away from the striker, got vx ${vx}`);

  // Gravity: an airborne parabola — the per-frame rise shrinks by one constant
  // step (the same pull every frame), and it pulls downward.
  const rises = frames.slice(from + 1, from + 7).map((frame, index) => frame.y - frames[from + index]!.y);
  const steps = rises.slice(1).map((rise, index) => rise - rises[index]!);
  for (const step of steps) {
    assert.ok(Math.abs(step - steps[0]!) < 0.05, `gravity is not constant across the flight: steps ${steps.join(", ")}`);
  }
  assert.ok(steps[0]! > 4, `gravity must pull the prop down, got ${steps[0]}`);

  // Restitution: the first bounce keeps restitution² of the first apex.
  const landing = frames.findIndex((frame, index) => index >= from && height(frame) < 12);
  assert.ok(landing > from, "the shuttle must come down");
  const firstApex = Math.max(...frames.slice(from, landing).map(height));
  const bounceApex = Math.max(...frames.slice(landing, to + 1).map(height));
  assert.ok(firstApex > 100, `the strike must clear the ground, apex ${firstApex}`);
  const expected = SHUTTLE.projectile.restitution ** 2;
  assert.ok(Math.abs(bounceApex / firstApex - expected) < expected * 0.2,
    `bounce apex ${bounceApex} of ${firstApex} is not restitution² ${expected}`);

  // Settling is a rest ON the surface, and the prop stays there.
  assert.deepEqual(settled.position, [settled.position![0], FLOOR]);
  assert.equal(frames.at(-1)!.y, FLOOR);
  assert.equal(frames.at(-1)!.falling, undefined);
  assert.deepEqual(baked.diagnostics ?? [], []);
});

test("a strike on the held shuttle is the serve: it leaves the hand on the 40° arc", () => {
  // Slice A's first hit is a serve, because a strike only lands inside the arm
  // envelope and two actors keep their drawn bodies apart: the shuttle has to
  // be in the server's own hand when the beat starts.
  const baked = simulateScene(serveScene());
  const events = eventsOf(baked);
  assert.deepEqual(events.map((event) => event.kind), ["projectile.struck", "projectile.settled"]);
  assert.equal(events.filter((event) => event.kind === "projectile.struck").length, 1,
    "one strike is one beat, however many substeps the hand stayed in the box");
  const struck = events[0]!;

  // The striker really carries it first: the hold is a beat of its own, not a
  // prop that happens to sit near a hand.
  const held = heldFramesOf(baked);
  assert.ok(held.length > 20, `the striker never carried the shuttle (${held.length} held frames)`);
  const struckFrame = frameOf(struck.at);
  assert.ok(held.at(-1)! < struckFrame, `the shuttle is still in the hand at the strike (held through frame ${held.at(-1)})`);

  // The launch is the engine's one strike elevation: 40° above the horizontal,
  // upward and away from the striker.
  const [vx, vy] = struck.velocity!;
  assert.ok(vx > 0 && vy < 0, `a serve leaves up and away, got (${vx}, ${vy})`);
  const elevation = Math.atan2(-vy, vx) * 180 / Math.PI;
  assert.ok(Math.abs(elevation - 40) < 0.5, `the serve is not on the 40° arc: ${elevation.toFixed(2)}°`);

  // It leaves from the hand: the first airborne frame is one frame of its own
  // launch travel from the last carried frame — the strike does not teleport
  // the prop off the palm — and no later frame carries it again, so the hold
  // block did not pull the launched prop back to the hand.
  const last = baked.props.shuttle![held.at(-1)!]!;
  const first = baked.props.shuttle![struckFrame]!;
  const travelled = Math.hypot(first.x - last.x, first.y - last.y);
  const perFrame = Math.hypot(vx, vy) / FPS + 2;
  assert.ok(travelled <= perFrame, `the shuttle jumped ${travelled.toFixed(1)} px leaving the hand (a launched frame travels ${perFrame.toFixed(1)})`);
  assert.equal(heldFramesOf(baked).some((index) => index >= struckFrame), false, "the launched shuttle was re-gripped");

  // And it flies: the apex clears the release point by more than a body height.
  const apexAboveRelease = Math.max(...baked.props.shuttle!.slice(struckFrame).map((frame) => last.y - frame.y));
  assert.ok(apexAboveRelease > 100, `the serve rose only ${apexAboveRelease.toFixed(1)} px`);
  assert.deepEqual(baked.diagnostics ?? [], []);
});

test("the declared mass decides how hard the same strike moves the shuttle", () => {
  const velocityOf = (baked: ReturnType<typeof simulateScene>) => eventsOf(baked).find((event) => event.kind === "projectile.struck")!.velocity!;
  const light = simulateScene(strikeScene());
  const heavy = simulateScene(strikeScene({projectile: {...SHUTTLE.projectile, mass: SHUTTLE.projectile.mass * 2}}));
  const [lightX, lightY] = velocityOf(light);
  const [heavyX, heavyY] = velocityOf(heavy);
  // Twice the mass, half the speed: same strike, only the declaration changed.
  assert.ok(Math.abs(heavyX * 2 - lightX) <= 1, `mass doubling must halve vx: ${lightX} -> ${heavyX}`);
  assert.ok(Math.abs(heavyY * 2 - lightY) <= 1, `mass doubling must halve vy: ${lightY} -> ${heavyY}`);
  // The arc follows: the apex above the strike line quarters.
  const apexAboveStrike = (baked: ReturnType<typeof simulateScene>, strikeAt: number) =>
    Math.max(...baked.props.shuttle!.slice(frameOf(strikeAt)).map((frame) => PROP_Y - frame.y));
  const lightApex = apexAboveStrike(light, eventAt(light));
  const heavyApex = apexAboveStrike(heavy, eventAt(heavy));
  assert.ok(Math.abs(heavyApex / lightApex - 0.25) < 0.05, `a quarter apex expected, got ${heavyApex} of ${lightApex}`);
});

function eventAt(baked: ReturnType<typeof simulateScene>): number {
  return eventsOf(baked).find((event) => event.kind === "projectile.struck")!.at;
}

test("the struck rule decides whether the hit is one substep or a shove", () => {
  const instant = simulateScene(strikeScene());
  const sustained = simulateScene(strikeScene({projectile: {...SHUTTLE.projectile, struck: "sustained"}}));
  // Both rules emit the beat once, not once per substep of the contact window.
  assert.deepEqual(eventsOf(instant).map((event) => event.kind), ["projectile.struck", "projectile.settled"]);
  assert.deepEqual(eventsOf(sustained).map((event) => event.kind), ["projectile.struck", "projectile.settled"]);
  // Instant: the prop leaves the ground in the substep it was struck.
  assert.ok(Math.min(...instant.props.shuttle!.map((frame) => frame.y)) < PROP_Y - 100);
  // Sustained: the same push only shoves it along the line it was struck on.
  assert.equal(Math.min(...sustained.props.shuttle!.map((frame) => frame.y)), PROP_Y);
  assert.ok(Math.max(...sustained.props.shuttle!.map((frame) => frame.x)) > PROP_X + 100, "a sustained contact still moves it");
});

test("a strike that never touches says so instead of emitting nothing", () => {
  // A shuttle staged on the floor is 200 px below a standing figure's lowest
  // hand, so the push contacts nothing. Slice A has to stage it held or in
  // flight; the motor names the miss rather than dropping the beat silently.
  const baked = simulateScene(strikeScene({propY: FLOOR}));
  assert.deepEqual(eventsOf(baked), []);
  const diagnostics = baked.diagnostics ?? [];
  assert.equal(diagnostics.length, 1, `expected one diagnostic, got ${JSON.stringify(diagnostics)}`);
  assert.match(diagnostics[0]!, /^strike missed: athlete never touched shuttle; a struck contact needs the prop inside the \d+ px arm envelope/);
});

test("a strike bakes cleanly through a native figure's whole-body invariants", () => {
  // Slice A's cast is native artwork, so the strike runs inside the
  // whole-body proposal: its `prop-rate` gate admits a projectile's declared
  // flight and the strike freezes nothing.
  const baked = simulateScene(strikeScene({native: true}));
  assert.deepEqual(baked.diagnostics ?? [], []);
  assert.deepEqual(eventsOf(baked).map((event) => event.kind), ["projectile.struck", "projectile.settled"]);
  const xs = baked.props.shuttle!.map((frame) => frame.x);
  assert.ok(Math.max(...xs) - PROP_X > 1000, `the shuttle must actually fly across the stage, reached ${Math.max(...xs)}`);
});
