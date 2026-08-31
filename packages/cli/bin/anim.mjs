#!/usr/bin/env node
// Launcher for the `anim` CLI. The CLI is TypeScript run through `tsx` (no
// bundler, per project ground rules), so we re-exec Node with the tsx loader
// registered and hand it the real entry point.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const entry = join(here, "..", "src", "index.ts");

const result = spawnSync(process.execPath, ["--import", "tsx", entry, ...process.argv.slice(2)], {
  stdio: "inherit",
});

if (result.error) {
  process.stderr.write(`anim: failed to launch (${result.error.message}).\n` +
    `Ensure dependencies are installed (npm install) so 'tsx' is available.\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
