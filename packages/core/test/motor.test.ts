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
  // Bake granularity: force starts at a substep, the bake samples frame end,
  // so contact and motion may land up to two frames apart while remaining
  // the same physical moment.
  assert.ok(
    firstContactFrame <= firstMotionFrame + 2,
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

test("grab: the hand carries the object at its box CENTER after the grip settles", () => {
  const scene: MotorScene = {
    ...baseScene,
    props: [{ id: "thermos", x: 900, y: 560, size: [80, 120], intents: [] }],
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0.1, duration: 1.5, intent: "move", target: "thermos", grab: "thermos" }] },
      baseScene.actors[1]!,
    ],
    resolveX: (id) => (id === "aqiang" ? 700 : id === "awei" ? 1248 : id === "thermos" ? 900 : undefined),
  };
  const trajectory = simulateScene(scene);
  const aqiang = trajectory.actors.aqiang!;
  const thermos = trajectory.props.thermos!;
  const heldFrames = aqiang
    .map((f, i) => ((f as {holds?: string}).holds === "thermos" ? i : -1))
    .filter((i) => i >= 0);
  assert.ok(heldFrames.length > 0, "grab never bound the prop");
  // The grip eases to the center grip over the 0.45s settle (~11 frames).
  const settleFrom = heldFrames[0]! + 12;
  for (let i = settleFrom; i <= heldFrames.at(-1)!; i++) {
    const aq = aqiang[i]! as {reach?: [number, number]};
    const prop = thermos[i]!;
    assert.ok(aq.reach, `no hand position baked at frame ${i}`);
    const cx = prop.x;
    const cy = prop.y - 60; // thermos box center (80x120, base origin)
    const d = Math.hypot(cx - aq.reach![0], cy - aq.reach![1]);
    assert.ok(d <= 8, `box center ${d.toFixed(1)}px from the hand at frame ${i}`);
  }
  // The grip settle must not teleport the prop (make lint threshold 60px).
  let maxJump = 0;
  for (let i = 1; i < thermos.length; i++) {
    maxJump = Math.max(maxJump, Math.hypot(thermos[i]!.x - thermos[i - 1]!.x, thermos[i]!.y - thermos[i - 1]!.y));
  }
  assert.ok(maxJump <= 60, `prop jumped ${maxJump.toFixed(1)}px in one frame`);
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


test("stagger: recovery steps catch momentum (balance stepping)", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0.2, duration: 1.2, intent: "push", target: "awei", reach: 0.3, forceSec: 0.3, force: 0.95 }] },
      baseScene.actors[1]!,
    ],
  };
  const trajectory = simulateScene(scene);
  const awei = trajectory.actors.awei!;
  // The pushee slides (real dynamics), but slides LESS than one step length
  // per recovery step on average — the feet catch the body.
  const totalSlide = Math.abs(awei.at(-1)!.x - awei[0]!.x);
  assert.ok(totalSlide > 10, `pushee should slide, moved ${totalSlide}`);
  assert.ok(totalSlide < 3 * 90, `pushee slid implausibly far for a stepping body: ${Math.round(totalSlide)}px`);
  // The slide decays to rest (feet catch — no perpetual sliding).
  const tail = awei.slice(-10).map((frame) => Math.round(frame.x));
  assert.equal(new Set(tail).size, 1, "pushee must come to rest after recovery steps");
});

