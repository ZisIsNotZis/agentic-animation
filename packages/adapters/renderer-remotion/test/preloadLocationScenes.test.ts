import assert from "node:assert/strict";
import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import {preloadLocationScenes} from "../src/index";

// Synthetic fixture library only; library/ is never written by tests.
const SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540">`
  + `<g id="backdrop"><rect width="960" height="540" fill="#f0d59b"/></g>`
  + `<g id="counter-front"><rect x="120" y="400" width="720" height="60" fill="#70432f"/></g>`
  + `</svg>`;

function fixture(locations: Record<string, unknown>, sceneTrack: unknown[]): {root: string; manifest: (extra?: object) => object; manifestPath: string} {
  const root = mkdtempSync(join(tmpdir(), "anim-preload-"));
  mkdirSync(join(root, "library", "set", "canteen"), {recursive: true});
  mkdirSync(join(root, "episodes", "demo"), {recursive: true});
  writeFileSync(join(root, "library", "set", "canteen", "scene.svg"), SCENE);
  const manifestPath = join(root, "episodes", "demo", "performance.json");
  writeFileSync(manifestPath, "{}");
  return {
    root,
    manifestPath,
    manifest: (extra = {}) => ({
      assets: {locations},
      sceneTrack,
      ...extra,
    }),
  };
}

function cleanup(root: string): void {
  rmSync(root, {recursive: true, force: true});
}

test("world-declaring locations get per-layer group text keyed <instance>/<layerId>", () => {
  const f = fixture(
    {canteen: {resolved: {identity: "set/canteen"}}},
    [{location: "canteen", setLayers: [{id: "backdrop", foreground: false}, {id: "counter-front", foreground: true}]}],
  );
  try {
    const result = preloadLocationScenes(f.manifestPath, f.manifest() as never);
    assert.deepEqual(Object.keys(result.locationScenes).sort(), ["canteen/backdrop", "canteen/counter-front"]);
    assert.match(result.locationScenes!["canteen/backdrop"]!, /<g id="backdrop">/);
    assert.match(result.locationScenes!["canteen/counter-front"]!, /<g id="counter-front">/);
    // No whole-document key for a layered location.
    assert.equal(result.locationScenes!["canteen"], undefined);
  } finally {
    cleanup(f.root);
  }
});

test("legacy locations keep the whole-document blob keyed by instance", () => {
  const f = fixture(
    {canteen: {resolved: {identity: "set/canteen"}}},
    [{location: "canteen"}],
  );
  try {
    const result = preloadLocationScenes(f.manifestPath, f.manifest() as never);
    assert.deepEqual(Object.keys(result.locationScenes), ["canteen"]);
    assert.match(result.locationScenes!["canteen"]!, /^<svg /);
  } finally {
    cleanup(f.root);
  }
});

test("a declared layer without a painted group fails the render instead of falling back", () => {
  const f = fixture(
    {canteen: {resolved: {identity: "set/canteen"}}},
    [{location: "canteen", setLayers: [{id: "backdrop"}, {id: "ghost-layer"}]}],
  );
  try {
    assert.throws(
      () => preloadLocationScenes(f.manifestPath, f.manifest() as never),
      /canteen: declared layer "ghost-layer" has no <g id> group in set\/canteen\/scene\.svg/,
    );
  } finally {
    cleanup(f.root);
  }
});

test("a layered location without readable scene art fails the render", () => {
  const f = fixture(
    {empty: {resolved: {identity: "set/empty"}}},
    [{location: "empty", setLayers: [{id: "backdrop"}]}],
  );
  try {
    assert.throws(
      () => preloadLocationScenes(f.manifestPath, f.manifest() as never),
      /empty: world-declaring location has no scene\.svg/,
    );
  } finally {
    cleanup(f.root);
  }
});

test("legacy locations without scene art keep the current no-op behavior", () => {
  const f = fixture(
    {empty: {resolved: {identity: "set/empty"}}},
    [{location: "empty"}],
  );
  try {
    const result = preloadLocationScenes(f.manifestPath, f.manifest() as never);
    assert.equal(result.locationScenes, undefined);
  } finally {
    cleanup(f.root);
  }
});
