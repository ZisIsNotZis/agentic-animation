/**
 * The CLI's system-preflight hook. The full probe superset (binaries, ffmpeg
 * filters, memory/disk budgets, uv, vendor/rhubarb, ComfyUI, Chromium) lives in
 * the ops workstream's `tools/doctor-checks/` so there is a single source of
 * truth; this module re-exports it. Keeping the same `systemChecks(config,
 * rootDir): Promise<Check[]>` signature means `anim doctor` needs no change.
 */
export { systemChecks } from "../../../../tools/doctor-checks/index";
