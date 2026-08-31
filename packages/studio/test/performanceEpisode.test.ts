import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolvePerformanceFrame } from "../src/components/PerformanceEpisode";
import { sceneForFrame } from "../src/components/performance/Stage";
import type { PerformanceManifest } from "../src/performance";

test("PerformanceEpisode is wired as the manifest-driven composition", () => {
  const source = readFileSync(new URL("../src/components/PerformanceEpisode.tsx", import.meta.url), "utf8");
  assert.match(source, /evaluatePerformance/);
  assert.match(source, /useCurrentFrame/);
  assert.match(source, /manifest/);
  assert.match(source, /PerformanceStage/);
  assert.match(source, /PerformanceActor/);
  assert.match(source, /data-subtitle="voice"/);
  assert.doesNotMatch(source, /<Img|linear-gradient|radial-gradient/);
});

test("QA frames remap seek-safe render frames and clamp bad samples", () => {
  assert.equal(resolvePerformanceFrame(0, [12, 4], 20), 12);
  assert.equal(resolvePerformanceFrame(1, [12, 4], 20), 4);
  assert.equal(resolvePerformanceFrame(99, [12, 4], 20), 4);
  assert.equal(resolvePerformanceFrame(-1, [12, 999], 20), 12);
  assert.equal(resolvePerformanceFrame(Number.NaN, [12, Number.POSITIVE_INFINITY], 20), 12);
  assert.equal(resolvePerformanceFrame(1, [999], 20), 19);
});

test("scene background switches only at compiled scene boundaries", () => {
  const manifest: PerformanceManifest = {
    video: { width: 1920, height: 1080, fps: 10 },
    sceneTrack: [
      { id: "opening", index: 0, location: "office", layout: "office", start: 0, end: 2, duration: 2 } as never,
      { id: "quality", index: 1, location: "office", layout: "office", start: 2, end: 4, duration: 2 } as never,
    ],
  };
  assert.equal(sceneForFrame(manifest, 19).theme, "opening-office");
  assert.equal(sceneForFrame(manifest, 20).theme, "quality-lab");
  assert.equal(sceneForFrame(manifest, 39).id, "quality");
  assert.equal(sceneForFrame(manifest, 20).id, sceneForFrame(manifest, 20).id);
});

test("performance SVG renderer exposes acting and semantic-depth markup", () => {
  const actor = readFileSync(new URL("../src/components/performance/Actor.tsx", import.meta.url), "utf8");
  const stage = readFileSync(new URL("../src/components/performance/Stage.tsx", import.meta.url), "utf8");
  const vfx = readFileSync(new URL("../src/components/performance/Vfx.tsx", import.meta.url), "utf8");
  assert.match(actor, /actor\.expression/);
  assert.match(actor, /actor\.tracks/);
  assert.match(actor, /actor\.pose/);
  assert.match(actor, /expression\.gaze/);
  assert.match(actor, /data-track-count/);
  assert.match(actor, /data-face-expression/);
  assert.match(stage, /AI 项目作战墙/);
  assert.match(stage, /<Desk/);
  assert.match(vfx, /ImpactLines/);
  assert.match(vfx, /screen-error|ErrorOverlay/);
  assert.match(vfx, /lighting-dim/);
  assert.match(vfx, /lighting-rise/);
  assert.doesNotMatch(`${actor}${stage}${vfx}`, /<Img|gradient/i);
});

test("performance frame keeps background below props and actors", () => {
  const source = readFileSync(new URL("../src/components/PerformanceEpisode.tsx", import.meta.url), "utf8");
  assert.match(source, /<PerformanceStage scene=\{scene\}/);
  assert.match(source, /data-layer="props"[\s\S]*PerformanceProp/);
  assert.match(source, /data-layer="actors"[\s\S]*PerformanceActor/);
  assert.ok(source.indexOf("<PerformanceStage scene={scene}") < source.indexOf('data-layer="props"'));
  assert.ok(source.indexOf('data-layer="props"') < source.indexOf('data-layer="actors"'));
});

test("all ten compiled scene ids have distinct background themes", () => {
  const manifest: PerformanceManifest = {
    video: { width: 1920, height: 1080, fps: 24 },
    sceneTrack: [
      "opening", "failure_triad", "teach_ai", "memory", "token", "refactor_minimal", "quality", "pitfalls", "workflow", "ending",
    ].map((id, index) => ({ id, index, location: "office", layout: "office", start: index, end: index + 1, duration: 1 }) as never),
  };
  const themes = manifest.sceneTrack!.map((scene) => sceneForFrame(manifest, Math.round(scene.start * 24)).theme);
  assert.equal(new Set(themes).size, 10);
});

test("Remotion keeps legacy episode and registers continuous performance", () => {
  const source = readFileSync(new URL("../src/remotion/Root.tsx", import.meta.url), "utf8");
  assert.match(source, /id="episode"/);
  assert.match(source, /id="performance"/);
  assert.match(source, /PerformanceEpisode/);
  assert.match(source, /qaFrames\?\.length/);
  assert.match(source, /durationInFrames: performanceProps\.qaFrames\.length/);
});
