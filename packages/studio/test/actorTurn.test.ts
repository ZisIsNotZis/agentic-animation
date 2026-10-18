import {test} from "node:test";
import assert from "node:assert/strict";
import {actorTurn, rotateAboutPivot} from "../src/performance/actorTurn";

// Slice B (docs/WORLD_PUPPET_MOTOR.md): the pivot a drawn body turns about.
// A standing body turns about its ground point — the div's bottom-centre, the
// pre-slice-B behaviour — and a hanging body about the grip the motor bakes.

const STANDING = {x: 960, y: 688, scale: 0.58, rotation: 0} as const;

test("a standing body keeps the pre-slice-B placement", () => {
  const turn = actorTurn({...STANDING, skeleton: {space: {width: 400, height: 720}} as never});
  assert.deepEqual(turn.origin, [200, 720]);
  assert.deepEqual(turn.pivot, [960, 688]);
  assert.equal(turn.left, 960 - 200);
  assert.equal(turn.top, 688 - 720);
});

test("a hanging body pivots on its grip at every angle", () => {
  const grip: [number, number] = [204.8, 81.13];
  const actor = {...STANDING, rotation: -90, grip, skeleton: {space: {width: 400, height: 720}} as never};
  const turn = actorTurn(actor);
  // The pivot is the unrotated placement's grip point: it does not depend on
  // the rotation, which is what a fixed bar means.
  const pivot = turn.pivot;
  assert.deepEqual(actorTurn({...actor, rotation: 180}).pivot, pivot);
  assert.deepEqual(actorTurn({...actor, rotation: 0}).pivot, pivot);
  // The div origin is the grip, and the placement keeps it on the pivot.
  assert.deepEqual(turn.origin, grip);
  assert.ok(Math.abs(turn.left + grip[0] - pivot[0]) < 1e-9);
  assert.ok(Math.abs(turn.top + grip[1] - pivot[1]) < 1e-9);
});

test("a rotation carries the drawn body about the pivot, not the screen", () => {
  const turn = actorTurn({...STANDING, rotation: 90, grip: [204.8, 81.13], skeleton: {space: {width: 400, height: 720}} as never});
  // A point one radius below the pivot swings to its left at +90deg (y down).
  const below: [number, number] = [turn.pivot[0], turn.pivot[1] + 100];
  const moved = rotateAboutPivot(turn, below, 90);
  assert.ok(Math.abs(moved[0] - (turn.pivot[0] - 100)) < 1e-9);
  assert.ok(Math.abs(moved[1] - turn.pivot[1]) < 1e-9);
});
