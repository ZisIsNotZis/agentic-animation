import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {loadAssetRegistry} from "../src/assets/registry";
import {
  SUPPORT_AGREEMENT_TOLERANCE,
  normalizeSetWorld,
  svgGroupElement,
  svgGroupIds,
} from "../src/assets/setWorld";
import {SET_LAYER_BLENDS} from "../src/schemas/libraryMeta";

// Synthetic fixture sets only; library/ is never written by tests.
function worldScene(counterTop = 390): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">`
    + `<g id="backdrop"><rect width="960" height="540" fill="#f0d59b"/></g>`
    + `<g id="counter"><rect x="120" y="${counterTop}" width="720" height="80" fill="#873f32"/></g>`
    + `<rect id="counter-top-rect" x="120" y="${counterTop}" width="720" height="10" fill="#a45f3e" data-support-top="${counterTop}"/>`
    + `<g id="counter-front"><rect x="120" y="${counterTop + 10}" width="720" height="70" fill="#70432f"/></g>`
    + `</svg>`;
}

function worldManifest(y = 390): string {
  return JSON.stringify({
    coordinateSpace: "960x540",
    layers: ["backdrop", "counter", {id: "counter-front", foreground: true}],
    safeActorArea: {x: 96, y: 90, width: 768, height: 360},
    supports: [{name: "counter", x: [120, 840], y, paint: "counter-top-rect"}],
  });
}

/** World manifest whose layers declare compositing (M4 declaration). */
function compositedManifest(): string {
  return JSON.stringify({
    coordinateSpace: "960x540",
    layers: [
      "backdrop",
      {id: "pigment", blend: "multiply", opacity: 0.5},
      {id: "key-light", foreground: true, blend: "screen"},
      {id: "counter-front", foreground: true},
    ],
  });
}

function compositedScene(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">`
    + `<g id="backdrop"><rect width="960" height="540" fill="#f0d59b"/></g>`
    + `<g id="pigment"><rect width="960" height="540" fill="#8a6a4a"/></g>`
    + `<g id="key-light"><rect width="960" height="540" fill="#f7e8c3"/></g>`
    + `<g id="counter-front"><rect y="400" width="960" height="140" fill="#70432f"/></g>`
    + `</svg>`;
}

