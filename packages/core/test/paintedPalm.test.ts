// R9 — the held prop in the hand (docs/0_ROADMAP.md §R9, docs/8_MOTOR.md
// "Prop placement (one authority)").
//
// The bake is the physics hand and it was already right: a carried prop sits one
// DECLARED-SCALE socket from the hand point the bake reports. Two facts made the
// picture disagree with it, and this file pins both at the core seam:
//
//  1. the artwork PAINTS its palms somewhere; on a view whose arm is drawn
//     inboard of the declared joints (athlete_a `side`: 49.6 stage px at the
//     server's 0.88) the painted palm is not the `hand_*` joint the motor
//     carries a prop by, so the renderer needs the painting's own anchor
//     (`figureHandAnchor`) and the composition that reaches it (`drawnArmPoint`);
//  2. the socket is declared in ART units and converted once, at the declared
//     stage scale (`stagedGrip`), so the drawn prop must be drawn at that same
//     scale or its handle lands `(base - at) * (scale - 1)` px off the socket.
import {readFileSync} from "node:fs";
import {test} from "node:test";
import assert from "node:assert/strict";
import {simulateScene, type MotorPropInput, type MotorScene} from "../src/motor";
import {drawnArmPoint} from "../src/motor/reach";
import {figureHandAnchor} from "../src/schemas/figureArtwork";
import type {Skeleton} from "../src/schemas/libraryMeta";

const FLOOR = 691;
const art = JSON.parse(readFileSync(new URL("../../../library/figure/athlete_a/artwork.json", import.meta.url), "utf8")) as {
  views: Record<string, {skeleton: Skeleton; hands: {l: Record<string, string>; r: Record<string, string>}}>;
};
const VIEWS = Object.fromEntries(Object.entries(art.views).map(([view, value]) => [view, value.skeleton])) as Record<string, Skeleton>;
const racket = JSON.parse(readFileSync(new URL("../../../library/prop/racket/manifest.json", import.meta.url), "utf8")) as {
  placement: {base: number; size: [number, number]; stageWidth: number; grip: {at: [number, number]; radius: number; depth: "front" | "behind"}};
};
const SCALE = racket.placement.stageWidth / racket.placement.size[0];
/** The socket the COMPILER hands the motor: art units, base-relative, scaled. */
const STAGED_SOCKET = {
  at: [(racket.placement.grip.at[0] - 100) * SCALE, (racket.placement.grip.at[1] - racket.placement.base) * SCALE] as [number, number],
  radius: racket.placement.grip.radius,
  depth: racket.placement.grip.depth,
};
const SERVER = {x: 1248, groundY: FLOOR, scale: 0.88, facing: -1 as const, skeleton: VIEWS.side!, skeletonViews: VIEWS, orientations: [{at: 0, orientation: "left"}], poseTracks: [], intents: []};
const SERVER_INPUT = {id: "athlete", ...SERVER};
const scene = (prop: MotorPropInput): MotorScene => ({
  durationSec: 2,
  actors: [SERVER_INPUT],
  props: [prop],
  groundY: FLOOR,
  resolveX: (id) => (id === "athlete" ? SERVER.x : prop.x),
});

