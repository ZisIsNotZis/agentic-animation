import {mkdtemp, mkdir, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {checkpointWorld, loadPlugins, orderPlugins, type LoadedPlugin} from "../src/plugins";

const run = "export default { slam(world, subject, target) { return {}; } };";

test("loadPlugins discovers a new category plugin without editing engine source", async () => {
  const root = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(root, "danmaku"));
  await writeFile(join(root, "danmaku", "plugin.js"), "export default {fire(world, channel) { return {}; }};");
  await writeFile(join(root, "danmaku", "manifest.json"), JSON.stringify({priority: 5}));
  const plugins = await loadPlugins(root);
  assert.deepEqual(plugins.map((p) => p.category), ["danmaku"]);
  assert.equal((plugins[0]!.manifest as {priority?: number}).priority, 5);
  assert.equal(typeof ((plugins[0]!.namespace ?? {}) as {fire?: unknown}).fire, "function"); // namespace member
});

test("loadPlugins rejects corrupted or unknown-key category manifests", async () => {
  const root = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(root, "broken"));
  await writeFile(join(root, "broken", "plugin.js"), run);
  const corrupted = Object.fromEntries([...JSON.stringify({priority: 5})].map((ch, i) => [String(i), ch]));
  await writeFile(join(root, "broken", "manifest.json"), JSON.stringify(corrupted));
  await assert.rejects(loadPlugins(root), /broken\/manifest\.json is not a valid plugin manifest/);

  await writeFile(join(root, "broken", "manifest.json"), JSON.stringify({priority: 1, wat: true}));
  await assert.rejects(loadPlugins(root), /not a valid plugin manifest/);
});

test("loadPlugins rejects a plugin without a namespace default export", async () => {
  const root = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(root, "broken"));
  await writeFile(join(root, "broken", "plugin.js"), "export default 42;");
  await assert.rejects(loadPlugins(root), /must default-export a namespace object/);
});

test("orders plugins deterministically by before/after, then priority, then name; cycles are errors", () => {
  const mk = (category: string, manifest: LoadedPlugin["manifest"]): LoadedPlugin => ({category, manifest, namespace: {}});
  const ordered = orderPlugins([
    mk("zeta", {priority: 0}),
    mk("alpha", {priority: 0, before: "zeta"}),
    mk("beta", {priority: -1, after: "alpha"}),
  ]);
  assert.deepEqual(ordered.map((p) => p.category), ["alpha", "beta", "zeta"]);
  assert.throws(() => orderPlugins([
    mk("a", {before: "b"}),
    mk("b", {before: "a"}),
  ]), /cycle/);
  assert.throws(() => orderPlugins([mk("a", {before: "missing"})]), /unknown category/);
});

test("manifest-declared priority reorders plugin discovery", async () => {
  const root = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(root, "alpha"));
  await mkdir(join(root, "omega"));
  await writeFile(join(root, "alpha", "plugin.js"), run);
  await writeFile(join(root, "alpha", "manifest.json"), JSON.stringify({priority: 100}));
  await writeFile(join(root, "omega", "plugin.js"), run);
  await writeFile(join(root, "omega", "manifest.json"), JSON.stringify({priority: -100}));
  const plugins = await loadPlugins(root);
  assert.deepEqual(plugins.map((p) => p.category), ["omega", "alpha"]);
});

test("checkpoints deep-clone the world", () => {
  const original = {canvas: {}, plugins: {state: {hits: 1}}};
  const snapshot = checkpointWorld(original);
  (original.plugins.state as {hits: number}).hits = 99;
  assert.equal((snapshot as {plugins: {state: {hits: number}}}).plugins.state.hits, 1);
});
