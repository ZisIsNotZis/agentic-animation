/**
 * Export every zod manifest schema to `docs/schemas/*.schema.json`.
 * Run via `npm run schemas`. Keeps the checked-in JSON Schemas in lockstep
 * with the zod source of truth (ARCHITECTURE §6).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { zodToJsonSchema } from "zod-to-json-schema";
import { MANIFEST_SCHEMAS, type ManifestName } from "../src/schemas/index";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..", "..");
const outDir = join(repoRoot, "docs", "schemas");
mkdirSync(outDir, { recursive: true });

let count = 0;
for (const [name, schema] of Object.entries(MANIFEST_SCHEMAS)) {
  const json = zodToJsonSchema(schema, { name: name as ManifestName, target: "jsonSchema7" });
  const outPath = join(outDir, `${name}.schema.json`);
  writeFileSync(outPath, JSON.stringify(json, null, 2) + "\n");
  count++;
  process.stderr.write(`wrote ${outPath}\n`);
}
process.stderr.write(`exported ${count} schema(s) to ${outDir}\n`);
