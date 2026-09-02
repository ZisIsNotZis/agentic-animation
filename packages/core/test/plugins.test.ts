import {mkdtemp, mkdir, writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {
  checkpointWorld,
  invokeMember,
  loadPlugins,
  orderPlugins,
  resolveInvocationPhase,
  runFrame,
  type FrameContext,
  type Invocation,
  type LoadedPlugin,
  type RuntimeWorld,
} from "../src/plugins";

const ctx: FrameContext = {frame: 10, fps: 24, seconds: 10 / 24, seed: 7};

function world(extra: Record<string, import("../src/plugins").JsonValue> = {}): RuntimeWorld {
  return {canvas: {aspect: 16 / 9, nodes: []}, plugins: {...extra}};
}

function invocation(overrides: Partial<Invocation> = {}): Invocation {
  return {id: "action.slam.0", category: "action", asset: "slam", phase: "tick", durationFrames: 10, localFrame: 3, args: null, ...overrides};
}

function plugin(category: string, run: LoadedPlugin["definition"]["run"], manifest: LoadedPlugin["manifest"] = {}): LoadedPlugin {
  return {category, manifest, definition: {run}};
}

test("loadPlugins discovers a new category plugin without editing engine source", async () => {
  const root = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(root, "danmaku"));
  await writeFile(join(root, "danmaku", "plugin.js"), "export default {run(world) { return world; }};");
  await writeFile(join(root, "danmaku", "manifest.json"), JSON.stringify({priority: 5}));
  const plugins = await loadPlugins(root);
  assert.deepEqual(plugins.map((p) => p.category), ["danmaku"]);
  assert.equal(plugins[0]!.manifest.priority, 5);
});

test("loadPlugins rejects corrupted or unknown-key category manifests", async () => {
  const root = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(root, "broken"));
  await writeFile(join(root, "broken", "plugin.js"), "export default {run(world) { return world; }};");
  // The string-spread corruption class: valid JSON, digit-keyed characters.
  const corrupted = Object.fromEntries([...JSON.stringify({priority: 5})].map((ch, i) => [String(i), ch]));
  await writeFile(join(root, "broken", "manifest.json"), JSON.stringify(corrupted));
  await assert.rejects(loadPlugins(root), /broken\/manifest\.json is not a valid plugin manifest/);

  await writeFile(join(root, "broken", "manifest.json"), JSON.stringify({priority: 1, wat: true}));
  await assert.rejects(loadPlugins(root), /not a valid plugin manifest/);
});

test("manifest-declared priority reorders plugin discovery", async () => {
  const root = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(root, "alpha"));
  await mkdir(join(root, "omega"));
  await writeFile(join(root, "alpha", "plugin.js"), "export default {run(world) { return world; }};");
  await writeFile(join(root, "alpha", "manifest.json"), JSON.stringify({priority: 100}));
  await writeFile(join(root, "omega", "plugin.js"), "export default {run(world) { return world; }};");
  await writeFile(join(root, "omega", "manifest.json"), JSON.stringify({priority: -100}));
  const plugins = await loadPlugins(root);
  assert.deepEqual(plugins.map((p) => p.category), ["omega", "alpha"]);
});

test("loadPlugins rejects a plugin without run and callable members without dispatch opt-in", async () => {
  const noRun = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(noRun, "broken"));
  await writeFile(join(noRun, "broken", "plugin.js"), "export default {};");
  await assert.rejects(loadPlugins(noRun), /must export a default plugin with run/);

  const noDispatch = await mkdtemp(join(tmpdir(), "anim-plugin-"));
  await mkdir(join(noDispatch, "nondispatch"));
  await writeFile(join(noDispatch, "nondispatch", "plugin.js"), "export default {run(w) { return w; }, members: {fn() { return 1; }}};");
  await assert.rejects(loadPlugins(noDispatch), /without dispatch: true/);
});

test("orders plugins deterministically by before/after, then priority, then name; cycles are errors", () => {
  const ordered = orderPlugins([
    plugin("zeta", (w) => w, {priority: 0}),
    plugin("alpha", (w) => w, {priority: 0, before: "zeta"}),
    plugin("beta", (w) => w, {priority: -1, after: "alpha"}),
  ]);
  assert.deepEqual(ordered.map((p) => p.category), ["alpha", "beta", "zeta"]);
  assert.throws(() => orderPlugins([
    plugin("a", (w) => w, {before: "b"}),
    plugin("b", (w) => w, {before: "a"}),
  ]), /cycle/);
  assert.throws(() => orderPlugins([plugin("a", (w) => w, {before: "missing"})]), /unknown category/);
});

test("plugins receive and return the complete world; in-place and replacement both chain", () => {
  const inPlace = plugin("mutator", (world, invocation) => {
    world.plugins.trace = [...(world.plugins.trace as string[] ?? []), `mutator:${invocation.phase}`];
    return world;
  });
  const replacement = plugin("replacer", (world) => ({...world, plugins: {...world.plugins, replaced: true}}), {after: "mutator"});
  const result = runFrame(world(), [inPlace, replacement], [invocation({category: "mutator", id: "mutator.none.0", asset: "none"}), invocation({category: "replacer", id: "replacer.none.0", asset: "none"})], ctx);
  assert.deepEqual(result.plugins, {trace: ["mutator:tick"], replaced: true});
});

test("multiple plugins chain in declared order and later plugins see earlier output", () => {
  const first = plugin("action", (world, invocation) => {
    world.plugins.action = `${invocation.id}@${invocation.phase}`;
    return world;
  });
  const second = plugin("camera", (world) => {
    world.plugins.camera = `saw:${world.plugins.action}`;
    return world;
  }, {after: "action"});
  const result = runFrame(world(), [first, second], [invocation({phase: "start", localFrame: 0}), invocation({category: "camera", id: "camera.none.0", asset: "none"})], ctx);
  assert.equal(result.plugins.camera, "saw:action.slam.0@start");
});

