// R7 — the racket in the server's off hand (docs/ART_ASSET_PROGRAM.md §Roadmap).
//
// The hold model was single-hand: `ActorState.holding` is one prop per actor and
// the reach model solved one arm, so the hand that strikes the shuttle could not
// also carry a racket. This file pins the per-hand hold that closes it:
//
//  - the off hand (LEFT) has its own bind, carry and release,
//  - its prop follows the left palm and the DRAWN left arm lands on that palm,
//  - a prop staged `held-by(actor, left)` starts the scene in that hand,
//  - and NOTHING changes when no hand is named: the right hand is the default,
//    and a right-hand bake is identical to the pre-R7 one (the six episodes that
//    author prop.pickup/hold/release were compared bake-for-bake on the same
//    tree; this test pins the motor-level part of that claim).
import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {simulateScene, type MotorIntent, type MotorPropInput, type MotorScene} from "../src/motor";
import {solveArmOntoReach, renderedHandWorld} from "../src/motor/reach";
import type {Skeleton} from "../src/schemas/libraryMeta";

const FLOOR = 691;
const artwork = JSON.parse(readFileSync(new URL("../../../library/figure/athlete_a/artwork.json", import.meta.url), "utf8"));
const VIEWS = Object.fromEntries(Object.entries(artwork.views).map(([view, value]) => [view, (value as {skeleton: Skeleton}).skeleton])) as Record<string, Skeleton>;

/** The racket's declared socket, read from the asset the episode uses. */
const RACKET = (() => {
  const raw = JSON.parse(readFileSync(new URL("../../../library/prop/racket/manifest.json", import.meta.url), "utf8")) as {
    placement: {base: number; size: [number, number]; stageWidth: number; grip: {at: [number, number]; radius: number; depth: "front" | "behind"}};
  };
  const p = raw.placement;
  const scale = p.stageWidth / p.size[0];
  return {size: p.size, scale, grip: {at: [(p.grip.at[0] - 100) * scale, (p.grip.at[1] - p.base) * scale] as [number, number], radius: p.grip.radius, depth: p.grip.depth}};
})();

const CUP: MotorPropInput = {id: "cup", x: 1015, y: FLOOR, size: [40, 60], touchBox: {a: [-20, -60], b: [20, 0]}, intents: []};

/** One native athlete, facing left like the episode's server. Facing left puts
 *  the RIGHT hand on the near side, so this is the right-hand fixture. */
function athlete(intents: MotorIntent[], x = 1075): MotorScene["actors"][number] {
  return {id: "athlete", x, groundY: FLOOR, facing: -1, scale: 0.88,
    skeletonViews: VIEWS, orientations: [{at: 0, orientation: "left"}], poseTracks: [], intents};
}

/** The mirror fixture: facing right, so the OFF hand is the near arm. The far
 *  arm is a staging question (it cannot reach past the body), not a hold one. */
function mirroredAthlete(intents: MotorIntent[], x = 1040): MotorScene["actors"][number] {
  return {id: "athlete", x, groundY: FLOOR, facing: 1, scale: 0.88,
    skeletonViews: VIEWS, orientations: [{at: 0, orientation: "right"}], poseTracks: [], intents};
}

function scene(actors: MotorScene["actors"], props: MotorPropInput[], durationSec = 3): MotorScene {
  return {durationSec, actors, props, groundY: FLOOR,
    resolveX: (id) => [...actors].find((actor) => actor.id === id)?.x ?? [...props].find((prop) => prop.id === id)?.x};
}

// ---------------------------------------------------------------------------
// The default hand is the right one: naming no hand is the pre-R7 bake.
// ---------------------------------------------------------------------------

test("R7: a bind that names no hand is byte-identical to one that names hand_r", () => {
  const pick = (hand?: MotorIntent["hand"]): MotorScene => scene(
    [athlete([{at: 0, duration: 1.2, intent: "grab", target: "cup", ...(hand ? {hand} : {})},
      {at: 1.2, duration: 0.4, intent: "release", target: "cup", ...(hand ? {hand} : {})}])],
    [{...CUP, x: 1033, y: FLOOR}]);
  const bare = JSON.stringify(simulateScene(pick()));
  const named = JSON.stringify(simulateScene(pick("hand_r")));
  assert.equal(bare, named, "an unnamed hand must mean the right hand, bake for bake");
  const right = simulateScene(pick());
  assert.ok(right.actors.athlete!.some((frame) => frame.holds === "cup"), "the right hand must still bind its prop");
  assert.ok(right.actors.athlete!.every((frame) => frame.holdsL === undefined), "the off hand must stay empty");
});

// ---------------------------------------------------------------------------
// The off hand has its own bind, carry and release.
// ---------------------------------------------------------------------------

