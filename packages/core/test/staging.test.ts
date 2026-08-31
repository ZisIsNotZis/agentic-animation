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
  assert.deepEqual(result.camera.subtitleSafeArea, {x: 80, y: 860, width: 1760, height: 160});
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