test("stagger: beyond step capacity balance cuts and the figure collapses (slice 4 fall)", () => {
  const scene: MotorScene = {
    ...baseScene,
    durationSec: 6,
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0.2, duration: 2, intent: "push", target: "awei", reach: 0.1, forceSec: 2.5, force: 2 }] },
      baseScene.actors[1]!,
    ],
  };
  const trajectory = simulateScene(scene);
  const awei = trajectory.actors.awei!;
  const totalSlide = Math.abs(awei.at(-1)!.x - awei[0]!.x);
  // With a sustained shove past the step capacity, the body travels much
  // farther than the stepping body — and the failure mode is a fall, not a
  // permanent stagger.
  assert.ok(totalSlide > 150, `sustained shove should travel far: ${Math.round(totalSlide)}px`);
  // The collapse: hip sinks to the full crouch drop and the waist hinges into
  // the fall (the shove travels left, the figure falls onto its back:
  // negative waist).
  const down = awei.filter((f) => (f.crouch ?? 0) > 0.9 && Math.abs(f.waist ?? 0) > 60);
  assert.ok(down.length > 12, `capacity exhaustion must collapse the figure (${down.length} frames down)`);
  // Balance stays cut: no recovery step can plant once the collapse begins.
  const firstDown = awei.findIndex((f) => (f.crouch ?? 0) > 0.5);
  assert.ok(firstDown > 0, "the figure must lose height during the collapse");
  assert.equal(awei.slice(firstDown).some((f) => (f as {step?: number}).step === 1), false, "no stepping after balance cuts");
  // The figure stays down (get-up is out of scope).
  assert.equal(awei.slice(-6).every((f) => (f.crouch ?? 0) > 0.9 && Math.abs(f.waist ?? 0) > 60), true, "the fallen figure must stay down");
});

test("fall intent: a fall-classified event cuts balance; the figure collapses toward facing and stays down", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [
      { ...baseScene.actors[0]!, intents: [{ at: 0.3, duration: 1.1, intent: "fall" }] },
      baseScene.actors[1]!,
    ],
  };
  const trajectory = simulateScene(scene);
  const aqiang = trajectory.actors.aqiang!;
  // Upright and planted until the authored beat (frame k samples at (k+1)/24).
  assert.equal(aqiang.slice(0, 7).every((f) => (f.crouch ?? 0) === 0 && !f.waist && f.x === aqiang[0]!.x), true, "upright until the beat");
  const peak = Math.max(...aqiang.map((f) => f.waist ?? 0));
  assert.ok(peak > 60, `collapse hinges the waist into the fall: ${peak.toFixed(1)}deg`);
  // Stays down: no auto recovery.
  assert.equal(aqiang.slice(-6).every((f) => (f.crouch ?? 0) > 0.9 && Math.abs(f.waist ?? 0) > 60), true, "the figure must stay down");
  assert.deepEqual(trajectory, simulateScene(scene), "falls are deterministic");
});

test("gesture bow: the waist hinges forward and returns upright inside the authored duration", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [{ ...baseScene.actors[0]!, intents: [{ at: 0.2, duration: 0.9, intent: "bow" }] }, baseScene.actors[1]!],
  };
  const trajectory = simulateScene(scene);
  const frames = trajectory.actors.aqiang!;
  const peak = Math.max(...frames.map((f) => f.waist ?? 0));
  assert.ok(peak > 20, `bow must hinge the waist visibly: peak ${peak.toFixed(1)}deg`);
  // Planted support: a gesture never translates the body.
  const tail = frames.slice(-6).map((f) => f.x);
  assert.equal(new Set(tail.map(Math.round)).size, 1, "bow never translates the actor");
  assert.equal(Math.max(...frames.slice(-6).map((f) => Math.abs(f.waist ?? 0))), 0, "waist returns upright before the scene ends");
  // Frame-end sampling: frame k samples at (k+1)/24s, so the beat at 0.2s
  // first shows in frame index 4.
  assert.equal(frames.slice(0, 4).every((f) => (f.waist ?? 0) === 0), true, "no bend before the authored beat");
  assert.ok((frames[5]?.waist ?? 0) > 0 || (frames[6]?.waist ?? 0) > 0, "bend under way just after the authored beat");
});

