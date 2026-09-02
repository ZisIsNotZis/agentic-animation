import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "yaml";
import { readFile } from "node:fs/promises";
import {
  loadAssetRegistry,
  type RegistryLocals,
} from "../src/assets/registry";
import { RegistryAssetManifestSchema } from "../src/schemas/libraryMeta";
import { loadPlugins } from "../src/plugins";
import { splitExpressions } from "../src/invocation/runner";

const libraryRoot = join(process.cwd(), "library");

const locals: RegistryLocals = {
  actors: {
    aqiang: {use: "figure/aqiang", voice: "voice/zh/aqiang"},
    awei: {use: "figure/awei", voice: "voice/zh/awei"},
  },
  objects: {
    desk: "prop/desk",
    coffee: "prop/thermos",
  },
  dressing: {
    screen: "dressing/computer_screen",
    keyboard: "dressing/keyboard",
  },
};

test("loads the library registry and resolves immutable asset ids", async () => {
  const registry = await loadAssetRegistry(libraryRoot);

  assert.equal(registry.resolveAsset("figure/aqiang").kind, "figure");
  assert.equal(registry.resolveAsset("voice/zh/aqiang").kind, "voice");
  assert.equal(registry.resolveAsset("set/agent_stage").kind, "set");
  assert.equal(registry.resolveAsset("prop/thermos").kind, "prop");

  assert.throws(
    () => registry.resolveAsset("figure.aqiang"),
    /canonical asset path/i,
  );
  assert.throws(() => registry.resolveAsset("figure/missing"), /unknown asset/i);
});

test("registers every asset identifier used by the AI work adventure", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  assert.equal(registry.manifest.assets.length, 43);
  for (const asset of registry.manifest.assets) assert.equal(registry.resolveAsset(asset.identity), asset);
});

test("evaluates every brace expression used by the AI work adventure against plugin namespaces", async () => {
  const plugins = await loadPlugins(libraryRoot);
  const episode = parse(await readFile(join(process.cwd(), "episodes/ai-work-adventure/episode.yml"), "utf8"));
  const expressions = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      for (const token of (value.match(/\{([^{}]*)\}/g) ?? [])) {
        try {
          for (const expression of splitExpressions(token.slice(1, -1))) expressions.add(expression);
        } catch { /* non-call group */ }

      }
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(episode);
  assert.ok(expressions.size >= 40);
  const actors = new Set(Object.keys(episode.actors));
  const objects = new Set(Object.keys(episode.objects));
  for (const expression of expressions) {
    const callee = expression.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/)![1]!;
    const [category, terminal] = callee.split(".") as [string, string];
    const plugin = plugins.find((candidate) => candidate.category === category);
    assert.ok(plugin, `${expression}: unknown plugin category`);
    const scope: Record<string, unknown> = {audience: "audience"};
    for (const name of [...actors, ...objects]) scope[name] = {id: name};
    scope[category] = plugin.namespace;
    let factory: unknown;
    try {
      factory = new Function(...Object.keys(scope), `return (${expression});`)(...Object.values(scope));
    } catch (error) {
      throw new Error(`${expression}: ${(error as Error).message}`);
    }
    assert.equal(typeof (factory as {run?: unknown})?.run, "function", `${expression}: did not return an invocation descriptor`);
  }
});

test("derives asset identity from canonical paths", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  for (const asset of registry.manifest.assets) {
    assert.equal(asset.identity.split("/")[0], asset.kind);
    assert.ok(!("id" in asset) && !("path" in asset) && !("version" in asset) && !("implementationKey" in asset));
  }
});
