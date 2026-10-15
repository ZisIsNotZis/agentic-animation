import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {PerformanceForegroundLayers, PerformanceStage, sceneForFrame} from "../src/components/performance/Stage";
import type {PerformanceManifest} from "../src/performance";

const BACKDROP = `<g id="backdrop"><rect width="960" height="540" fill="#f0d59b"/></g>`;
const COUNTER = `<g id="counter"><rect x="120" y="390" width="720" height="80"/><g id="counter-legs"><rect x="140" y="470" width="20" height="60"/></g></g>`;
const COUNTER_FRONT = `<g id="counter-front"><rect x="120" y="400" width="720" height="60" fill="#70432f"/></g>`;

function layeredManifest(): PerformanceManifest {
  return {
    video: {width: 1920, height: 1080, fps: 10},
    locationScenes: {
      "canteen/backdrop": BACKDROP,
      "canteen/counter": COUNTER,
      "canteen/counter-front": COUNTER_FRONT,
    },
    sceneTrack: [{
      id: "props", index: 0, location: "canteen", layout: "canteen", start: 0, end: 2, duration: 2,
      setLayers: [{id: "backdrop", foreground: false}, {id: "counter", foreground: false}, {id: "counter-front", foreground: true}],
      setViewBox: [960, 540],
    } as never],
  };
}

test("sceneForFrame resolves declared layers with preloaded group text", () => {
  const scene = sceneForFrame(layeredManifest(), 0);
  assert.deepEqual(scene.setLayers?.map((layer) => [layer.id, layer.foreground]), [
    ["backdrop", false], ["counter", false], ["counter-front", true],
  ]);
  assert.deepEqual(scene.setViewBox, [960, 540]);
  assert.equal(scene.sceneSvg, undefined);
});

test("background layers composite in declared back-to-front order below the actor plane", () => {
  const markup = renderToStaticMarkup(React.createElement(PerformanceStage, {scene: sceneForFrame(layeredManifest(), 0)}));
  assert.match(markup, /data-set-layer="backdrop"/);
  assert.match(markup, /data-set-layer="counter"/);
  assert.doesNotMatch(markup, /counter-front/);
  assert.ok(markup.indexOf('data-set-layer="backdrop"') < markup.indexOf('data-set-layer="counter"'), "declared order is paint order");
  assert.match(markup, /viewBox="0 0 960 540"/);
  assert.match(markup, /width="1920" height="1080"/);
  // Declared background stays below the fixed planes (props 20, actors 40).
  for (const zIndex of markup.match(/z-index:(\d+)/g) ?? []) assert.ok(Number(zIndex.slice(8)) < 20);
});

test("foreground layers occlude actors and props", () => {
  const scene = sceneForFrame(layeredManifest(), 0);
  const markup = renderToStaticMarkup(React.createElement(PerformanceForegroundLayers, {scene}));
  assert.match(markup, /data-set-layer="counter-front"/);
  assert.match(markup, /data-set-foreground="true"/);
  assert.ok(markup.includes(COUNTER_FRONT));
  const zIndex = Number(markup.match(/z-index:(\d+)/)![1]!);
  assert.ok(zIndex > 60, `foreground zIndex ${zIndex} must sit above the actor/prop planes (props 20, actors 40, native 60)`);
  assert.doesNotMatch(markup, /data-set-layer="backdrop"/);
});

test("sets without declared layers keep the flat single-background path", () => {
  const manifest: PerformanceManifest = {
    video: {width: 1920, height: 1080, fps: 10},
    locationScenes: {office: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#f0d59b"/></svg>`},
    sceneTrack: [{id: "opening", index: 0, location: "office", layout: "office", start: 0, end: 2, duration: 2} as never],
  };
  const scene = sceneForFrame(manifest, 0);
  assert.equal(scene.setLayers, undefined);
  const markup = renderToStaticMarkup(React.createElement(PerformanceStage, {scene}));
  assert.match(markup, /data-stage="scene-background"/);
  assert.match(markup, /fill="#f0d59b"/);
  assert.doesNotMatch(markup, /data-set-layer/);
  assert.equal(renderToStaticMarkup(React.createElement(PerformanceForegroundLayers, {scene})), "");
});