test("gesture nod: two distinct dips then upright", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [{ ...baseScene.actors[0]!, intents: [{ at: 0, duration: 0.45, intent: "nod" }] }, baseScene.actors[1]!],
  };
  const frames = simulateScene(scene).actors.aqiang!;
  const pitches = frames.map((f) => f.waist ?? 0);
  const peak = Math.max(...pitches);
  assert.ok(peak > 4 && peak < 12, `nod dips stay small: ${peak.toFixed(1)}deg`);
  // Two dips: the pitch curve crosses half-amplitude at least three times.
  const crossings = pitches.filter((p, i) => i > 0 && (pitches[i - 1]! < peak / 2) !== (p < peak / 2)).length;
  assert.ok(crossings >= 3, `two dips expected, saw ${crossings} half-amplitude crossings`);
  assert.equal(Math.max(...pitches.slice(-4)), 0, "nod ends upright");
});

test("gesture shiver: deterministic lean oscillation around zero", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [{ ...baseScene.actors[0]!, intents: [{ at: 0, duration: 0.7, intent: "shiver" }] }, baseScene.actors[1]!],
  };
  const frames = simulateScene(scene).actors.aqiang!;
  const again = simulateScene(scene).actors.aqiang!;
  assert.deepEqual(frames, again, "shiver is deterministic");
  const peak = Math.max(...frames.map((f) => Math.abs(f.lean)));
  assert.ok(peak > 1 && peak < 5, `shiver oscillates modestly: ${peak.toFixed(2)}deg`);
  assert.equal(new Set(frames.slice(-4).map((f) => f.x)).size, 1, "shiver never translates the actor");
});

test("gesture point: the actor faces the target and the hand travels to the aim, then retracts", () => {
  const scene: MotorScene = {
    ...baseScene,
    actors: [{ ...baseScene.actors[0]!, intents: [{ at: 0.2, duration: 0.65, intent: "point", target: "awei" }] }, baseScene.actors[1]!],
  };
  const frames = simulateScene(scene).actors.aqiang!;
  const mid = frames[Math.round(0.5 * 24)]!;
  assert.equal(mid.facing, 1, "point faces the target");
  assert.ok(mid.reach, "the reach point is baked while pointing");
  const dx = mid.reach![0] - mid.x;
  assert.ok(dx > 100, `the hand leads toward the target: ${Math.round(dx)}px`);
  assert.equal(Math.abs(mid.reach![1] - (frames[0]!.reach?.[1] ?? mid.reach![1])) >= 0, true, "reach is finite");
  // Recovery: the reach clears again after the authored duration.
  const cleared = frames.findIndex((f, i) => i > Math.round(1.1 * 24) && !f.reach);
  assert.ok(cleared > 0, "the arm retracts after the point ends");
});

test("move: a self-target walk returns the actor to his staged mark (pursuit of self is vacuous)", () => {
  // resolveX returns the STAGED mark (600) while the actor stands elsewhere
  // (900, e.g. after a handover adjacency halt). The walk must travel to the
  // staged mark instead of no-oping on live self-pursuit. Episode staging
  // (showcase-props-m3 P1-1 repair) is the only known user of self-targets;
  // grep confirms no other episode authors movement.to(x, x).
  const scene: MotorScene = {
    ...baseScene,
    actors: [
      { ...baseScene.actors[0]!, x: 900, intents: [{ at: 0.2, duration: 1.2, intent: "move", to: "aqiang", target: "aqiang" }] },
      baseScene.actors[1]!,
    ],
    resolveX: (id) => (id === "aqiang" ? 600 : id === "awei" ? 1248 : undefined),
  };
  const frames = simulateScene(scene).actors.aqiang!;
  assert.equal(frames[0]!.x, 900, "starts displaced from the mark");
  const arrived = frames.findIndex((f) => Math.abs(f.x - 600) <= 1);
  assert.ok(arrived > 0, "the walk never reached the staged mark");
  const end = frames.at(-1)!;
  assert.ok(Math.abs(end.x - 600) <= 1, `actor must stand on the mark at the end, got ${end.x}`);
  assert.equal(end.facing, -1, "a leftward walk ends facing left");
});
