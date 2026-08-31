/**
 * Heavy-stage mutex tests. Run: `node --import tsx --test tools/stage-lock/lock.test.ts`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquireStageLock, withStageLock, StageLockedError } from "./index";

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), "anim-lock-"));
}

test("second acquire while first is held throws StageLockedError", () => {
  const root = tmpRoot();
  try {
    const a = acquireStageLock(root, "imagegen");
    assert.throws(() => acquireStageLock(root, "render"), StageLockedError);
    a.release();
    // Once released, the other class can acquire.
    const b = acquireStageLock(root, "render");
    b.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("release is idempotent and removes the lock file", () => {
  const root = tmpRoot();
  try {
    const h = acquireStageLock(root, "render");
    assert.ok(existsSync(h.path));
    h.release();
    assert.ok(!existsSync(h.path));
    h.release(); // no throw
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("a stale lock (dead pid) is reclaimed", () => {
  const root = tmpRoot();
  try {
    // Forge a lock owned by a pid that cannot exist.
    mkdirSync(join(root, ".anim", "locks"), { recursive: true });
    const lockPath = join(root, ".anim", "locks", "heavy-gpu.lock");
    writeFileSync(
      lockPath,
      JSON.stringify({ pid: 2147483646, stage: "imagegen", startedAt: "x", host: "x" }),
    );
    const h = acquireStageLock(root, "render");
    const rec = JSON.parse(readFileSync(lockPath, "utf8")) as { pid: number };
    assert.equal(rec.pid, process.pid);
    h.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("withStageLock releases even when fn throws", async () => {
  const root = tmpRoot();
  try {
    await assert.rejects(
      withStageLock(root, "render", () => {
        throw new Error("boom");
      }),
      /boom/,
    );
    // Lock is free again.
    const h = acquireStageLock(root, "imagegen");
    h.release();
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
