import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {compileEpisode, type CompiledScene} from "../src/compiler/index";

// Synthetic fixture episode only; library/ is never written by tests.
// The support-surface pass is exercised through its caller seam
// (compileEpisode): "on(X)" must resolve through DECLARED support surfaces —
// normalized world declarations for world sets, raw art units for legacy sets.

/** Normalized canteen world: counter top painted/declared at y390 of 960x540. */
const WORLD = {
  coordinateSpace: {width: 960, height: 540},
  layers: [{id: "backdrop", foreground: false}, {id: "counter-front", foreground: true}],
  safeArea: {x: 0.1, y: 90 / 540, width: 0.8, height: 360 / 540},
  supports: [{name: "counter", x: [120 / 960, 840 / 960] as const, y: 390 / 540}],
} as const;

const EPISODE = `
episode: {id: setworld, title: Set world, language: en}
actors: {lin: {use: figure/x/lin, voice: voice/x/lin}}
locations: {canteen: {use: set/x/canteen}}
objects: {mug: {use: prop/x/mug}}
scenes:
  - id: props
    location: canteen
    actors: {lin: {facing: audience}}
    objects: {mug: on(counter)}
    script:
      - lin: "hello"
`;

async function compileWithSet(resolved: unknown, placement: "on(counter)" | "on(void)" = "on(counter)"): Promise<CompiledScene> {
  const root = mkdtempSync(join(tmpdir(), "anim-support-pass-"));
  try {
    const dir = join(root, "episodes", "demo");
    mkdirSync(dir, {recursive: true});
    const episodePath = join(dir, "episode.yml");
    writeFileSync(episodePath, placement === "on(counter)" ? EPISODE : EPISODE.replace("on(counter)", placement));
    const compiled = await compileEpisode(episodePath, {
      // An AssetResolver function returns the raw resolved payload; the
      // compiler wraps it into {instance, ref, resolved} itself.
      registry: (ref: string) => (ref.startsWith("set/") ? resolved : {}),
      plugins: [{category: "action", manifest: {}, namespace: {}}],
      speechTimingProvider: () => ({durationSec: 0.5}),
    });
    return compiled.sceneTrack[0]!;
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
}

test("the scene IR carries the normalized declared world", async () => {
  const scene = await compileWithSet({world: WORLD});
  assert.deepEqual(scene.setLayers, WORLD.layers);
  assert.deepEqual(scene.supportSurfaces, WORLD.supports);
  assert.deepEqual(scene.setViewBox, [960, 540]);
  assert.deepEqual(scene.safeArea, WORLD.safeArea);
});

test("on(X) rests the object base on the declared normalized surface", async () => {
  const scene = await compileWithSet({world: WORLD});
  const mug = scene.staging.objects.mug!;
  // y: declared 390/540 normalized -> 780 stage px of 1080.
  assert.equal(mug.at[1], 780 / 1080);
  // x: staging fallback (0.5) is inside the declared x range [240, 1680].
  assert.equal(mug.at[0], 0.5);
  // Contact beats the generic placement z by one plane step.
  assert.equal(mug.z, 36);
});

test("on(X) against an undeclared surface fails compilation loudly", async () => {
  await assert.rejects(
    compileWithSet({world: WORLD}, "on(void)"),
    /object "mug" placed on "void" but no support surface is declared for it/,
  );
});

test("legacy sets keep raw art-unit support resolution", async () => {
  const legacy = {supports: [{name: "counter", x: [240, 1680], y: 450}]};
  const scene = await compileWithSet(legacy);
  // No world declarations on the IR for a legacy set.
  assert.equal(scene.setLayers, undefined);
  assert.equal(scene.setViewBox, undefined);
  const mug = scene.staging.objects.mug!;
  assert.equal(mug.at[1], 450 / 1080);
  assert.equal(mug.at[0], 0.5);
});