/** A minimal synthetic library with one set; resolves like library/ does. */
async function registryWith(manifest: string, sceneSvg: string) {
  const root = mkdtempSync(join(tmpdir(), "anim-setworld-"));
  try {
    mkdirSync(join(root, "set"), {recursive: true});
    mkdirSync(join(root, "set", "fixture"));
    writeFileSync(join(root, "set", "fixture", "manifest.json"), manifest);
    writeFileSync(join(root, "set", "fixture", "scene.svg"), sceneSvg);
    return await loadAssetRegistry(root);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
}

async function registryWithMissingManifest(sceneSvg: string) {
  const root = mkdtempSync(join(tmpdir(), "anim-setworld-"));
  try {
    mkdirSync(join(root, "set"), {recursive: true});
    mkdirSync(join(root, "set", "fixture"));
    writeFileSync(join(root, "set", "fixture", "scene.svg"), sceneSvg);
    return await loadAssetRegistry(root);
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
}

test("declared layer compositing is carried, defaulted to normal/1, and validated", async () => {
  const world = normalizeSetWorld({manifest: JSON.parse(compositedManifest()), sceneSvg: compositedScene()});
  assert.deepEqual(world.layers, [
    {id: "backdrop", foreground: false},
    {id: "pigment", foreground: false, blend: "multiply", opacity: 0.5},
    {id: "key-light", foreground: true, blend: "screen"},
    {id: "counter-front", foreground: true},
  ]);
  const registry = await registryWith(compositedManifest(), compositedScene());
  const asset = registry.resolveAsset("set/fixture") as {world?: {layers: unknown[]}};
  assert.deepEqual(asset.world!.layers, world.layers);
  // Invalid declarations fail loading rather than silently rendering normal.
  await assert.rejects(
    registryWith(compositedManifest().replace("\"multiply\"", "\"overlay\""), compositedScene()),
    /blend|overlay|Invalid/i,
  );
  await assert.rejects(
    registryWith(compositedManifest().replace("0.5", "1.5"), compositedScene()),
    /opacity|less than or equal/i,
  );
});

test("every declared blend mode is carried through normalization, M3 modes unchanged", () => {
  for (const blend of SET_LAYER_BLENDS) {
    const manifest = {
      coordinateSpace: "960x540",
      layers: ["backdrop", {id: "pigment", blend}],
    };
    const world = normalizeSetWorld({manifest, sceneSvg: compositedScene()});
    assert.deepEqual(world.layers[1], blend === "normal"
      ? {id: "pigment", foreground: false}
      : {id: "pigment", foreground: false, blend}, `blend ${blend} must reach the normalized layer`);
  }
  // The M4 seam only widened additively: the pre-M4 modes are still exactly these.
  assert.deepEqual(SET_LAYER_BLENDS.slice(0, 3), ["normal", "multiply", "screen"]);
  assert.deepEqual(SET_LAYER_BLENDS.slice(3), ["hue", "saturation", "color", "luminosity", "soft-light"]);
});

test("normalizes world declarations once from coordinateSpace units", () => {
  const world = normalizeSetWorld({manifest: JSON.parse(worldManifest()), sceneSvg: worldScene()});
  assert.deepEqual(world.coordinateSpace, {width: 960, height: 540});
  assert.deepEqual(world.layers, [
    {id: "backdrop", foreground: false},
    {id: "counter", foreground: false},
    {id: "counter-front", foreground: true},
  ]);
  assert.deepEqual(world.safeArea, {x: 0.1, y: 90 / 540, width: 0.8, height: 360 / 540});
  assert.deepEqual(world.supports, [{name: "counter", x: [0.125, 840 / 960], y: 390 / 540}]);
});

test("registry attaches the normalized world to world-declaring sets", async () => {
  const registry = await registryWith(worldManifest(), worldScene());
  const asset = registry.resolveAsset("set/fixture");
  assert.equal(asset.kind, "set");
  assert.deepEqual((asset as {world?: unknown}).world, normalizeSetWorld({manifest: JSON.parse(worldManifest()), sceneSvg: worldScene()}));
});

test("legacy sets without id groups keep the flat path and raw supports", async () => {
  const scene = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080"/></svg>`;
  const manifest = JSON.stringify({
    coordinateSpace: "1920x1080",
    layers: ["backdrop"],
    safeActorArea: {x: 220, y: 180, width: 1480, height: 720},
    supports: [{name: "counter", x: [230, 1690], y: 450}],
  });
  const registry = await registryWith(manifest, scene);
  const asset = registry.resolveAsset("set/fixture") as {world?: unknown; supports?: unknown};
  assert.equal(asset.world, undefined);
  // Raw art-unit passthrough, exactly as before M3.
  assert.deepEqual(asset.supports, [{name: "counter", x: [230, 1690], y: 450}]);
  assert.deepEqual(svgGroupIds(scene), []);
});

test("world-declaring sets with missing or invalid declarations fail loading", async () => {
  const painted = worldScene();
  // SVG carries groups but the manifest declares nothing.
  await assert.rejects(registryWith(JSON.stringify({}), painted), /set set\/fixture: layers are required/);
  // Painted groups make a set world-declaring even with no manifest at all:
  // the declarations are missing, so loading fails instead of falling back
  // to the legacy path.
  await assert.rejects(registryWithMissingManifest(painted), /set set\/fixture: layers are required/);
  // Declared layer id has no painted group.
  const ghost = worldManifest().replace("\"backdrop\"", "\"backdrop2\"");
  await assert.rejects(registryWith(ghost, painted), /declared layer "backdrop2" has no/);
  // viewBox disagrees with coordinateSpace.
  const mismatched = worldManifest().replace("960x540", "1920x1080");
  await assert.rejects(registryWith(mismatched, painted), /disagrees with scene\.svg viewBox/);
});

test("support agreement: declared surface must equal the painted surface", async () => {
  // Within the fixed tolerance the declaration loads.
  const withinTolerance = await registryWith(worldManifest(390 + SUPPORT_AGREEMENT_TOLERANCE), worldScene(390));
  assert.equal((withinTolerance.resolveAsset("set/fixture") as {world?: {supports: unknown[]}}).world!.supports.length, 1);
  // Beyond it, loading fails (the M0 y450-vs-painted-y390 defect class).
  await assert.rejects(
    registryWith(worldManifest(450), worldScene(390)),
    /support "counter" declared at y 450 but painted at 390/,
  );
  // A paint reference without data-support-top is undecidable and fails.
  const stripped = worldScene().replace(/ data-support-top="390"/, "");
  await assert.rejects(registryWith(worldManifest(), stripped), /without data-support-top/);
});

test("svgGroupElement extracts balanced nested layer groups", () => {
  const nested = `<svg viewBox="0 0 960 540"><g id="outer"><rect/><g id="inner"><rect/></g></g><g id="sibling"/></svg>`;
  assert.equal(svgGroupElement(nested, "outer"), `<g id="outer"><rect/><g id="inner"><rect/></g></g>`);
  assert.equal(svgGroupElement(nested, "inner"), `<g id="inner"><rect/></g>`);
  assert.equal(svgGroupElement(nested, "missing"), undefined);
});
