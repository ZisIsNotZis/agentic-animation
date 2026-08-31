/**
 * Heavy-stage mutex (ARCHITECTURE §11, workstream E).
 *
 * On a 24 GB machine, image gen (ComfyUI, ~18 GB) and render (Remotion, ~6 GB)
 * must never run concurrently. This is a cross-process file lock keyed by a
 * stage *class*: both `imagegen` and `render` map to the single `heavy-gpu`
 * class, so acquiring the lock for either one blocks the other.
 *
 * The lock is a file created with O_EXCL (atomic "create if absent"). It records
 * the holder's pid, stage, and start time. If a lock file exists but its holder
 * process is dead (crash without release), it is treated as stale and reclaimed.
 *
 * Not render-path / not manifest-generating code: using Date.now() for the
 * human-readable lock metadata is fine (the determinism rule scopes to render
 * output and manifests). Nothing here feeds a manifest.
 */
import { mkdirSync, openSync, closeSync, writeSync, readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Stage classes that contend for the same memory budget. */
export type StageClass = "imagegen" | "render";

const LOCK_CLASS = "heavy-gpu";
const LOCK_DIR = join(".anim", "locks");
const LOCK_FILE = `${LOCK_CLASS}.lock`;

interface LockRecord {
  pid: number;
  stage: StageClass;
  startedAt: string;
  host: string;
}

export interface LockHandle {
  /** Absolute path to the lock file. */
  path: string;
  /** Release the lock. Idempotent; safe to call in a finally block. */
  release(): void;
}

export class StageLockedError extends Error {
  constructor(
    readonly requested: StageClass,
    readonly holder: LockRecord,
    readonly lockPath: string,
  ) {
    super(
      `cannot start "${requested}": the heavy-stage lock is held by "${holder.stage}" ` +
        `(pid ${holder.pid}, since ${holder.startedAt}).\n` +
        `Image gen and render never run concurrently on 24 GB (ARCHITECTURE §11).\n` +
        `Wait for it to finish, or if that process is dead remove the stale lock: rm ${lockPath}`,
    );
    this.name = "StageLockedError";
  }
}

function lockPathFor(rootDir: string): string {
  return join(rootDir, LOCK_DIR, LOCK_FILE);
}

function isAlive(pid: number): boolean {
  if (pid === process.pid) return true;
  try {
    // Signal 0 probes existence without delivering a signal.
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH → no such process (dead). EPERM → alive but not ours (still alive).
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

function readLock(path: string): LockRecord | undefined {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as LockRecord;
  } catch {
    return undefined;
  }
}

/**
 * Acquire the heavy-stage lock for `stage`. Throws {@link StageLockedError} if a
 * live process already holds it. Reclaims a lock whose holder process is dead.
 */
export function acquireStageLock(rootDir: string, stage: StageClass): LockHandle {
  const path = lockPathFor(rootDir);
  mkdirSync(join(rootDir, LOCK_DIR), { recursive: true });

  const record: LockRecord = {
    pid: process.pid,
    stage,
    startedAt: new Date().toISOString(),
    host: process.env["HOST"] ?? "local",
  };

  const tryCreate = (): boolean => {
    let fd: number;
    try {
      fd = openSync(path, "wx"); // O_CREAT | O_EXCL — fails if the file exists.
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "EEXIST") return false;
      throw err;
    }
    try {
      writeSync(fd, JSON.stringify(record, null, 2));
    } finally {
      closeSync(fd);
    }
    return true;
  };

  if (!tryCreate()) {
    const holder = readLock(path);
    if (holder && isAlive(holder.pid)) {
      throw new StageLockedError(stage, holder, path);
    }
    // Stale (holder dead or unreadable) — reclaim it.
    rmSync(path, { force: true });
    if (!tryCreate()) {
      // Lost a race to another process that grabbed it in the gap.
      const now = readLock(path);
      throw new StageLockedError(
        stage,
        now ?? { pid: -1, stage, startedAt: "unknown", host: "unknown" },
        path,
      );
    }
  }

  let released = false;
  return {
    path,
    release(): void {
      if (released) return;
      released = true;
      // Only remove if we still own it (guard against a reclaimed stale lock).
      const current = readLock(path);
      if (current?.pid === process.pid && existsSync(path)) {
        rmSync(path, { force: true });
      }
    },
  };
}

/** Run `fn` while holding the heavy-stage lock, releasing it even on throw. */
export async function withStageLock<T>(
  rootDir: string,
  stage: StageClass,
  fn: () => Promise<T> | T,
): Promise<T> {
  const handle = acquireStageLock(rootDir, stage);
  try {
    return await fn();
  } finally {
    handle.release();
  }
}