test("R9: the artwork paints its palm off its declared hand joint, and the bake carries the declared socket at that scale", () => {
  // 1. The painting's own palm: the hand layer's `data-kind="hand"` origin,
  //    composed from the transforms the layer carries. Read from the asset, not
  //    copied: the drawing is the declaration of where its fingers are.
  const side = art.views.side!;
  assert.deepEqual(figureHandAnchor(side.hands.l.rest!)?.at, [184.34, 356], "the side view's LEFT palm is not where the drawing paints it");
  assert.deepEqual(figureHandAnchor(side.hands.r.rest!)?.at, [203.76, 356], "the side view's RIGHT palm is not where the drawing paints it");
  assert.equal(figureHandAnchor(side.hands.l.rest!)?.scale, 1.2, "the hand's own frame scale");
  // The front view paints its palms ON the joints (2 px of ink), so the offset
  // is a view's business, not a constant.
  assert.deepEqual(figureHandAnchor(art.views.front!.hands.l.rest!)?.at, [126, 356]);
  assert.deepEqual(side.skeleton.joints.hand_l, [128, 356], "the declared joint the motor carries a prop by");

  // 2. Where those two points land on screen at the server's stage: the painted
  //    palm is 49.6 px from the joint — 5.4 hand widths at the server's 0.88
  //    (a hand is the declared palm circle's diameter, 2 x 9.5 x 0.88 = 16.7 px).
  const rest = {upper: 0, lower: 0};
  const server = {id: "athlete", x: SERVER.x, y: FLOOR, scale: SERVER.scale, facing: -1 as const, motor: true, flip: true, waist: 0, lean: 0, skeleton: side.skeleton};
  const painted = drawnArmPoint(server, rest, [184.34, 356], "l", true, {drop: 0, scaleY: 1});
  const joint = drawnArmPoint(server, rest, side.skeleton.joints.hand_l!, "l", true, {drop: 0, scaleY: 1});
  const gap = Math.hypot(painted[0] - joint[0], painted[1] - joint[1]);
  const handWidth = 2 * 9.5 * SERVER.scale;
  assert.ok(Math.abs(gap - 49.6) < 0.2, `the painted palm is ${gap.toFixed(1)} px from the joint, not 49.6`);
  assert.ok(gap > handWidth, `the joint and the painted palm are ${gap.toFixed(1)} px apart, inside a ${handWidth.toFixed(1)} px hand`);

  // 3. The bake itself: the prop sits one DECLARED-SCALE socket from the hand
  //    point it reports, on every held frame — so a drawing at that scale puts
  //    the handle on the hand, and the socket is not an art-unit offset.
  const held = simulateScene(scene({id: "racket", x: 440, y: 640, size: racket.placement.size, grip: STAGED_SOCKET, heldBy: {actor: "athlete", hand: "hand_l"}, intents: []}));
  const frames = held.actors.athlete!;
  const prop = held.props.racket!;
  const heldFrames = frames.map((frame, index) => (frame.holdsL === "racket" ? index : -1)).filter((index) => index >= 0);
  assert.equal(heldFrames.length, frames.length, "the racket must be in the off hand on every frame");
  let worst = 0;
  for (const frame of heldFrames) {
    const hand = frames[frame]!.reachL!;
    const rotation = (prop[frame]!.rotation ?? 0) * Math.PI / 180;
    const [at, [sx, sy]] = [STAGED_SOCKET.at, [Math.cos(rotation), Math.sin(rotation)]] as [readonly [number, number], [number, number]];
    const handle: [number, number] = [prop[frame]!.x + at[0] * sx - at[1] * sy, prop[frame]!.y + at[0] * sy + at[1] * sx];
    worst = Math.max(worst, Math.hypot(handle[0] - hand[0], handle[1] - hand[1]));
  }
  assert.ok(worst < 0.05, `the bake's handle point is ${worst.toFixed(2)} px off the hand point it reports`);

  // Falsification: the ART-UNIT socket — what a drawing at scale 1 carries — puts
  // the handle (base - at) * (scale - 1) = 11.2 px below the hand. That is the
  // scale mismatch R7 recorded, and it is what the drawn scale must close.
  const artUnitSocket = {at: [(racket.placement.grip.at[0] - 100), (racket.placement.grip.at[1] - racket.placement.base)] as [number, number], radius: 2, depth: "front" as const};
  const unscaled = simulateScene(scene({id: "racket", x: 440, y: 640, size: racket.placement.size, grip: artUnitSocket, heldBy: {actor: "athlete", hand: "hand_l"}, intents: []}));
  const unscaledProp = unscaled.props.racket!;
  const spin = (unscaledProp[0]!.rotation ?? 0) * Math.PI / 180;
  const drawnHandle: [number, number] = [unscaledProp[0]!.x + STAGED_SOCKET.at[0] * Math.cos(spin) - STAGED_SOCKET.at[1] * Math.sin(spin),
    unscaledProp[0]!.y + STAGED_SOCKET.at[0] * Math.sin(spin) + STAGED_SOCKET.at[1] * Math.cos(spin)];
  const drift = Math.hypot(drawnHandle[0] - unscaled.actors.athlete![0]!.reachL![0], drawnHandle[1] - unscaled.actors.athlete![0]!.reachL![1]);
  assert.ok(Math.abs(drift - (racket.placement.base - racket.placement.grip.at[1]) * (SCALE - 1)) < 0.01,
    `an art-unit socket drifts ${drift.toFixed(2)} px, not the declared ${((racket.placement.base - racket.placement.grip.at[1]) * (SCALE - 1)).toFixed(2)}`);
});
