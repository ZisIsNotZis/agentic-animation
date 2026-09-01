import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveStaging, stageScene } from "../src/staging";

const location = {id: "office", framing: "balanced" as const, depth: "layered" as const};

test("stages a two-person semantic setup as a large, subtitle-safe two-shot", () => {
  const result = stageScene({
    location,
    actors: [
      {id: "alice", facing: "bob", entrance: "left"},
      {id: "bob", facing: "alice", entrance: "right"},
    ],
    speaker: "alice",
  });
  assert.equal(result.camera.framing, "two-shot");
  assert.ok(result.actors.alice!.scale >= 0.84 && result.actors.alice!.scale <= 0.94);
  assert.ok(result.actors.bob!.scale >= 0.84 && result.actors.bob!.scale <= 0.94);
  assert.equal(result.actors.alice!.facing, 1);
  assert.equal(result.actors.bob!.facing, -1);
  assert.ok(result.actors.alice!.at[1] < result.camera.subtitleSafeArea.y);
  assert.ok(result.actors.bob!.at[1] < result.camera.subtitleSafeArea.y);
  assert.deepEqual(result.camera.subtitleSafeArea, {x: 80 / 1920, y: 1 - 160 / 1080 - 60 / 1080, width: 1 - 160 / 1920, height: 160 / 1080});
});

test("resolves object relationships and action focus without domain-specific branches", () => {
  const result = resolveStaging({
    location,
    actors: {alice: {facing: "bob"}, bob: {facing: "alice"}},
    objects: {
      desk: {relation: "between", between: ["alice", "bob"]},
      cup: {relation: "on", target: "desk", prominence: "primary"},
    },
    focus: {kind: "action", subject: "alice", target: "cup"},
  });
  assert.equal(result.camera.framing, "focus");
  assert.ok(result.camera.zoom > 1);
  assert.equal(result.objects.cup!.target, "desk");
  assert.ok(result.objects.cup!.z > result.objects.desk!.z);
  assert.ok(result.objects.cup!.at[1] < result.objects.desk!.at[1]);
  assert.deepEqual(result.actors, stageScene({
    location,
    actors: {bob: {facing: "alice"}, alice: {facing: "bob"}},
    objects: {desk: {relation: "between", between: ["alice", "bob"]}, cup: {relation: "on", target: "desk", prominence: "primary"}},
    focus: {kind: "action", subject: "alice", target: "cup"},
  }).actors);
});

test("is deterministic and validates semantic references", () => {
  const input = {
    location,
    actors: [{id: "one", setup: "seated", facing: "audience" as const}],
    objects: [{id: "book", relation: "held-by" as const, target: "one"}],
    focus: {kind: "actor" as const, id: "one"},
  };
  assert.deepEqual(stageScene(input), stageScene(input));
  assert.throws(() => stageScene({...input, focus: {kind: "actor", id: "missing"}}), /unknown focus target/);
  assert.throws(() => stageScene({...input, actors: [{id: "one"}, {id: "one"}]}), /duplicate actor id/);
});

test("separates same-lane actors by footprint independently of input order", () => {
  const first = stageScene({
    location,
    actors: [
      {id: "zeta", entrance: "center", facing: "audience", flip: true, prominence: "primary"},
      {id: "alpha", entrance: "center", facing: "audience", setup: "seated"},
    ],
    objects: [{id: "book", relation: "held-by", target: "alpha"}],
  });
  const second = stageScene({
    location,
    actors: [
      {id: "alpha", entrance: "center", facing: "audience", setup: "seated"},
      {id: "zeta", entrance: "center", facing: "audience", flip: true, prominence: "primary"},
    ],
    objects: [{id: "book", relation: "held-by", target: "alpha"}],
  });

  assert.deepEqual(first, second);
  assert.ok(Math.abs(first.actors.alpha!.at[0] - first.actors.zeta!.at[0]) >= 211 / 1920);
  assert.equal(first.actors.zeta!.flip, true);
  assert.equal(first.actors.zeta!.z, 50);
  assert.equal(first.objects.book!.target, "alpha");
  assert.equal(first.objects.book!.at[0], Number((first.actors.alpha!.at[0] + 78 / 1920).toFixed(3)));
});

test("clamps actor footprints to the subject safe area", () => {
  const result = stageScene({
    location,
    actors: [
      {id: "left", entrance: "left"},
      {id: "right", entrance: "right"},
    ],
  });

  assert.ok(result.actors.left!.at[0] >= result.camera.safeArea.x + 105 / 1920);
  assert.ok(result.actors.right!.at[0] <= result.camera.safeArea.x + result.camera.safeArea.width - 105 / 1920);
  assert.ok(result.actors.left!.at[1] >= result.camera.safeArea.y);
  assert.ok(result.actors.left!.at[1] <= result.camera.safeArea.y + result.camera.safeArea.height);
});

test("reports impossible same-lane compositions clearly", () => {
  assert.throws(
    () => stageScene({location, actors: Array.from({length: 10}, (_, i) => ({id: `actor-${i}`, entrance: "center" as const}))}),
    /staging: impossible composition: same-lane actors require more horizontal safe area/,
  );
});
