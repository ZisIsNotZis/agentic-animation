import {test} from "node:test";
import assert from "node:assert/strict";
import {buildScope, evaluateExpression, runInvocationSync} from "../src/invocation/runner";
import * as lib from "../src/invocation/stdlib";
import type {Invocation, LoadedPlugin, World} from "../src/invocation/types";

function world(): World {
  return {canvas: {aspect: 16 / 9, tracks: []}, plugins: {}, frame: 10, seconds: 10 / 24, fps: 24, seed: 7};
}

function descriptor(run: Invocation["run"], durationSec?: number, mode: "block" | "nonblock" = "block"): Invocation {
  return {durationSec, mode, run};
}

test("evaluateExpression evaluates real JavaScript against the scope", () => {
  const scope = buildScope({lin: {id: "lin"}, desk: {id: "desk"}}, [
    {category: "action", manifest: {}, namespace: {slam: (a: unknown, b: unknown) => ({who: a, what: b})}},
  ] as LoadedPlugin[]);
  const result = evaluateExpression("action.slam(lin, desk)", scope) as {who: {id: string}; what: {id: string}};
  assert.deepEqual(result.who, {id: "lin"});
  assert.deepEqual(result.what, {id: "desk"});
  assert.throws(() => evaluateExpression("ghost.slam(lin)", scope), ReferenceError);
  assert.throws(() => evaluateExpression("lin.missing()", scope), TypeError);
});

test("virtual clock advances by yielded durations; done stops the body", () => {
  const world0 = world();
  const body = descriptor(function* (w) {
    assert.equal(w.invocation?.localSec, 0);
    yield 0.2;
    yield 0.3;
  }, 0.5);
  const result = runInvocationSync(body, world0, {id: "action.slam.0", category: "action", asset: "slam"});
  assert.equal(result.elapsedSec, 0.5);
  assert.equal(result.steps, 2);
});

test("yield without a value advances one engine frame", () => {
  const result = runInvocationSync(descriptor(function* () { yield; yield; }), world(), {id: "x.0", category: "x", asset: "0"});
  assert.ok(Math.abs(result.elapsedSec - 2 / 24) < 1e-9);
});

test("blocking descriptor with mismatched elapsed time is an error", () => {
  assert.throws(
    () => runInvocationSync(descriptor(function* () { yield 0.2; }, 0.5), world(), {id: "x.0", category: "x", asset: "0"}),
    /elapsed 0\.200s but descriptor declares durationSec 0\.5/,
  );
});

test("nonblocking descriptors may omit durationSec", () => {
  const result = runInvocationSync(descriptor(function* () { yield 0.1; }, undefined, "nonblock"), world(), {id: "x.0", category: "x", asset: "0"});
  assert.equal(result.elapsedSec, 0.1);
});

test("thrown body errors are wrapped with plugin, asset, and local time", () => {
  assert.throws(
    () => runInvocationSync(descriptor(function* () { yield 0.1; throw new Error("boom"); }), world(), {id: "action.slam.0", category: "action", asset: "slam"}),
    /action\.slam failed at local 0\.100s: boom/,
  );
});

test("cancellation runs finally blocks via iterator return", () => {
  let cleaned = false;
  const iter: Invocation = {
    durationSec: 1,
    run: function* () {
      try {
        yield 0.1;
        yield 0.1;
      } finally {
        cleaned = true;
      }
    },
  };
  // Simulate the engine cancelling: throw into an external drive loop.
  const world0 = world();
  world0.invocation = {id: "x", category: "x", asset: "x", localSec: 0, durationSec: 1};
  const it = iter.run(world0);
  it.next();
  it.return?.();
  assert.ok(cleaned);
});

test("stdlib helpers write tracks at invocation-local time and return durations", () => {
  const w = world();
  const lin = {id: "lin"};
  const desk = {id: "desk"};
  const total =
    lib.phase(w, lin, "load", ["arm_u_r"], 0.2, "in", desk) +
    lib.emotion(w, {name: "shocked", brow: "high", eyes: "wide", mouth: "round-open", intensity: 1}, 0.2) +
    lib.effect(w, "manga-impact-star", {target: desk, intensity: 1, duration: 0.24}) +
    lib.cue(w, "desk-slam", {kind: "sfx", gain: 0.95, duration: 0.2}) +
    lib.cameraOp(w, "push", 1.35, lin, 0.3, "back");
  assert.ok(Math.abs(total - 1.14) < 1e-9);
  const kinds = Object.fromEntries(w.canvas.tracks.map((t) => [t.kind, t]));
  assert.equal(kinds.bone!.target, "lin");
  assert.equal((kinds.bone!.events![0] as Record<string, unknown>).phase, "load");
  assert.equal(kinds.expression!.events!.length, 1);
  assert.equal((kinds.vfx!.events![0] as Record<string, unknown>).style, "manga-impact-star");
  assert.equal(kinds.sfx!.events!.length, 1);
  assert.equal(kinds.camera!.events!.length, 2);
});

test("end-to-end: factory call returns descriptor; sync run emits the same tracks a recipe would", () => {
  const world0 = world();
  const lin = {id: "lin"};
  const desk = {id: "desk"};
  // Authored like a library/action/slam resource would be.
  const slam = (subject: {id: string}, target: {id: string}): Invocation => ({
    durationSec: 0.65,
    mode: "block",
    *run(w) {
      yield lib.phase(w, subject, "load", ["arm_u_r", "torso"], 0.325, "in", target);
      lib.effect(w, "manga-impact-star", {target, intensity: 1, duration: 0.24});
      lib.cue(w, "desk-slam", {kind: "sfx", gain: 0.95, duration: 0.2});
      yield lib.phase(w, subject, "slam", ["arm_u_r", "torso"], 0.325, "back", target);
    },
  });
  const scope = buildScope({lin, desk}, [{category: "action", manifest: {}, namespace: {slam}}] as LoadedPlugin[]);
  const invocation = evaluateExpression("action.slam(lin, desk)", scope) as Invocation;
  assert.equal(invocation.durationSec, 0.65);
  const result = runInvocationSync(invocation, world0, {id: "action.slam.0", category: "action", asset: "slam"});
  assert.ok(Math.abs(result.elapsedSec - 0.65) < 1e-9);
  const kinds = world0.canvas.tracks.map((t) => t.kind);
  assert.deepEqual(kinds, ["bone", "vfx", "sfx", "bone"]);
  const slamEvent = world0.canvas.tracks[1]!.events![0] as Record<string, unknown>;
  assert.equal(slamEvent.at, 0.325);
  assert.equal((world0.canvas.tracks[2]!.events![0] as Record<string, unknown>).at, 0.325);
});

test("binding helpers emit binding/object/lifecycle triples", () => {
  const w = world();
  const lin = {id: "lin"};
  const cup = {id: "cup"};
  lib.bindObject(w, cup, lin, 0.3);
  lib.releaseObject(w, cup, lin);
  lib.settleOnSupport(w, cup, {id: "table"}, 0.2);
  const kinds = w.canvas.tracks.map((t) => t.kind);
  assert.deepEqual(kinds, ["binding", "object", "lifecycle", "binding", "object", "lifecycle", "object", "lifecycle"]);
});

test("buildScope exposes instances and plugin namespaces", () => {
  const scope = buildScope({lin: {id: "lin"}}, [
    {category: "camera", manifest: {}, namespace: {punch_in: () => ({})}},
  ] as LoadedPlugin[]);
  assert.deepEqual(Object.keys(scope).sort(), ["camera", "lin"]);
});
