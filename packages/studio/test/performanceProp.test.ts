import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/performance/Prop.tsx", import.meta.url), "utf8");

test("performance props have dedicated art for every authored episode object", () => {
  for (const kind of ["desk", "thermos", "scroll", "skill_bottle", "skill_cards", "phone", "notebook", "mirror", "flashlight", "ask_matt_sign"]) {
    assert.match(source, new RegExp(kind.replaceAll("_", "[_ ]?"), "i"));
  }
  for (const ariaLabel of ["desk", "thermos", "scroll", "skill bottle", "skill cards", "phone", "notebook", "mirror", "flashlight", "ask matt sign"]) {
    assert.match(source, new RegExp(`aria-label=\\"${ariaLabel}\\"`));
  }
  assert.match(source, /data-prop-kind/);
});

test("hand-bound props carry a visible, inspectable binding cue", () => {
  assert.match(source, /track\.kind === "binding"/);
  assert.match(source, /data-prop-bound/);
  assert.match(source, /data-binding-cue="hand"/);
  assert.doesNotMatch(source, /HAND-BOUND/);
  assert.doesNotMatch(source, /<Img|linear-gradient|radial-gradient/i);
});
