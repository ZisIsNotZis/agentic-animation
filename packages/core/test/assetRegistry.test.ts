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
    aqiang: {use: "figure.office.aqiang.v1", voice: "voice.zh.aqiang.v1"},
    awei: {use: "figure.office.awei.v1", voice: "voice.zh.awei.v1"},
  },
  objects: {
    desk: "prop.office.desk.v1",
    coffee: "prop.office.thermos.v1",
  },
  dressing: {
    screen: "dressing.office.computer-screen.v1",
    keyboard: "dressing.office.keyboard.v1",
  },
};

test("loads the library registry and resolves immutable asset ids", async () => {
  const registry = await loadAssetRegistry(libraryRoot);

  assert.equal(registry.resolveAsset("figure.office.aqiang.v1").kind, "figure");
  assert.equal(registry.resolveAsset("voice.zh.aqiang.v1").kind, "voice");
  assert.equal(registry.resolveAsset("set.office.agent-stage.v1").kind, "set");
  assert.equal(registry.resolveAsset("prop.office.thermos.v1").kind, "prop");

  assert.throws(
    () => registry.resolveAsset("figure.office.aqiang"),
    /immutable asset id/i,
  );
  assert.throws(() => registry.resolveAsset("figure.office.missing.v1"), /unknown asset/i);
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

test("requires manifest version fields and rejects mismatched asset versions", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  const raw = structuredClone(registry.manifest) as any;
  raw.assets[0].version = 2;
  assert.throws(() => createRegistryForTest(raw), /version must match/i);
});

test("validates subject and typed actor, object, and dressing locals", async () => {
  const registry = await loadAssetRegistry(libraryRoot);

  const result = registry.validateProcedureCall(
    { subject: "aqiang", id: "prop.pickup", args: ["coffee"] },
    locals,
  );
  assert.equal(result.procedure.id, "act.pickup");
  assert.equal(result.args[0]!.assetId, "prop.office.thermos.v1");

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

function createRegistryForTest(value: unknown) {
  return RegistryAssetManifestSchema.parse((value as any).assets[0]);
}
