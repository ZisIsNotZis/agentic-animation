import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

/** SHA-256 hex of a UTF-8 string. */
export function hashString(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

/**
 * Stable SHA-256 of a JSON value. Object keys are sorted recursively so the
 * hash is independent of property order — this is the staleness key embedded
 * in generated manifests (`generatedBy.inputHash`, `episode.build.json.inputs`).
 */
export function hashJson(value: unknown): string {
  return hashString(stableStringify(value));
}

/** SHA-256 hex of a file's bytes. */
export function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Stable content hash of a JSON manifest, ignoring its `generatedBy` provenance
 * header. Generated manifests (`timeline.json`, `cues/*.json`) stamp a
 * wall-clock `generatedBy.at`; hashing raw bytes would make a downstream stage
 * treat the artifact as "changed" after a semantically-identical re-run (a
 * different clock only). Hashing the semantic content makes staleness track
 * meaning, not the timestamp (determinism rule). Falls back to a byte-equivalent
 * hash for non-object JSON.
 */
export function hashJsonContent(path: string): string {
  const text = readFileSync(path, "utf8");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return hashString(text);
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const { generatedBy: _ignored, ...rest } = value as Record<string, unknown>;
    return hashJson(rest);
  }
  return hashJson(value);
}

/** Deterministic JSON serialization with recursively sorted object keys. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
