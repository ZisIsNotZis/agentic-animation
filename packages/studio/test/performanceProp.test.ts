import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PerformanceProp } from "../src/components/performance/Prop";
import type { EvaluatedProp } from "../src/performance";

const source = readFileSync(new URL("../src/components/performance/Prop.tsx", import.meta.url), "utf8");

/** A prop instance as the evaluator emits it: the declared ASSET identity is
 * `src`, and the instance id/label are the author's arbitrary names. */
function prop(src: string, instance = "instance"): EvaluatedProp {
  return { id: instance, label: instance, x: 500, y: 400, rotation: 0, scale: 1, z: 30, size: [200, 160], src, tracks: [] };
}

const render = (src: string, instance = "instance"): string =>
  renderToStaticMarkup(React.createElement(PerformanceProp, { prop: prop(src, instance) }));

const kindOf = (markup: string): string =>
  /data-prop-kind="([^"]+)"/.exec(markup)?.[1] ?? "missing";

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

test("every prop kind in the art batch resolves from its DECLARED asset identity", () => {
  const expected: Array<[string, string, string]> = [
    ["prop/racket", "racket", "racket"],
    ["prop/shuttle", "shuttle", "shuttle"],
    ["prop/high_bar", "highBar", "high bar"],
    ["prop/teapot", "teapot", "teapot"],
    ["prop/teacup", "teacup", "teacup"],
  ];
  for (const [src, kind, ariaLabel] of expected) {
    // The instance is deliberately named nothing like its asset: a scroll once
    // rendered as the placeholder because art was keyed on the instance name.
    // The instance is deliberately named nothing like its asset: a scroll once
    // rendered as the placeholder because art was keyed on the instance name.
    const markup = render(src, "register");
    assert.equal(kindOf(markup), kind, `${src} must draw its own art, not the generic card`);
    assert.match(markup, new RegExp(`aria-label="${ariaLabel}"`));
    assert.doesNotMatch(markup, /aria-label="generic prop"/);
  }
  assert.equal(kindOf(render("prop/thermos")), "thermos");
  assert.equal(kindOf(render("dressing/coffee_cup")), "thermos", "the one-person cup family keeps the thermos art");
  assert.equal(kindOf(render("dressing/unknown_thing")), "generic");
});
