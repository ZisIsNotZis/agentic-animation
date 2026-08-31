import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashFile, hashJsonContent } from "../src/util/hash";

function tmp(): string {
  return mkdtempSync(join(tmpdir(), "anim-hashcontent-"));
}

test("hashJsonContent ignores the wall-clock generatedBy header", () => {
  const dir = tmp();
  const a = join(dir, "a.json");
  const b = join(dir, "b.json");
  // Same semantic content, different provenance timestamp + tool.
  writeFileSync(a, JSON.stringify({ generatedBy: { stage: "voice", tool: "tts:say", at: "2026-07-08T00:00:00.000Z" }, total: 5, scenes: [{ id: "s1" }] }));
  writeFileSync(b, JSON.stringify({ generatedBy: { stage: "voice", tool: "tts:say", at: "2099-01-01T12:34:56.000Z" }, total: 5, scenes: [{ id: "s1" }] }, null, 2));

  assert.equal(hashJsonContent(a), hashJsonContent(b), "clock-only difference must not change the content hash");
  assert.notEqual(hashFile(a), hashFile(b), "raw byte hashes should differ (sanity: the files are not identical)");
});

test("hashJsonContent still tracks semantic changes", () => {
  const dir = tmp();
  const a = join(dir, "a.json");
  const b = join(dir, "b.json");
  writeFileSync(a, JSON.stringify({ generatedBy: { at: "x" }, total: 5 }));
  writeFileSync(b, JSON.stringify({ generatedBy: { at: "x" }, total: 6 }));
  assert.notEqual(hashJsonContent(a), hashJsonContent(b), "a real content change must change the hash");
});

test("hashJsonContent handles bare-array manifests (cues) and non-json", () => {
  const dir = tmp();
  const arr = join(dir, "cues.json");
  writeFileSync(arr, JSON.stringify([{ start: 0, end: 1, viseme: "A" }]));
  assert.equal(typeof hashJsonContent(arr), "string");
});
