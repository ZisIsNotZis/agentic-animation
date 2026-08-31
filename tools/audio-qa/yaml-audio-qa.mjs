#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const episodeDir = resolve(process.argv[2] ?? "episodes/ai-work-adventure");
const artifactPath = join(episodeDir, "audio", "yaml-audio.json");
if (!existsSync(artifactPath)) throw new Error(`audio-qa: missing ${artifactPath}`);
const artifact = JSON.parse(readFileSync(artifactPath, "utf8"));
const errors = [];
const takes = artifact.takes ?? [];
const cleanInline = (source) => source.replace(/\{([^{}]*)\}/gu, (raw, token) => {
  const cue = /^#[^\s{}(),]+$/u.test(token.trim());
  const call = /^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\([^{}]*\)$/u.test(token.trim());
  return cue || call ? "" : raw;
});
const resolved = (p) => p?.startsWith("/") ? p : join(episodeDir, p ?? "");
const duration = (p) => {
  const result = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p], {encoding: "utf8"});
  if (result.status !== 0) return NaN;
  return Number.parseFloat(result.stdout.trim());
};
const closeEnough = (a, b) => Number.isFinite(a) && Math.abs(a - b) <= 0.01;
const intervals = [];
for (const take of takes) {
  const text = take.text;
  const caption = take.captions?.[0];
  if (cleanInline(take.sourceText ?? "") !== text) errors.push(`${take.id}: source text does not clean to spoken text`);
  if (caption && caption.text !== text) errors.push(`${take.id}: spoken text != subtitle text byte-for-byte`);
  if (!caption && text) errors.push(`${take.id}: missing subtitle for spoken text`);
  if (take.captions?.length > 1) errors.push(`${take.id}: more than one voice subtitle`);
  const path = resolved(take.audioPath ?? take.timing?.audioPath);
  if (!existsSync(path)) errors.push(`${take.id}: missing audio ${path}`);
  else if (!closeEnough(duration(path), take.durationSec)) errors.push(`${take.id}: duration mismatch`);
  intervals.push([take.timing.startSec, take.timing.endSec, take.id]);
}
intervals.sort((a, b) => a[0] - b[0]);
for (let i = 1; i < intervals.length; i++) if (intervals[i][0] < intervals[i - 1][1] - 0.001) errors.push(`${intervals[i][2]} overlaps ${intervals[i - 1][2]}`);
if ((artifact.unmatchedCount ?? 0) > 0) errors.push(`unmatched takes remain: ${artifact.unmatchedCount}`);
const report = {
  episode: episodeDir,
  takes: takes.length,
  reuseCount: artifact.reuseCount ?? 0,
  unmatchedCount: artifact.unmatchedCount ?? 0,
  audioFiles: takes.filter((take) => existsSync(resolved(take.audioPath ?? take.timing?.audioPath))).length,
  subtitleCount: takes.reduce((n, take) => n + (take.captions?.length ?? 0), 0),
  errors,
};
const out = join(episodeDir, "audio", "yaml-audio-qa.json");
writeFileSync(out, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (errors.length) process.exitCode = 1;
