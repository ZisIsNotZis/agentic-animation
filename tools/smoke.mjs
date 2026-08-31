#!/usr/bin/env node
/** Canonical YAML smoke test in an isolated temporary project. */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const project = mkdtempSync(join(tmpdir(), "anim-canonical-smoke-"));
const episodeDir = join(project, "episodes", "smoke");
const episodePath = join(episodeDir, "episode.yml");
const cli = join(ROOT, "packages", "cli", "src", "index.ts");

function fail(message) {
  process.stderr.write(`\nSMOKE FAILED: ${message}\n`);
  rmSync(project, { recursive: true, force: true });
  process.exit(1);
}
function run(label, args) {
  process.stdout.write(`\n[smoke] ${label}\n         anim ${args.join(" ")}\n`);
  const result = spawnSync(process.execPath, ["--import", "tsx", cli, ...args], {
    cwd: ROOT, env: { ...process.env, ANIM_NOW: "2026-07-08T00:00:00.000Z" }, stdio: "inherit",
  });
  if (result.status !== 0) fail(`${label} exited with code ${result.status}`);
}

try {
  mkdirSync(join(project, "library", "registry"), { recursive: true });
  mkdirSync(episodeDir, { recursive: true });
  cpSync(join(ROOT, "library", "registry", "manifest.json"), join(project, "library", "registry", "manifest.json"));
  writeFileSync(join(project, "anim.config.json"), JSON.stringify({ paths: { library: "library", episodes: "episodes" }, adapters: { tts: "dir", renderer: "remotion" } }));
  writeFileSync(episodePath, `episode: {id: smoke, title: Canonical smoke, language: en}
actors: {alice: {use: figure.office.aqiang.v1, voice: voice.zh.aqiang.v1}}
locations: {stage: {use: set.office.agent-stage.v1}}
objects: {desk: {use: prop.office.desk.v1}}
scenes:
  - id: check
    location: stage
    actors: {alice: {facing: audience}}
    objects: {desk: center}
    script:
      - alice: "…"
`);
  run("check canonical episode.yml", ["--cwd", project, "check", episodePath]);
  run("make canonical performance manifest", ["--cwd", project, "make", episodePath]);
  const manifestPath = join(episodeDir, "performance.json");
  const audioPath = join(episodeDir, "audio", "yaml-audio.json");
  if (!existsSync(manifestPath) || !existsSync(audioPath)) fail("canonical artifacts are missing");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (manifest.generatedBy?.stage !== "yaml-make" || manifest.timebase !== "seconds" || !(manifest.duration > 0)) fail("manifest contract assertion failed");
  process.stdout.write(`\nSMOKE PASSED\n  manifest: ${manifestPath}\n  duration: ${manifest.duration}s\n`);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
