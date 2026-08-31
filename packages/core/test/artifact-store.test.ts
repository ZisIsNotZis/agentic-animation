import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { isStale, readJson, writeGenerated, writeJson } from "../src/store/artifactStore";
import { hashJson, stableStringify } from "../src/util/hash";

const Schema = z.object({
  generatedBy: z
    .object({ stage: z.string(), tool: z.string(), at: z.string(), inputHash: z.string().optional() })
    .optional(),
  value: z.number(),
});

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "anim-store-"));
}

test("writeJson validates and round-trips through readJson", () => {
  const path = join(tmp(), "a.json");
  writeJson(path, Schema, { value: 3 });
  const back = readJson(path, Schema);
  assert.equal(back.value, 3);
});

test("writeJson refuses invalid data", () => {
  const path = join(tmp(), "bad.json");
  assert.throws(() => writeJson(path, Schema, { value: "nope" } as unknown as { value: number }), /refusing/);
});

test("readJson reports missing files and bad schema", () => {
  assert.throws(() => readJson(join(tmp(), "missing.json"), Schema), /does not exist/);
});

test("writeGenerated stamps a generatedBy header with an input hash", () => {
  const path = join(tmp(), "gen.json");
  writeGenerated(path, Schema, { value: 9 }, { stage: "voice", tool: "test", at: "2026-01-01T00:00:00Z", inputs: { a: 1 } });
  const raw = JSON.parse(readFileSync(path, "utf8"));
  assert.equal(raw.generatedBy.stage, "voice");
  assert.equal(raw.generatedBy.at, "2026-01-01T00:00:00Z");
  assert.equal(raw.generatedBy.inputHash, hashJson({ a: 1 }));
});

test("isStale detects changed inputs", () => {
  const path = join(tmp(), "stale.json");
  const inputs = { a: 1, b: [2, 3] };
  writeGenerated(path, Schema, { value: 1 }, { stage: "s", tool: "t", at: "2026-01-01T00:00:00Z", inputs });
  assert.equal(isStale(path, inputs), false);
  assert.equal(isStale(path, { a: 1, b: [2, 4] }), true);
  assert.equal(isStale(join(tmp(), "nope.json"), inputs), true);
});

test("stableStringify is key-order independent", () => {
  assert.equal(stableStringify({ a: 1, b: 2 }), stableStringify({ b: 2, a: 1 }));
});
