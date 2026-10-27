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

test("a held-by object keeps its own free plane; the hold plane is the renderer's per-frame decision", () => {
  // A prop that STARTS held used to get the holder's plane + 2 written into its
  // staged z, and nothing recomputes a staged plane on release: it drew over
  // every actor for the whole shot, in flight included. The staged plane is the
  // object's own (35, the same a free object gets); PerformanceEpisode's
  // propPlane raises it to the holder's plane only while the bake says it is
  // held, so picked-up and started-held props share one mechanism.
  const result = stageScene({
    location,
    actors: [
      {id: "near", facing: "audience"},
      {id: "far", facing: "audience"},
    ],
    objects: [{id: "shuttle", relation: "held-by", target: "near"}],
  });
  assert.equal(result.actors.near!.z, 50);
  assert.equal(result.objects.shuttle!.z, 35, "a held-by object keeps its own free plane");
  assert.ok(result.objects.shuttle!.z < result.actors.far!.z, "a freed prop must stay behind the actor planes");
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

test("declared safeActorArea clamps actor placement instead of the 10%-90% heuristic", () => {
  // The declared area excludes the heuristic center, so both axes clamp.
  const declared = {id: "canteen", framing: "balanced" as const, safeActorArea: {x: 0.25, y: 0.3, width: 0.2, height: 0.33}};
  const clamped = stageScene({location: declared, actors: [{id: "lin", facing: "audience"}]});
  // Footprint-scaled half-extents inset the declared area (scale 0.92 for one actor).
  assert.deepEqual(clamped.actors.lin!.at, [0.393, 0.524]);
  // Entrances resolve inside the declared area too (collision clamping).
  const entrances = stageScene({location: {id: "canteen", safeActorArea: {x: 0.2, y: 0.3, width: 0.4, height: 0.33}}, actors: [{id: "a", entrance: "left"}, {id: "b", entrance: "right"}]});
  for (const actor of Object.values(entrances.actors)) {
    assert.ok(actor.at[0] >= 0.2 && actor.at[0] <= 0.6, `x ${actor.at[0]} outside declared area`);
    assert.ok(actor.at[1] >= 0.3 && actor.at[1] <= 0.63, `y ${actor.at[1]} outside declared area`);
  }
  // A declared area too small for the actor footprint fails loudly.
  assert.throws(
    () => stageScene({location: {id: "tiny", safeActorArea: {x: 0.49, y: 0.5, width: 0.02, height: 0.02}}, actors: [{id: "lin"}]}),
    /staging: impossible composition: actor footprint does not fit in the subject safe area/,
  );
  // Legacy sets without a declaration keep the heuristic exactly.
  const legacy = {id: "canteen", framing: "balanced" as const};
  const staged = stageScene({location: legacy, actors: [{id: "lin", facing: "audience"}]});
  assert.deepEqual(staged.actors.lin!.at, [0.5, 0.64]);
  assert.deepEqual(
    stageScene({location: {...legacy, safeActorArea: undefined}, actors: [{id: "lin", facing: "audience"}]}).actors,
    staged.actors,
  );
});

test("a background entrance stages the body a court-depth further back, at 0.82 scale", () => {
  // S-A1 review 3, finding 8: the far player declared `entrance: background`
  // and was drawn at the near player's 0.88, so two players at different court
  // depths read as equidistant. The entrance carries the same depth scale the
  // same-named `setup` carries; the declared `setup` still wins where both are
  // present, so no existing declaration moves.
  const pair = stageScene({location, actors: [{id: "near", entrance: "center"}, {id: "far", entrance: "background"}]});
  const near = pair.actors.near!.scale;
  assert.equal(pair.actors.far!.scale, Number((near * 0.82).toFixed(3)));
  assert.ok(pair.actors.far!.at[1] < pair.actors.near!.at[1], "the background body stands higher on the floor plane");
  const posture = stageScene({location, actors: [{id: "seated", entrance: "background", setup: "seated"}, {id: "near", entrance: "center"}]});
  assert.equal(posture.actors.seated!.scale, Number((near * 0.82).toFixed(3)), "a posture setup does not cancel the entrance's depth");
  const setupWins = stageScene({location, actors: [{id: "deep", entrance: "foreground", setup: "background"}, {id: "near", entrance: "center"}]});
  assert.equal(setupWins.actors.deep!.scale, Number((near * 0.82).toFixed(3)), "a declared depth setup wins over the entrance");
  const foreground = stageScene({location, actors: [{id: "front", entrance: "foreground"}, {id: "near", entrance: "center"}]});
  assert.equal(foreground.actors.front!.scale, Number((near * 1.05).toFixed(3)));
});
