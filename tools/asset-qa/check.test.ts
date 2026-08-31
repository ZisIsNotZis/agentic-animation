import { test } from "node:test";
import assert from "node:assert/strict";
import { assets, hashDirectory } from "./materialize";
import { episodeIds } from "./check";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd(), "library");

test("AI work adventure declares exactly 23 materialized immutable assets", () => {
  assert.equal(assets.length, 23);
  assert.equal(new Set(episodeIds()).size, 23);
  for (const asset of assets) assert.ok(existsSync(join(root, asset.path)), asset.id);
});

test("asset directory hashes are stable and include real material", () => {
  const aqiang = assets.find((asset) => asset.id === "figure.office.aqiang.v1")!;
  const dir = join(root, aqiang.path);
  const first = hashDirectory(dir);
  const second = hashDirectory(dir);
  assert.match(first, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first, second);
  assert.ok(existsSync(join(dir, "parts", "head.png")));
  assert.ok(existsSync(join(dir, "sockets.json")));
});
