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
    aqiang: {use: "figure.aqiang.v1", voice: "voice.zh.aqiang.v1"},
    awei: {use: "figure.awei.v1", voice: "voice.zh.awei.v1"},
  },
  objects: {
    desk: "prop.desk.v1",
    coffee: "prop.thermos.v1",
  },
  dressing: {
    screen: "dressing.computer_screen.v1",
    keyboard: "dressing.keyboard.v1",
  },
};

test("loads the library registry and resolves immutable asset ids", async () => {
  const registry = await loadAssetRegistry(libraryRoot);

  assert.equal(registry.resolveAsset("figure.aqiang.v1").kind, "figure");
  assert.equal(registry.resolveAsset("voice.zh.aqiang.v1").kind, "voice");
  assert.equal(registry.resolveAsset("set.agent_stage.v1").kind, "set");
  assert.equal(registry.resolveAsset("prop.thermos.v1").kind, "prop");

  assert.throws(
    () => registry.resolveAsset("figure.aqiang"),
    /immutable asset id/i,
  );
  assert.throws(() => registry.resolveAsset("figure.missing.v1"), /unknown asset/i);
});

test("registers every asset identifier used by the AI work adventure", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  assert.equal(registry.manifest.assets.length, 23);
  for (const {id} of registry.manifest.assets) assert.equal(registry.resolveAsset(id).id, id);
});

test("resolves every procedure referenced by the AI work adventure", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  const episode = parse(await readFile(join(process.cwd(), "episodes/ai-work-adventure/episode.yml"), "utf8"));
  const procedures = new Set<string>();
  const visit = (value: unknown): void => {
    if (typeof value === "string") {
      for (const match of value.matchAll(/([a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+)\([^)]*\)/g)) {
        procedures.add(match[1]!);
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
    assert.ok(manifest.implementationKey.length > 0);
    assert.ok(manifest.hash.startsWith("sha256:"));
  }
});

test("derives asset identity from canonical paths", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  for (const asset of registry.manifest.assets) {
    assert.equal(asset.id, asset.path.replaceAll("/", "."));
    assert.equal(asset.kind, asset.path.split("/")[0]);
    assert.equal(asset.version, Number(asset.path.split("/").at(-1)!.slice(1)));
  }
});

test("validates subject and typed actor, object, and dressing locals", async () => {
  const registry = await loadAssetRegistry(libraryRoot);

  const result = registry.validateProcedureCall(
    { subject: "aqiang", id: "prop.pickup", args: ["coffee"] },
    locals,
  );
  assert.equal(result.procedure.id, "act.pickup");
  assert.equal(result.args[0]!.assetId, "prop.thermos.v1");

  assert.throws(
    () => registry.validateProcedureCall({ subject: "aqiang", id: "prop.pickup", args: ["screen"] }, locals),
    /expects object/i,
  );
  assert.throws(
    () => registry.validateProcedureCall({ subject: "aqiang", id: "gesture.point", args: ["unknown"] }, locals),
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
