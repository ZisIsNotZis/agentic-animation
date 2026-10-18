import {readFileSync} from "node:fs";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {simulateScene, type MotorScene} from "../src/motor/index";
import type {Skeleton} from "../src/schemas/libraryMeta";

// Slice B giant swing (docs/WORLD_PUPPET_MOTOR.md): a body attaches to a
// hanging support's grip line, both hands on the one grip point, and turns
// about it through the declared rotationLimit. These tests pin the mechanics
// the bake must carry: the turn, the fixed grip, the unplanted feet, and the
// loud refusal of a bar the staged figure cannot hold.

const artwork = JSON.parse(readFileSync(join(process.cwd(), "library/figure/lin_b_draft/artwork.json"), "utf8"));
const views = Object.fromEntries(Object.entries(artwork.views).map(([view, value]) => [view, (value as {skeleton: Skeleton}).skeleton])) as Record<string, Skeleton>;

/** A side-view figure at the staged scale, a bar one extended arm above the
 *  standing shoulder (the staging a swing needs), and one swing beat. */
function swingScene(gripY = 320): MotorScene {
  return {
    durationSec: 3.4,
    actors: [{
      id: "athlete", x: 960, groundY: 688, facing: 1, scale: 0.58,
      skeletonViews: views,
      orientations: [{at: 0, orientation: "right"}],
      poseTracks: [],
      intents: [{at: 0.2, duration: 3.2, intent: "swing"}],
    }],
    props: [],
    supports: [{
      x0: 800, x1: 1120, y: gripY, name: "bar", kind: "hanging",
      grip: {x0: 860, x1: 1060, y: gripY}, rotationLimit: {forward: 360, back: 30},
    }],
    groundY: 688,
    resolveX: () => undefined,
  };
}

test("a swing turns the body a full circle about a grip that never moves", () => {
  const scene = swingScene();
  const baked = simulateScene(scene);
  assert.deepEqual(baked.diagnostics ?? [], []);
  const frames = baked.actors.athlete!;
  const turning = frames.filter((frame) => frame.rotation !== undefined);
  assert.ok(turning.length > 40, `the turn must be baked on many frames, got ${turning.length}`);
  const rotations = turning.map((frame) => frame.rotation!);
  // One full circle: the turn spans most of 360deg within the beat's window.
  assert.ok(Math.min(...rotations) <= -350, `the turn must almost complete one circle, reached ${Math.min(...rotations)}deg`);
  assert.ok(Math.max(...rotations) >= -1, "the turn must start from the upright hang pose");
  // Never faster than the 35deg per-frame angle gate (teleports.ts).
  for (let index = 1; index < rotations.length; index++) {
    assert.ok(Math.abs(rotations[index]! - rotations[index - 1]!) < 35,
      `frame ${index} turns ${Math.abs(rotations[index]! - rotations[index - 1]!)}deg, over the angle gate`);
  }
  // The pivot is the bar: one design grip point for the whole turn, and the
  // baked reach sits exactly on it.
  const grips = new Set(turning.map((frame) => JSON.stringify(frame.grip)));
  assert.equal(grips.size, 1, `the grip point must not move, got ${[...grips].join(" ")}`);
  for (const frame of turning) {
    assert.deepEqual(frame.reach, [960, 320] as [number, number]);
    // Hanging: no foot is on a surface, and the placement line is the hang's,
    // not the staged floor (the feet hang BELOW the staged ground).
    assert.deepEqual(frame.footSupport, {l: false, r: false});
    assert.ok(frame.y !== undefined && frame.y > 688, `a hanging body's ground line is below the staged one, got ${frame.y}`);
  }
});

test("a swing at a bar the staged figure cannot hold fails loud instead of hanging anyway", () => {
  // 150px below the staged floor is far outside one arm-span of the shoulder.
  const baked = simulateScene(swingScene(80));
  const diagnostics = baked.diagnostics ?? [];
  assert.equal(diagnostics.length, 1, `expected one diagnostic, got ${JSON.stringify(diagnostics)}`);
  assert.match(diagnostics[0]!, /^swing: athlete cannot hold its grip at bar/);
  assert.match(diagnostics[0]!, /stage the bar so its grip line is one extended arm above the staged shoulder/);
  assert.ok(baked.actors.athlete!.every((frame) => frame.rotation === undefined), "an unreachable bar must not bake a turn");
});
