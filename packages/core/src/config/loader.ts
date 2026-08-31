import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { AnimConfigSchema, type AnimConfig } from "../schemas/config";

export interface LoadedConfig {
  config: AnimConfig;
  /** Repo root the config was resolved from. */
  rootDir: string;
  /** Config files that were found and merged, in precedence order (low→high). */
  sources: string[];
}

const BASE_NAME = "anim.config.json";
const LOCAL_NAME = "anim.config.local.json";

/**
 * Load `anim.config.json` and deep-merge an optional per-machine
 * `anim.config.local.json` on top, then validate. A missing base file is fine —
 * schema defaults produce a working config so `anim doctor` runs on a fresh
 * clone before the ops workstream commits the real config. ARCHITECTURE §7.
 */
export function loadConfig(rootDir: string = process.cwd()): LoadedConfig {
  const root = resolve(rootDir);
  const sources: string[] = [];
  let merged: unknown = {};

  for (const name of [BASE_NAME, LOCAL_NAME]) {
    const path = join(root, name);
    if (!existsSync(path)) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      throw new Error(
        `config: ${name} is not valid JSON — ${(err as Error).message}. Fix the file at ${path}.`,
      );
    }
    merged = deepMerge(merged, parsed);
    sources.push(path);
  }

  const result = AnimConfigSchema.safeParse(merged);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `config: invalid ${BASE_NAME}${sources.length ? "" : " defaults"}:\n${issues}\n` +
        `Check ${join(root, BASE_NAME)} against docs/schemas/anim.config.schema.json.`,
    );
  }

  return { config: result.data, rootDir: root, sources };
}

/** Resolve a config path (which may be relative to the repo root) to absolute. */
export function resolvePath(rootDir: string, p: string): string {
  return isAbsolute(p) ? p : join(rootDir, p);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge `b` over `a` (objects recurse; arrays and scalars replace). */
function deepMerge(a: unknown, b: unknown): unknown {
  if (!isPlainObject(a) || !isPlainObject(b)) return b;
  const out: Record<string, unknown> = { ...a };
  for (const key of Object.keys(b)) {
    out[key] = key in a ? deepMerge(a[key], b[key]) : b[key];
  }
  return out;
}
