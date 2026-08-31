import { test } from "node:test";
import assert from "node:assert/strict";
import { createPrng, seedFromString } from "../src/util/prng";

test("same seed produces the same sequence", () => {
  const a = createPrng(42);
  const b = createPrng(42);
  const seqA = Array.from({ length: 5 }, () => a.next());
  const seqB = Array.from({ length: 5 }, () => b.next());
  assert.deepEqual(seqA, seqB);
});

test("different seeds diverge", () => {
  const a = createPrng(1);
  const b = createPrng(2);
  assert.notEqual(a.next(), b.next());
});

test("next() stays in [0, 1)", () => {
  const p = createPrng(7);
  for (let i = 0; i < 1000; i++) {
    const v = p.next();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test("int() stays in range and pick() is deterministic", () => {
  const p = createPrng(99);
  for (let i = 0; i < 100; i++) {
    const v = p.int(6);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 6);
  }
  assert.equal(createPrng(5).pick(["a", "b", "c"]), createPrng(5).pick(["a", "b", "c"]));
  assert.throws(() => p.int(0), /maxExclusive/);
  assert.throws(() => p.pick([]), /empty/);
});

test("seedFromString is stable and returns a uint32", () => {
  const s = seedFromString("krishna");
  assert.equal(s, seedFromString("krishna"));
  assert.ok(s >= 0 && s <= 0xffffffff);
  assert.notEqual(seedFromString("krishna"), seedFromString("arjuna"));
});
