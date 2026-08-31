import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { loadConfig } from "@anim/core";

/**
 * Resolve the read-only corpus root (the sibling `the-Hindu-timeline` repo).
 *
 * The `CorpusAdapter` interface injects no config, so resolution is lazy and
 * order-sensitive:
 *   1. `ANIM_CORPUS_ROOT` env var (absolute, or relative to `cwd`) — lets a
 *      caller/test point at a corpus without an `anim.config.json`.
 *   2. `anim.config.json`'s `paths.corpus`, resolved against the repo root
 *      (default `../the-Hindu-timeline`). This is the production path.
 */
export function resolveCorpusRoot(cwd: string = process.cwd()): string {
  const env = process.env.ANIM_CORPUS_ROOT;
  if (env) return isAbsolute(env) ? env : resolve(cwd, env);
  const { config, rootDir } = loadConfig(cwd);
  return resolve(rootDir, config.paths.corpus);
}

export interface CorpusPaths {
  root: string;
  events: string;
  catalog: string;
}

export function corpusPaths(root: string): CorpusPaths {
  return {
    root,
    events: join(root, "data", "events.jsonl"),
    catalog: join(root, "data", "catalog.json"),
  };
}

export function corpusExists(root: string): boolean {
  const p = corpusPaths(root);
  return existsSync(p.events) && existsSync(p.catalog);
}
