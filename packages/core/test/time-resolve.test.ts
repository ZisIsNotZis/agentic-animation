import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidTimeRef, resolveTimeRef, type SceneTiming } from "../src/time/resolve";

// scene: starts at 10s, narration begins at 12s, lasts 20s total.
const scene: SceneTiming = { start: 10, narrAt: 12, dur: 20 };

test("numeric ref is seconds from scene start", () => {
  assert.equal(resolveTimeRef(0, scene), 10);
  assert.equal(resolveTimeRef(5, scene), 15);
  assert.equal(resolveTimeRef(20, scene), 30);
});

test("percent ref is a fraction of scene duration", () => {
  assert.equal(resolveTimeRef("0%", scene), 10);
  assert.equal(resolveTimeRef("50%", scene), 20);
  assert.equal(resolveTimeRef("100%", scene), 30);
  assert.equal(resolveTimeRef("12.5%", scene), 10 + 0.125 * 20);
});

test("narr ref is relative to narration start, signed", () => {
  assert.equal(resolveTimeRef("narr+0", scene), 12);
  assert.equal(resolveTimeRef("narr+3", scene), 15);
  assert.equal(resolveTimeRef("narr-2", scene), 10);
  assert.equal(resolveTimeRef("narr+1.5", scene), 13.5);
});

test("unrecognized refs throw a descriptive error", () => {
  assert.throws(() => resolveTimeRef("soon" as unknown as number, scene), /unrecognized time ref/);
  assert.throws(() => resolveTimeRef("50" as unknown as number, scene), /unrecognized time ref/);
  assert.throws(() => resolveTimeRef(Number.NaN, scene), /finite/);
});

test("isValidTimeRef accepts the three forms and rejects junk", () => {
  assert.ok(isValidTimeRef(4));
  assert.ok(isValidTimeRef("25%"));
  assert.ok(isValidTimeRef("narr+2"));
  assert.ok(isValidTimeRef("narr-2"));
  assert.ok(!isValidTimeRef("narr"));
  assert.ok(!isValidTimeRef("25"));
  assert.ok(!isValidTimeRef("%"));
  assert.ok(!isValidTimeRef(Number.POSITIVE_INFINITY));
  assert.ok(!isValidTimeRef({}));
});