test("R7: a grab that names hand_l binds into the off hand and carries there", () => {
  const bake = simulateScene(scene(
    [mirroredAthlete([{at: 0, duration: 1, intent: "grab", target: "cup", hand: "hand_l"}])],
    [{...CUP, x: 1015, y: FLOOR}]));
  const frames = bake.actors.athlete!;
  const bound = frames.findIndex((frame) => frame.holdsL === "cup");
  assert.ok(bound > 0, "the off hand never bound the prop");
  assert.ok(frames.every((frame) => frame.holds === undefined), "the striking hand must stay empty");
  // Carried: the prop keeps the offset it was grabbed with, rigidly, for the
  // rest of the bake — the hand and the prop move as one body (I4 on the off
  // hand). A grip-less prop on a native figure keeps its touch offset by the
  // same rule the right hand uses.
  const prop = bake.props.cup!;
  const settle = bound + 20;
  const offset: [number, number] = [prop[settle]!.x - frames[settle]!.reachL![0], prop[settle]!.y - frames[settle]!.reachL![1]];
  for (let frame = settle; frame < frames.length; frame++) {
    const reach = frames[frame]!.reachL!;
    const drift = Math.hypot(reach[0] + offset[0] - prop[frame]!.x, reach[1] + offset[1] - prop[frame]!.y);
    assert.ok(drift < 0.5, `the carried prop left the off hand at frame ${frame} (drift ${drift.toFixed(2)} px)`);
  }
  assert.ok(Math.abs(offset[0]) < 200 && Math.abs(offset[1]) < 200, "the carry must stay inside the drawn prop");
  // The drawn left arm lands on the palm the physics uses.
  const last = frames.at(-1)!;
  const solved = solveArmOntoReach({id: "athlete", x: last.x, y: FLOOR, scale: 0.88, flip: false,
    motor: true, contact: true, waist: last.waist ?? 0, skeleton: VIEWS.side!, reach: last.reachL!}, "l");
  const hand = renderedHandWorld({id: "athlete", x: last.x, y: FLOOR, scale: 0.88, flip: false,
    motor: true, waist: last.waist ?? 0, skeleton: VIEWS.side!}, solved.arm, false, "l");
  assert.ok(Math.hypot(hand[0] - last.reachL![0], hand[1] - last.reachL![1]) < 1,
    `the drawn left hand missed the off-hand point: ${hand} vs ${last.reachL}`);
  assert.equal(solved.arm.hand, "fist", "a hand holding a prop draws closed");
});

test("R7: a release that names hand_l opens the off hand and the prop falls to the floor", () => {
  const bake = simulateScene(scene(
    [mirroredAthlete([{at: 0, duration: 0.8, intent: "grab", target: "cup", hand: "hand_l"},
      {at: 1.6, duration: 0.4, intent: "release", target: "cup", hand: "hand_l"}])],
    [{...CUP, x: 1015, y: FLOOR}], 3));
  const frames = bake.actors.athlete!;
  const holds = frames.map((frame) => frame.holdsL);
  assert.ok(holds.indexOf("cup") >= 0, "the off hand never bound the prop");
  assert.equal(holds.at(-1), undefined, "the release must open the off hand");
  const prop = bake.props.cup!;
  const rest = prop.at(-1)!;
  // A prop's y is its declared base point: resting ON the floor means y = floor.
  assert.ok(Math.abs(rest.y - FLOOR) < 1.5, `the released prop must rest on the floor: ${rest.y}`);
});

// ---------------------------------------------------------------------------
// A prop staged held-by(actor[, hand]) starts the scene in that hand.
// ---------------------------------------------------------------------------

test("R7: a prop staged held-by(actor, left) opens the scene on the left palm", () => {
  const racket: MotorPropInput = {id: "racket", x: 440, y: 640, size: RACKET.size, grip: RACKET.grip, heldBy: {actor: "athlete", hand: "hand_l"}, intents: []};
  const bake = simulateScene(scene([athlete([], 1248)], [racket], 2));
  const frames = bake.actors.athlete!;
  const prop = bake.props.racket!;
  assert.equal(frames[0]!.holdsL, "racket", "the prop must be in the off hand from the first frame");
  assert.ok(frames.every((frame) => frame.holds === undefined), "the striking hand must stay empty");
  // The prop's first frame is the hand socket, not the staged bench spot.
  const socket = RACKET.grip.at;
  assert.ok(Math.abs(prop[0]!.x - (frames[0]!.reachL![0] - socket[0])) < 0.5, `prop x ${prop[0]!.x} is not on the socket`);
  assert.ok(Math.abs(prop[0]!.y - (frames[0]!.reachL![1] - socket[1])) < 0.5, `prop y ${prop[0]!.y} is not on the socket`);
  // The hand point rides with the body and never leaves the socket.
  for (let frame = 0; frame < frames.length; frame++) {
    assert.ok(Math.abs(prop[frame]!.x - (frames[frame]!.reachL![0] - socket[0])) < 0.5,
      `the carried prop left the socket at frame ${frame}`);
  }
});

test("R7: a prop staged held-by(actor) with no hand opens in the right hand", () => {
  const cup: MotorPropInput = {...CUP, x: 440, y: 640, heldBy: {actor: "athlete"}, intents: []};
  const bake = simulateScene(scene([athlete([], 1248)], [cup], 1));
  assert.equal(bake.actors.athlete![0]!.holds, "cup");
  assert.equal(bake.actors.athlete![0]!.holdsL, undefined);
});

// ---------------------------------------------------------------------------
// Neither hand's hold disturbs the other: the strike keeps its own physics.
// ---------------------------------------------------------------------------

test("R7: an off-hand carry does not move a right-hand pickup's contact frame", () => {
  const intents: MotorIntent[] = [
    {at: 0, duration: 1.2, intent: "move", target: "cup", grab: "cup"},
    {at: 1.4, duration: 0.6, intent: "move", target: "athlete"},
  ];
  const withoutRacket = simulateScene(scene([athlete(intents)], [{...CUP, x: 1033, y: FLOOR}], 2.5));
  const withRacket = simulateScene(scene([athlete(intents)],
    [{...CUP, x: 1033, y: FLOOR},
      {id: "racket", x: 440, y: 640, size: RACKET.size, grip: RACKET.grip, heldBy: {actor: "athlete", hand: "hand_l"}, intents: []}], 2.5));
  const contact = (bake: typeof withoutRacket): number => bake.actors.athlete!.findIndex((frame) => frame.holds === "cup");
  assert.ok(contact(withoutRacket) > 0, "the right hand never bound its prop");
  assert.equal(contact(withRacket), contact(withoutRacket),
    "the off-hand carry moved the right hand's contact frame");
});
