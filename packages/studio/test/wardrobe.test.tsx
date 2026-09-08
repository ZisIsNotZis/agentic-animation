// Wardrobe consistency: every view draws clothing from wardrobe.tsx (no
// per-view palette copies), and the front/back fabric are two planes of the
// same garment (same seed family, distinct construction marks).
import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {readFileSync} from "node:fs";
import {renderToStaticMarkup} from "react-dom/server";
import {INK, SKIN, HAIR, ROBES, DARKS, RobeFabric, seedOf} from "../src/components/performance/wardrobe";

test("wardrobe: palette is the single source — no per-view copies", () => {
  for (const file of ["Actor.tsx", "views45.tsx"]) {
    const src = readFileSync(new URL(`../src/components/performance/${file}`, import.meta.url), "utf8");
    for (const banned of ['const INK = "', 'const SKIN = "', 'const HAIR = "', 'const ROBES = [', 'const DARKS = [']) {
      assert.ok(!src.includes(banned), `${file} must not redeclare ${banned}`);
    }
    assert.ok(src.includes('from "./wardrobe"'), `${file} must import the wardrobe SSOT`);
  }
  // The SSOT keeps the canonical values.
  assert.equal(INK, "#272331");
  assert.equal(ROBES.length, 3);
  assert.equal(DARKS.length, 3);
});

test("wardrobe: seed is stable per figure id", () => {
  assert.equal(seedOf("lin"), seedOf("lin"));
  assert.notEqual(seedOf("lin"), seedOf("awei"));
});

test("wardrobe: front and back are distinct planes of the same garment", () => {
  const id = "lin";
  const role = 0;
  const clip = "robeClip-test";
  const front = renderToStaticMarkup(<RobeFabric id={id} role={role} side="front" clipId={clip} />);
  const back = renderToStaticMarkup(<RobeFabric id={id} role={role} side="back" clipId={clip} />);
  // Both clipped to the given robe silhouette.
  assert.ok(front.includes(`url(#${clip})`) && back.includes(`url(#${clip})`), "both planes clip to the view's robe path");
  // Distinct construction: back carries the stitched seam + bands, front the weave.
  assert.ok(front.includes("fabric weave front") && !front.includes("fabric back construction"));
  assert.ok(back.includes("fabric back construction") && back.includes("stroke-dasharray"), "back plane shows construction marks");
  assert.notEqual(front, back);
});
