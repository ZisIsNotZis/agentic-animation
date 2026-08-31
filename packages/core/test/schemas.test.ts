import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MANIFEST_SCHEMAS,
  MOODS,
  PuppetSchema,
  ScriptSchema,
  StoryboardSchema,
  VISEMES,
} from "../src/schemas/index";

test("every manifest schema is registered", () => {
  const names = Object.keys(MANIFEST_SCHEMAS);
  for (const expected of ["episode", "script", "timeline", "storyboard", "puppet", "episode.build", "narrow-episode"]) {
    assert.ok(names.includes(expected), `missing ${expected}`);
  }
});

test("there are exactly 7 moods and 9 visemes", () => {
  assert.equal(MOODS.length, 7);
  assert.equal(VISEMES.length, 9);
});

test("script scene applies pad defaults", () => {
  const parsed = ScriptSchema.parse({
    title: "T",
    scenes: [{ id: "s1", display: "D", tts: "D.", mood: "mystic" }],
  });
  assert.equal(parsed.scenes[0]!.padBefore, 2);
  assert.equal(parsed.scenes[0]!.padAfter, 2.4);
});

test("puppet requires all 9 mouth visemes", () => {
  const full = Object.fromEntries(VISEMES.map((v) => [v, `mouth/${v}.png`]));
  const base = {
    id: "x",
    version: 1,
    designSize: [1024, 2048],
    parts: [{ id: "torso", image: "parts/torso.png", pivot: [512, 900], z: 10, parent: null }],
    mouth: { anchor: "head", at: [512, 520], shapes: full },
  };
  assert.ok(PuppetSchema.safeParse(base).success);
  const { X: _drop, ...missing } = full;
  assert.ok(!PuppetSchema.safeParse({ ...base, mouth: { ...base.mouth, shapes: missing } }).success);
});

test("puppet rig/norm are migration-safe: legacy rigs default to sharedFrame + norm [1,1]", () => {
  const full = Object.fromEntries(VISEMES.map((v) => [v, `mouth/${v}.png`]));
  // A pre-existing puppet.json omits `rig` and part `norm` entirely.
  const legacy = PuppetSchema.parse({
    id: "x",
    version: 1,
    designSize: [1024, 2048],
    parts: [{ id: "torso", image: "parts/torso.png", pivot: [512, 900], z: 10, parent: null }],
    mouth: { anchor: "head", at: [512, 520], shapes: full },
  });
  assert.equal(legacy.rig, "sharedFrame");
  assert.deepEqual(legacy.parts[0]!.norm, [1, 1]);

  // A native rig round-trips its explicit fields.
  const native = PuppetSchema.parse({
    id: "y",
    version: 1,
    rig: "nativeAttach",
    designSize: [1024, 2048],
    parts: [{ id: "torso", image: "p.png", pivot: [110, 70], z: 10, parent: null, attach: [512, 620], norm: [1.4, 1.3] }],
    mouth: { anchor: "head", at: [250, 230], shapes: full },
  });
  assert.equal(native.rig, "nativeAttach");
  assert.deepEqual(native.parts[0]!.norm, [1.4, 1.3]);
});

test("storyboard accepts all three time-ref forms", () => {
  const ok = StoryboardSchema.safeParse({
    shots: [
      {
        id: "sh1",
        sceneId: "s1",
        set: "interior",
        camera: [{ t: 0 }, { t: "60%", z: 1.2, ease: "io" }],
        actors: [{ characterId: "_placeholder", version: 1, at: [960, 1000] }],
        beats: [{ at: "narr+2", actor: "_placeholder", pose: "bless" }],
      },
    ],
  });
  assert.ok(ok.success, ok.success ? "" : JSON.stringify(ok.error.issues));
});
