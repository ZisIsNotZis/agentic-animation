import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveBeatTime, setOptionsWithoutCaption } from "../src/stages/assemble";

test("dialogue-linked FX resolve to the line's absolute start", () => {
  const timing = {
    start: 0,
    narrAt: 0.5,
    dur: 20,
    dialogue: [{ id: "system-bind", characterId: "system", start: 11.479, dur: 7.574 }],
  };

  assert.equal(
    resolveBeatTime({ at: "narr+3.3", opts: { lineId: "system-bind" } }, timing),
    11.479,
  );
});

test("a missing dialogue link fails instead of silently guessing an FX time", () => {
  assert.throws(
    () => resolveBeatTime({ at: "narr+3.3", opts: { lineId: "missing" } }, { start: 0, narrAt: 0, dur: 20, dialogue: [] }),
    /dialogue line "missing" not found/,
  );
});

test("shot captions do not fall back to untimed scene labels", () => {
  const source = readFileSync(join(process.cwd(), "packages/studio/src/components/Shot.tsx"), "utf8");
  assert.match(source, /const text = cue\?\.text \?\? ""/);
  assert.doesNotMatch(source, /cue\?\.text \?\? \(typeof shot\.setOpts/);
});

test("scene caption metadata is removed before the render build", () => {
  assert.deepEqual(setOptionsWithoutCaption({ accent: "#e6b84f", caption: "开场：高级打工人" }), { accent: "#e6b84f" });
  assert.equal(setOptionsWithoutCaption({ caption: "不要渲染" }), undefined);
});
