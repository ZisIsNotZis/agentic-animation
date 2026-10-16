// Sync proof: the declared part colliders in library/figure/*/skeleton.json
// are EXACTLY the drawn figure geometry in
// packages/studio/src/components/performance/Actor.tsx. If anyone edits the
// drawing without re-running `npx tsx scripts/part-bounds.ts write`, these
// tests fail — the colliders can never silently drift from the art.
import {readFileSync, existsSync} from "node:fs";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {extractShapes, computeParts, figureDirs, verifyFigure} from "../../../scripts/part-bounds";
import {FigureAssetManifestSchema} from "../src/schemas/libraryMeta";

const ROOT = join(import.meta.dirname, "../../..");
const source = readFileSync(join(ROOT, "packages/studio/src/components/performance/Actor.tsx"), "utf8");
const shapes = extractShapes(source);

test("drawn geometry is extractable and self-consistent", () => {
  assert.equal(shapes.limbRadius, 18); // LIMB_OUTLINE 36 → visible capsule r18
  assert.equal(shapes.fistRadius, 21.5); // fist silhouette incl. ink stroke
  assert.deepEqual(shapes.anchors.shoulder, [[140, 286], [260, 286]]);
  assert.deepEqual(shapes.anchors.hip, [[158, 500], [242, 500]]);
});

// Legacy paper-doll figures share the one drawn Actor.tsx puppet, so their
// colliders must equal the shared drawing. Native svg-bone-parts figures
// (artwork.json) own their per-view geometry: the registry serves the
// artwork's front skeleton as the runtime skeleton (registry.ts), so the
// declared skeleton.json must mirror it exactly instead.
const hasArtwork = (dir: string): boolean => existsSync(join(ROOT, "library/figure", dir, "artwork.json"));

for (const dir of figureDirs(ROOT)) {
  test(`${dir}: skeleton.json passes the strict skeleton schema (registry path)`, () => {
    const raw = JSON.parse(readFileSync(join(ROOT, "library/figure", dir, "skeleton.json"), "utf8"));
    // The registry wraps the skeleton with path-derived identity/kind, then
    // parses through FigureAssetManifestSchema (packages/core/src/assets/registry.ts).
    const parsed = FigureAssetManifestSchema.safeParse({identity: `figure/${dir}`, kind: "figure", skeleton: raw});
    assert.equal(parsed.success, true, JSON.stringify(parsed.success ? [] : parsed.error.issues, null, 1));
  });

  if (hasArtwork(dir)) {
    test(`${dir}: native artwork front skeleton == declared skeleton.json`, () => {
      const skeleton = JSON.parse(readFileSync(join(ROOT, "library/figure", dir, "skeleton.json"), "utf8"));
      const artwork = JSON.parse(readFileSync(join(ROOT, "library/figure", dir, "artwork.json"), "utf8"));
      assert.deepEqual(artwork.views.front.skeleton, skeleton);
    });
  } else {
    test(`${dir}: declared part colliders == drawn geometry`, () => {
      const manifest = JSON.parse(readFileSync(join(ROOT, "library/figure", dir, "skeleton.json"), "utf8"));
      assert.equal(verifyFigure(ROOT, dir, shapes), null);
      assert.deepEqual(manifest.parts, computeParts(shapes, manifest.joints));
    });
  }
}