test("invocations dispatch in deterministic order within a category", () => {
  const seen: string[] = [];
  const p = plugin("action", (world, inv) => {
    seen.push(inv.id);
    return world;
  });
  runFrame(world(), [p], [invocation({id: "action.b.1"}), invocation({id: "action.a.0"})], ctx);
  assert.deepEqual(seen, ["action.b.1", "action.a.0"]);
});

test("long-running start/tick/stop effects persist state across frames", () => {
  const effect = plugin("effect", (world, inv) => {
    const state = (world.plugins.effect as {count: number} | undefined) ?? {count: 0};
    state.count += inv.phase === "tick" ? 1 : 10;
    world.plugins.effect = state;
    return world;
  });
  const current = runFrame(world(), [effect], [invocation({id: "effect.glow.0", category: "effect", asset: "glow", phase: "start", localFrame: 0, durationFrames: 5})], ctx);
  assert.equal((current.plugins.effect as {count: number}).count, 10);
  const mid = runFrame(current, [effect], [invocation({id: "effect.glow.0", category: "effect", asset: "glow", phase: "tick", localFrame: 2, durationFrames: 5})], ctx);
  const end = runFrame(mid, [effect], [invocation({id: "effect.glow.0", category: "effect", asset: "glow", phase: "stop", localFrame: 4, durationFrames: 5})], ctx);
  assert.equal((end.plugins.effect as {count: number}).count, 21);
});

test("direct frame evaluation is deterministic across repeated runs", () => {
  const seeded = plugin("action", (world, inv) => {
    const ctxSeed = (inv.args as {seed: number}).seed;
    world.plugins.action = (inv.localFrame * ctxSeed) % 97;
    return world;
  });
  const evaluate = () => {
    let current = world();
    for (let frame = 0; frame < 6; frame++) {
      current = runFrame(current, [seeded], [invocation({phase: "tick", localFrame: frame, args: {seed: 7}})], {...ctx, frame});
    }
    return current.plugins.action;
  };
  assert.equal(evaluate(), evaluate());
});

test("plugin state coexists with canvas state and plugin-above-plugin reads are sanctioned", () => {
  const layout = plugin("layout", (world) => {
    world.canvas = {...world.canvas, nodes: [...world.canvas.nodes, {id: "hero", kind: "figure", asset: "figure/lin", at: [0.5, 0.5], size: [0.2, 0.6]}]};
    return world;
  }, {priority: -1});
  const camera = plugin("camera", (world) => {
    const hero = world.canvas.nodes.find((node) => node.id === "hero");
    world.plugins.camera = {center: hero ? hero.at : null};
    return world;
  }, {after: "layout"});
  const result = runFrame(world(), [layout, camera], [invocation({category: "layout", id: "layout.none.0", asset: "none"}), invocation({category: "camera", id: "camera.none.0", asset: "none"})], ctx);
  assert.deepEqual(result.plugins.camera, {center: [0.5, 0.5]});
  assert.equal(result.canvas.nodes.length, 1);
});

test("invalid returns and missing plugins fail with named origins", () => {
  const bad = plugin("bad", () => ({nope: true}) as unknown as RuntimeWorld);
  assert.throws(() => runFrame(world(), [bad], [invocation({category: "bad", id: "bad.none.0", asset: "none"})], ctx), /plugin bad .* invalid world/);
  assert.throws(() => runFrame(world(), [plugin("ok", (w) => w)], [invocation({category: "ghost"})], ctx), /missing plugins: ghost/);
});

test("thrown plugin errors propagate with plugin, invocation, and frame named", () => {
  const throwing = plugin("volatile", () => {
    throw new Error("category-specific failure");
  });
  assert.throws(() => runFrame(world(), [throwing], [invocation({category: "volatile", id: "volatile.none.0", asset: "none"})], ctx), /plugin volatile failed on invocation volatile\.none\.0 at frame 10: category-specific failure/);
});

test("static members resolve without dispatch; callables require the opt-in", () => {
  const p: LoadedPlugin = {category: "danmaku", manifest: {}, definition: {run: (w) => w, members: {speed: 3, spawn: () => "spawned"}}};
  assert.equal(invokeMember(p, world(), "speed"), 3);
  assert.throws(() => invokeMember(p, world(), "spawn"), /dispatch is not opted in/);
  const dispatching: LoadedPlugin = {category: "danmaku", manifest: {}, definition: {run: (w) => w, dispatch: true, members: {spawn: () => "spawned"}}};
  assert.equal(invokeMember(dispatching, world(), "spawn"), "spawned");
  assert.throws(() => invokeMember(p, world(), "absent"), /no member: absent/);
});

test("checkpoints deep-clone the world for deterministic replay", () => {
  const original = world({state: {hits: 1}});
  const snapshot = checkpointWorld(original);
  (original.plugins.state as {hits: number}).hits = 99;
  assert.equal((snapshot.plugins.state as {hits: number}).hits, 1);
});

test("resolveInvocationPhase maps local frames to the generic lifecycle", () => {
  const base = {id: "e", category: "effect", asset: "glow", args: null};
  assert.equal(resolveInvocationPhase({...base, durationFrames: 5, localFrame: 0}), "start");
  assert.equal(resolveInvocationPhase({...base, durationFrames: 5, localFrame: 2}), "tick");
  assert.equal(resolveInvocationPhase({...base, durationFrames: 5, localFrame: 4}), "stop");
  assert.equal(resolveInvocationPhase({...base, durationFrames: null, localFrame: 40}), "tick");
});
