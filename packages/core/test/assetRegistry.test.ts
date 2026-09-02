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

test("resolves every procedure referenced by the AI work adventure", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  const episode = parse(await readFile(join(process.cwd(), "episodes/ai-work-adventure/episode.yml"), "utf8"));
  const procedures = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      for (const match of value.matchAll(/[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\([^)]*\)/g)) {
        const segments = match[0]!.replace(/\(.*\)$/, "").split(".");
        const categories = new Set(["action", "emotion", "gaze", "movement", "voice", "prop", "camera", "effect", "sound", "music"]);
        if (segments.length === 3 && categories.has(segments[1]!)) procedures.add(`${segments[1]}.${segments[2]}`);
        else if (segments.length === 2 && categories.has(segments[0]!)) procedures.add(segments.join("."));
      }
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(visit);
    }
  };
  visit(episode);

  assert.ok(procedures.size >= 65);
  for (const id of procedures) {
    const manifest = registry.resolveProcedure(id);
    assert.equal(registry.resolveProcedure(manifest.id), manifest);
    assert.equal(manifest.kind, "procedure");
    assert.equal(manifest.arity, manifest.params.length);
    assert.equal(manifest.id, id);
  }
});

test("derives asset identity from canonical paths", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  for (const asset of registry.manifest.assets) {
    assert.equal(asset.identity.split("/")[0], asset.kind);
    assert.ok(!("id" in asset) && !("path" in asset) && !("version" in asset) && !("implementationKey" in asset));
  }
});

test("validates subject and typed actor, object, and dressing locals", async () => {
  const registry = await loadAssetRegistry(libraryRoot);

  const result = registry.validateProcedureCall(
    { subject: "aqiang", id: "prop.pickup", args: ["coffee"] },
    locals,
  );
  assert.equal(result.procedure.id, "prop.pickup");
  assert.equal(result.args[0]!.assetId, "prop/thermos");

  assert.throws(
    () => registry.validateProcedureCall({ subject: "aqiang", id: "prop.pickup", args: ["screen"] }, locals),
    /expects object/i,
  );
  assert.throws(
    () => registry.validateProcedureCall({ subject: "aqiang", id: "action.point", args: ["unknown"] }, locals),
    /unknown local reference/i,
  );
  assert.throws(
    () => registry.validateProcedureCall({ subject: "aqiang", id: "prop.putdown", args: ["coffee"] }, locals),
    /arity/i,
  );
  assert.throws(
    () => registry.validateProcedureCall({ subject: "aqiang", id: "camera.punch_in", args: ["aqiang"] }, locals),
    /subject/i,
  );
});
