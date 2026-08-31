import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = mkdtempSync(join(tmpdir(), "yaml-audio-qa-"));
mkdirSync(join(dir, "audio"));
const wav = join(dir, "audio", "take.wav");
assert.equal(spawnSync("ffmpeg", ["-y", "-v", "error", "-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono", "-t", "0.25", wav]).status, 0);
writeFileSync(join(dir, "audio", "yaml-audio.json"), JSON.stringify({
  takes: [{id: "s.0", sourceText: "你{gesture.nod()}好{#done}", text: "你好", durationSec: 0.25, audioPath: "audio/take.wav", timing: {startSec: 0, endSec: 0.25}, captions: [{startSec: 0, endSec: 0.25, text: "你好"}]}],
  reuseCount: 1,
  unmatchedCount: 0,
}));
const result = spawnSync(process.execPath, ["tools/audio-qa/yaml-audio-qa.mjs", dir], {encoding: "utf8"});
assert.equal(result.status, 0, result.stderr);
assert.match(result.stdout, /"errors": \[\]/);
