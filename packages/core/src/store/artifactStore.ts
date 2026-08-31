import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { z } from "zod";
import type { GeneratedBy } from "../schemas/common";
import { hashJson } from "../util/hash";

/**
 * Read a JSON artifact and validate it against its schema. Errors name the
 * file and the failing fields so a stage failure is actionable.
 */
export function readJson<S extends z.ZodTypeAny>(path: string, schema: S): z.infer<S> {
  if (!existsSync(path)) {
    throw new Error(`artifact: ${path} does not exist. Run the stage that produces it first.`);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(`artifact: ${path} is not valid JSON — ${(err as Error).message}.`);
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`artifact: ${path} failed schema validation:\n${issues}`);
  }
  return result.data;
}

/** Validate then write a JSON artifact (pretty-printed, dirs created). */
export function writeJson<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  data: z.input<S>,
): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`artifact: refusing to write invalid ${path}:\n${issues}`);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(result.data, null, 2) + "\n");
  return result.data;
}

export interface GeneratedOptions {
  stage: string;
  tool: string;
  /** ISO-8601 timestamp — pass a FIXED clock in determinism-sensitive stages. */
  at: string;
  /** Stage inputs; hashed into `generatedBy.inputHash` for staleness checks. */
  inputs?: unknown;
}

/**
 * Write a *generated* manifest with a `generatedBy` header stamped on it. The
 * schema must accept a `generatedBy` field. The header carries a content hash
 * of `inputs` so a downstream stage can detect that this artifact is stale.
 *
 * `at` is caller-provided on purpose: manifest-generating code must not read
 * the wall clock itself (determinism rule, CLAUDE.md).
 */
export function writeGenerated<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
  data: Omit<z.input<S>, "generatedBy">,
  opts: GeneratedOptions,
): z.infer<S> {
  const generatedBy: GeneratedBy = {
    stage: opts.stage,
    tool: opts.tool,
    at: opts.at,
    ...(opts.inputs !== undefined ? { inputHash: hashJson(opts.inputs) } : {}),
  };
  return writeJson(path, schema, { ...(data as object), generatedBy } as z.input<S>);
}

/**
 * True if the generated artifact at `path` was produced from different inputs
 * than `inputs` (or is missing / lacks a hash). Used by `render`/`assemble` to
 * refuse stale work unless `--force`.
 */
export function isStale(path: string, inputs: unknown): boolean {
  if (!existsSync(path)) return true;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { generatedBy?: GeneratedBy };
    const recorded = parsed.generatedBy?.inputHash;
    if (!recorded) return true;
    return recorded !== hashJson(inputs);
  } catch {
    return true;
  }
}
