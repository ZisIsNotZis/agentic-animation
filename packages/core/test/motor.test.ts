import { test } from "node:test";
import assert from "node:assert/strict";
import { simulateScene, type MotorScene } from "../src/motor";
import { readFileSync } from "node:fs";
import type { MotorActorInput } from "../src/motor";
const SKELETON: MotorActorInput["skeleton"] = JSON.parse(readFileSync(new URL("../../../library/figure/lin/skeleton.json", import.meta.url), "utf8"));
const withSkeleton = (actor: Omit<MotorActorInput, "skeleton">): MotorActorInput => ({...actor, skeleton: SKELETON});


const baseScene: MotorScene = {
  durationSec: 3,
  actors: [
    withSkeleton({ id: "aqiang", x: 600, groundY: 691, facing: 1 as const, scale: 1, intents: [] }),
    withSkeleton({ id: "awei", x: 1248, groundY: 691, facing: -1 as const, scale: 1, intents: [] }),
  ],
  props: [],
  resolveX: (id) => (id === "aqiang" ? 600 : id === "awei" ? 1248 : undefined),
};

test("push: the hand must reach the target before the target moves (no remote force)", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0.5, duration: 1.2, intent: "push", target: "awei", reach: 0.4, forceSec: 0.3, force: 0.8 }] },
      baseScene.actors[1]!,
    ],
  };
  const trajectory = simulateScene(scene);
  const awei = trajectory.actors.awei!;
  const aqiang = trajectory.actors.aqiang!;
  let firstMotionFrame = -1;
  let firstContactFrame = -1;
  for (let frame = 1; frame < awei.length; frame++) {
    if (firstMotionFrame < 0 && Math.abs(awei[frame]!.x - awei[0]!.x) > 0.5) firstMotionFrame = frame;
    if (firstContactFrame < 0 && aqiang[frame]?.contact) firstContactFrame = frame;
  }
  assert.ok(firstContactFrame > 0, "push never established contact");
  assert.ok(firstMotionFrame > 0, "push never moved the target");
  // Bake granularity is one frame: force starts at a substep, the bake
  // samples frame end, so contact and motion may land one frame apart.
  assert.ok(
    firstContactFrame <= firstMotionFrame + 1,
    `target moved at frame ${firstMotionFrame} before contact at ${firstContactFrame}`,
  );
});

test("push: reaction leans the pusher backward, target is displaced and faces the pusher", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0.5, duration: 1.2, intent: "push", target: "awei", reach: 0.4, forceSec: 0.3, force: 0.8 }] },
      baseScene.actors[1]!,
    ],
  };
  const trajectory = simulateScene(scene);
  const awei = trajectory.actors.awei!;
  const displaced = awei.filter((frame) => frame.x > 1248 + 40).length;
  assert.ok(displaced > 12, `target barely displaced (${displaced} frames)`);
  assert.equal(awei.at(-1)!.facing, -1, "pushed actor should end facing the pusher (pusher is to its left)");
  const reaction = trajectory.actors.aqiang!.some((frame) => frame.lean < -5);
  assert.ok(reaction, "pusher never leaned back against the push");
});

test("move: locomotion is monotonic with no per-frame overshoot", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0, duration: 1.5, intent: "move", target: "awei" }] },
      baseScene.actors[1]!,
    ],
  };
  const trajectory = simulateScene(scene);
  const lin = trajectory.actors.aqiang!;
  const positions = lin.map((frame) => frame.x);
  for (let frame = 1; frame < positions.length; frame++) {
    const delta = positions[frame]! - positions[frame - 1]!;
    assert.ok(delta >= -0.01, `non-monotonic step at frame ${frame}: ${delta}`);
    assert.ok(delta <= 20, `implausible per-frame jump at frame ${frame}: ${delta}`);
  }
  // Pursuit halts at adjacency: the walker never shoves the target along —
  // the pushee only moves when a real force contacts them (Slice 2).
  const stopped = lin.at(-1)!.x;
  assert.ok(Math.abs(1248 - 200 - stopped) <= 40, `walker should halt at adjacency, stopped at ${stopped}`);
});

test("determinism: identical inputs produce identical trajectories", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0.3, duration: 1, intent: "push", target: "awei" }] },
      baseScene.actors[1]!,
    ],
  };
  assert.deepEqual(simulateScene(scene), simulateScene(scene));
});

test("props slide under force and stop by friction", () => {
  // The prop stands on a support at chest height — a ground-level prop is
  // honestly unreachable by a standing figure's hand (that is the point).
  const scene: MotorScene = {
    ...baseScene,
    props: [{ id: "thermos", x: 1000, y: 560, size: [80, 120], intents: [] }],
    actors: [
      { ...baseScene.actors[0]!, x: 700, intents: [{ at: 0.2, duration: 0.8, intent: "push", target: "thermos", reach: 0.3, forceSec: 0.2, force: 0.9 }] },
      baseScene.actors[1]!,
    ],
    resolveX: (id) => (id === "aqiang" ? 700 : id === "awei" ? 1248 : id === "thermos" ? 1000 : undefined),
  };
  const trajectory = simulateScene(scene);
  const thermos = trajectory.props.thermos!;
  assert.ok(thermos.at(-1)!.x > 1000, "prop never moved");
  const tail = thermos.slice(-12).map((frame) => frame.x);
  assert.equal(new Set(tail).size, 1, "prop must come to rest (friction)");
});

test("pursuit stops at adjacency — actors never overlap", () => {
  const scene: MotorScene = {
    ...baseScene,
    durationSec: 3,
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0, duration: 3, intent: "move", target: "awei" }] },
      baseScene.actors[1]!,
    ],
  };
  const trajectory = simulateScene(scene);
  const frames = trajectory.actors.aqiang!;
  // Body half-width is the drawn robe silhouette (100px design, figureGeometry
  // SSOT), so adjacency keeps ~200px between centers.
  const minGap = Math.min(...frames.map((frame, index) => Math.abs(trajectory.actors.awei![index]!.x - frame.x)));
  assert.ok(minGap >= 190, `actors overlapped: minimum gap ${Math.round(minGap)}px`);
  const finalGap = Math.abs(trajectory.actors.awei!.at(-1)!.x - frames.at(-1)!.x);
  assert.ok(finalGap <= 260, `pursuit should halt near the target, gap ${Math.round(finalGap)}`);
});
