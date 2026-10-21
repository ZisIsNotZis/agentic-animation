import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolvePerformanceFrame, PerformanceFrame } from "../src/components/PerformanceEpisode";
import { evaluatePerformance } from "../src/performance/evaluate";
import { sceneForFrame } from "../src/components/performance/Stage";
import type { PerformanceManifest } from "../src/performance";

test("each actor paints on its own declared plane, so a declared depth can stand between two actors", () => {
  // D1's wrapper half: one shared actor wrapper carries its own stacking
  // context, so a set layer at depth 45 composites above BOTH players. The
  // plane each actor wrapper emits must therefore be its own `actor.z`.
  const manifest: PerformanceManifest = {
    video: { width: 1920, height: 1080, fps: 10 },
    durationInFrames: 10,
    locationScenes: { "canteen/net": `<g id="net"><rect x="0" y="420" width="960" height="40"/></g>` },
    sceneTrack: [{
      id: "props", index: 0, location: "canteen", layout: "canteen", start: 0, end: 2, duration: 2,
      setLayers: [{ id: "net", foreground: false, depth: 45 }], setViewBox: [960, 540],
    } as never],
    actors: [
      { id: "near", placement: { at: [900, 700], scale: 0.7 } },
      { id: "far", placement: { at: [600, 650], scale: 0.7 } },
    ],
  } as PerformanceManifest;
  const state = evaluatePerformance(manifest, 0);
  assert.equal(state.actors.length, 2, "the fixture stages two actors");
  state.actors[0]!.z = 40;
  state.actors[1]!.z = 50;
  const html = renderToStaticMarkup(React.createElement(PerformanceFrame, { manifest, state }));
  const planes = [...html.matchAll(/data-layer="actors"[^>]*z-index:(\d+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(planes.sort((a, b) => a - b), [40, 50], "one wrapper per actor, each at its own plane");
  // Each wrapper holds exactly one actor, so no actor can hide behind another's plane.
  for (const segment of html.split('data-layer="actors"').slice(1)) {
    assert.equal((segment.match(/data-actor-id=/g) ?? []).length, 1);
  }
  const netZ = Number(html.slice(html.indexOf('data-set-layer="net"')).match(/z-index:(\d+)/)![1]!);
  assert.equal(netZ, 45);
  assert.ok(netZ > 40 && netZ < 50, "the net paints between the near and the far plane");
});

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
  const pose = readFileSync(new URL("../../core/src/motor/actorPose.ts", import.meta.url), "utf8");
  const stage = readFileSync(new URL("../src/components/performance/Stage.tsx", import.meta.url), "utf8");
  const vfx = readFileSync(new URL("../src/components/performance/Vfx.tsx", import.meta.url), "utf8");
  assert.match(actor, /actor\.expression/);
  assert.match(actor, /actor\.tracks/);
  assert.match(actor, /actor\.pose/);
  assert.match(pose, /expression\.gaze/);
  assert.match(actor, /data-track-count/);
  assert.match(actor, /data-face-expression/);
  assert.match(stage, /AI 项目作战墙/);
  assert.match(stage, /<Desk/);
  assert.match(vfx, /ImpactLines/);
  assert.match(vfx, /screen-error|ErrorOverlay/);
  assert.match(vfx, /lighting-dim/);
  assert.match(vfx, /lighting-rise/);
  assert.doesNotMatch(`${actor}${pose}${stage}${vfx}`, /<Img|gradient/i);
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
