import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { YamlAudioPreparationSchema, type CompiledEpisode } from "@anim/core";
import { checkYamlEpisode, makeYamlEpisode, renderYamlEpisode, resolveYamlEpisode } from "../src/commands/yamlPipeline";

function fixture(): { root: string; episode: string; ctx: any } {
  const root = mkdtempSync(join(tmpdir(), "anim-yaml-pipeline-"));
  const dir = join(root, "episodes", "demo");
  mkdirSync(join(root, "library", "registry"), { recursive: true });
  writeFileSync(join(root, "library", "registry", "manifest.json"), JSON.stringify({ version: 1, kind: "registry", assets: [], procedures: [] }));
  const episode = join(dir, "episode.yml");
  mkdirSync(dir, { recursive: true });
  writeFileSync(episode, `
episode: {id: demo, title: Demo, language: en}
actors: {alice: {use: figure.demo.alice.v1, voice: voice.demo.alice.v1}}
locations: {room: {use: set.demo.room.v1}}
objects: {desk: {use: prop.demo.desk.v1}}
scenes:
  - id: hello
    location: room
    actors: {alice: {facing: audience}}
    objects: {desk: center}
    script:
      - alice: "hello"
`);
  return {
    root,
    episode,
    ctx: {
      rootDir: root,
      config: {
        paths: { library: "library" },
        video: { width: 1920, height: 1080, fps: 24, crf: 20 },
        render: { concurrency: 4, offthreadVideoCacheSizeInBytes: 2 * 1024 * 1024 * 1024 },
        adapters: { renderer: "fake" },
      },
      registry: { find: () => undefined },
      log: { stage: () => ({ info() {}, warn() {} }) },
    },
  };
}

function compiled(): CompiledEpisode {
  return {
    episode: { id: "demo", title: "Demo", language: "en" },
    assets: { actors: {}, sets: {}, objects: {}, dressing: {}, layouts: {} },
    sceneTrack: [],
    performanceTracks: [],
    bindingConstraints: [],
    totalDuration: 1.25,
  };
}

function preparation() {
  return YamlAudioPreparationSchema.parse({
    episodeId: "demo",
    profile: "test",
    compilerVersion: "test",
    takes: [],
  });
}

test("canonical commands resolve an explicit episode.yml and inject compiler seams", async () => {
  const f = fixture();
  const calls: string[] = [];
  const deps = {
    loadAssetRegistry: async (path: string) => {
      calls.push(`registry:${path}`);
      return { resolveAsset: (id: string) => ({ id }), resolveProcedure: (id: string) => ({ id }) } as any;
    },
    compileEpisode: async (path: string) => {
      calls.push(`compile:${path}`);
      return compiled();
    },
    prepareAudio: async () => preparation(),
    now: () => "2026-01-01T00:00:00.000Z",
  };

  const checked = await checkYamlEpisode(f.ctx, f.episode, deps);
  assert.equal(checked.episodeId, "demo");
  const made = await makeYamlEpisode(f.ctx, f.episode, { provider: "fake" }, deps);
  assert.equal(made.manifestPath, join(f.root, "episodes", "demo", "performance.json"));
  assert.deepEqual(calls, [
    `registry:${join(f.root, "library")}`,
    `compile:${f.episode}`,
    `registry:${join(f.root, "library")}`,
    `compile:${f.episode}`,
  ]);
  const manifest = JSON.parse(readFileSync(made.manifestPath, "utf8"));
  assert.equal(manifest.generatedBy.stage, "yaml-make");
  assert.equal(manifest.timebase, "seconds");
});

test("render-yaml forwards render controls to an injected renderer without rendering in tests", async () => {
  const f = fixture();
  let request: any;
  const result = await renderYamlEpisode(f.ctx, f.episode, {
    threads: 3,
    duration: 2.5,
    scale: 2 / 3,
    fps: 30,
    crf: 18,
    force: true,
  }, {
    loadAssetRegistry: async () => ({ resolveAsset: (id: string) => ({ id }), resolveProcedure: (id: string) => ({ id }) } as any),
    compileEpisode: async () => compiled(),
    prepareAudio: async () => preparation(),
    renderManifest: async (_ctx, next) => {
      request = next;
      return { outPath: next.outPath, frames: 75, durationSec: 2.5 };
    },
  });
  assert.equal(result.rendered, true);
  assert.deepEqual(request, {
    manifestPath: join(f.root, "episodes", "demo", "performance.json"),
    outPath: join(f.root, "episodes", "demo", "dist", "demo.mp4"),
    fps: 30,
    crf: 18,
    threads: 3,
    duration: 2.5,
    scale: 2 / 3,
    force: true,
  });
});

test("non-canonical filenames are rejected before generated artifacts are touched", async () => {
  const f = fixture();
  const other = join(f.root, "episodes", "demo", "story.yml");
  writeFileSync(other, readFileSync(f.episode));
  await assert.rejects(resolveYamlEpisode(f.ctx, other), /canonical input must be named episode\.yml/);
});
