/**
 * System-level preflight probes for `anim doctor` (ARCHITECTURE §12, workstream E).
 *
 * This is the *superset* of the minimal probe the scaffold shipped in
 * `packages/cli/src/runtime/systemChecks.ts`. It keeps the identical
 * `systemChecks(config, rootDir): Promise<Check[]>` signature so the CLI's
 * runtime hook can delegate to it with a one-line re-export (see tools/README.md
 * → "Wiring"). Adapters still contribute their own `doctor()` checks; the CLI
 * aggregates both.
 *
 * Severity model: the frozen `Check` type has only `ok`, and `anim doctor`
 * treats any failing *system* probe as hard breakage (non-zero exit). So:
 *   - Core toolchain that setup.sh guarantees (node, ffmpeg + filters, ffprobe)
 *     and capacity gates (memory, disk) report `ok` honestly → hard failure.
 *   - Model/asset prerequisites that only matter for specific heavy stages and
 *     are not present until you start a server / ensure a browser
 *     (ComfyUI, chromium) are WARN-ONLY: they always report `ok: true` and fold
 *     the "not ready" state + remedy into `detail`, so a fresh, correctly set-up
 *     environment is green even before ComfyUI is running.
 *   - Fetched prerequisites (uv, vendor/rhubarb) and the corpus report `ok`
 *     honestly — they are present the moment `tools/setup.sh` + the fetch
 *     scripts have run, which is the documented pre-session step.
 */
import { existsSync, statfsSync } from "node:fs";
import { freemem, totalmem } from "node:os";
import { join } from "node:path";
import { execa } from "execa";
import type { Check } from "@anim/core";
import { resolvePath, type AnimConfig } from "@anim/core";

/** Stage memory budgets (GB) — ARCHITECTURE §11. Image gen and render never run
 * concurrently, so the machine only ever needs the larger of the two free. */
export const STAGE_BUDGETS_GB = { imagegen: 18, render: 6 } as const;

/** Heavy stages want at least this much scratch for models + frames + mux. */
const MIN_DISK_GB = 20;

/** ComfyUI dev server default (git install, not the Desktop app) — DECISIONS.md. */
const DEFAULT_COMFYUI_URL = "http://127.0.0.1:8188";

/** Resolve the ComfyUI base URL: env override, else a config `comfyui.url` if the
 * project later adds one to the schema, else the documented default. The cast is
 * deliberate — the frozen AnimConfig has no comfyui field yet (see OPEN ISSUES). */
function comfyuiUrl(config: AnimConfig): string {
  // COMFYUI_URL is the convention the imagegen adapter (workstream B) reads.
  const fromEnv = process.env["COMFYUI_URL"] ?? process.env["ANIM_COMFYUI_URL"];
  if (fromEnv) return fromEnv;
  const fromConfig = (config as { comfyui?: { url?: string } }).comfyui?.url;
  return fromConfig ?? DEFAULT_COMFYUI_URL;
}

/** First non-empty line of a binary's version banner, or null if it is absent. */
async function binaryVersion(bin: string, args: string[] = ["-version"]): Promise<string | null> {
  try {
    const { stdout, stderr } = await execa(bin, args, { reject: false });
    const out = (stdout || stderr || "").split("\n")[0]?.trim();
    return out ?? "";
  } catch {
    return null;
  }
}

function nodeCheck(): Check {
  const major = Number(process.versions.node.split(".")[0]);
  const ok = major >= 20;
  return {
    name: "node >= 20",
    ok,
    detail: `node ${process.version}`,
    ...(ok ? {} : { fix: "Install Node 20+ (this project is verified on v26); e.g. `brew install node`." }),
  };
}

async function binaryPresentCheck(bin: string, fix: string): Promise<Check> {
  const v = await binaryVersion(bin);
  const ok = v !== null;
  return {
    name: `${bin} present`,
    ok,
    detail: ok ? v! || `${bin} present` : `${bin} not found on PATH`,
    ...(ok ? {} : { fix }),
  };
}

/** ffmpeg must expose the filters the audio mix + timing graph depends on
 * (ARCHITECTURE §10 salvaged filter graph): sidechaincompress, loudnorm,
 * adelay, amix. A stripped ffmpeg build silently breaks audio production. */
async function ffmpegFiltersCheck(): Promise<Check> {
  const required = ["sidechaincompress", "loudnorm", "adelay", "amix"];
  let listing: string;
  try {
    const { stdout } = await execa("ffmpeg", ["-hide_banner", "-filters"], { reject: false });
    listing = stdout;
  } catch {
    return {
      name: "ffmpeg filters",
      ok: false,
      detail: "could not run `ffmpeg -filters` (ffmpeg missing?)",
      fix: "Install ffmpeg 8.x (`brew install ffmpeg`).",
    };
  }
  // Filter names sit in the third whitespace-delimited column of each row.
  const present = new Set(
    listing
      .split("\n")
      .map((l) => l.trim().split(/\s+/)[1])
      .filter((x): x is string => Boolean(x)),
  );
  const missing = required.filter((f) => !present.has(f));
  const ok = missing.length === 0;
  return {
    name: "ffmpeg filters",
    ok,
    detail: ok
      ? `all present: ${required.join(", ")}`
      : `missing: ${missing.join(", ")}`,
    ...(ok
      ? {}
      : {
          fix: "Your ffmpeg build lacks required audio filters — install a full build (`brew install ffmpeg`, not a `--without-*` variant).",
        }),
  };
}

/** Memory capacity vs the stage budgets. Image gen and render never run
 * concurrently (§11), so the machine only needs to *hold* the larger single
 * stage. The hard gate is TOTAL RAM (a real capacity fact); free memory is
 * advisory only — on macOS `freemem()` reports post-cache free pages and reads
 * misleadingly low on a perfectly capable machine, so per §11 ("warns if free
 * memory < stage budget") a low free reading is a WARN folded into detail, not
 * a hard failure. */
function memoryCheck(): Check {
  const totalGb = totalmem() / 1024 ** 3;
  const freeGb = freemem() / 1024 ** 3;
  // Capacity floor: must physically fit the render stage (the one the smoke path
  // and every episode needs). Image gen wants more but is optional/offline-able.
  const ok = totalGb + 0.5 >= STAGE_BUDGETS_GB.render;
  const tight = freeGb < STAGE_BUDGETS_GB.render;
  return {
    name: "free memory",
    ok,
    detail:
      `${totalGb.toFixed(0)} GB total, ${freeGb.toFixed(1)} GB free — image gen wants ` +
      `~${STAGE_BUDGETS_GB.imagegen} GB, render ~${STAGE_BUDGETS_GB.render} GB (not concurrent)` +
      (ok && tight
        ? ". warn — free memory is tight; close other apps before a heavy stage (macOS free-page counts read low and are usually fine)."
        : "."),
    ...(ok ? {} : { fix: `This machine has < ${STAGE_BUDGETS_GB.render} GB RAM; render needs more.` }),
  };
}

/** Free disk on the repo volume vs the heavy-stage scratch floor. */
function diskCheck(rootDir: string): Check {
  try {
    const st = statfsSync(rootDir);
    const freeGb = (st.bavail * st.bsize) / 1024 ** 3;
    const ok = freeGb >= MIN_DISK_GB;
    return {
      name: "free disk",
      ok,
      detail: `${freeGb.toFixed(0)} GB free on the repo volume (models + frames want >= ${MIN_DISK_GB} GB).`,
      ...(ok
        ? {}
        : { fix: `Free up disk to >= ${MIN_DISK_GB} GB — image-gen models (~13 GB) plus rendered frames are large.` }),
    };
  } catch (err) {
    return {
      name: "free disk",
      ok: false,
      detail: `could not stat ${rootDir}: ${(err as Error).message}`,
      fix: "Ensure the repo path is readable.",
    };
  }
}

/** uv manages the project's Python sidecars (Kokoro, rembg) — DECISIONS.md. */
async function uvCheck(): Promise<Check> {
  const v = await binaryVersion("uv", ["--version"]);
  const ok = v !== null;
  return {
    name: "uv present",
    ok,
    detail: ok ? v! || "uv present" : "uv not found on PATH",
    ...(ok
      ? {}
      : { fix: "Install uv: `tools/setup.sh --yes`, or `curl -LsSf https://astral.sh/uv/install.sh | sh`." }),
  };
}

/** Rhubarb is fetched to vendor/ by tools/fetch-rhubarb.sh (workstream A). */
function rhubarbCheck(rootDir: string, config: AnimConfig): Check {
  const vendor = resolvePath(rootDir, config.paths.vendor);
  const candidates = [join(vendor, "rhubarb", "rhubarb"), join(vendor, "rhubarb")];
  const found = candidates.find((p) => existsSync(p));
  const ok = Boolean(found);
  return {
    name: "vendor/rhubarb present",
    ok,
    detail: ok ? found! : `not found under ${vendor}`,
    ...(ok ? {} : { fix: "Fetch the Rhubarb binary: `tools/fetch-rhubarb.sh` (workstream A)." }),
  };
}

function corpusCheck(rootDir: string, config: AnimConfig): Check {
  if (!config.paths.corpus) {
    return {
      name: "corpus path",
      ok: true,
      detail: "not configured — optional corpus disabled; set ANIM_CORPUS_ROOT or paths.corpus to enable it",
    };
  }
  const corpus = resolvePath(rootDir, config.paths.corpus);
  const ok = existsSync(corpus);
  return {
    name: "corpus path",
    ok,
    detail: ok ? corpus : `not found: ${corpus}`,
    ...(ok
      ? {}
      : { fix: "Clone the story corpus beside this repo, or set paths.corpus in anim.config.json." }),
  };
}

/** WARN-ONLY: ComfyUI is only needed for image gen and is a separately-started
 * heavy server — a fresh env is green without it. Reports ok:true always. */
async function comfyuiCheck(config: AnimConfig): Promise<Check> {
  const url = comfyuiUrl(config);
  const statsUrl = `${url.replace(/\/$/, "")}/system_stats`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 1500);
    const res = await fetch(statsUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      return { name: "ComfyUI reachable", ok: true, detail: `responding at ${url}` };
    }
    return {
      name: "ComfyUI reachable",
      ok: true,
      detail: `warn — ${url} returned HTTP ${res.status}; only needed for image gen. Start it with tools/setup-comfyui.sh (workstream B).`,
    };
  } catch {
    return {
      name: "ComfyUI reachable",
      ok: true,
      detail: `warn — not reachable at ${url}; only needed for image gen. Start it with tools/setup-comfyui.sh (workstream B), or set COMFYUI_URL.`,
    };
  }
}

/** WARN-ONLY: Remotion downloads its own chrome-headless-shell on demand. We
 * cannot cheaply prove it is present without loading Remotion, so this always
 * reports ok:true and names the one-shot fix. */
function chromiumCheck(): Check {
  return {
    name: "chromium for remotion",
    ok: true,
    detail:
      "warn — not verified here; Remotion needs a headless Chromium for render/stills. Ensure it once with `npx remotion browser ensure`.",
  };
}

/**
 * All system probes for `anim doctor`. Drop-in superset replacement for the
 * scaffold's `systemChecks`. Order: toolchain, capacity, fetched prerequisites,
 * warn-only heavy-stage prerequisites.
 */
export async function systemChecks(config: AnimConfig, rootDir: string): Promise<Check[]> {
  const [ffmpeg, ffprobe, filters, uv, comfyui] = await Promise.all([
    binaryPresentCheck("ffmpeg", "Install ffmpeg 8.x (`brew install ffmpeg`) so ffmpeg is on PATH."),
    binaryPresentCheck("ffprobe", "Install ffmpeg 8.x (`brew install ffmpeg`) — ffprobe ships with it."),
    ffmpegFiltersCheck(),
    uvCheck(),
    comfyuiCheck(config),
  ]);

  return [
    nodeCheck(),
    ffmpeg,
    ffprobe,
    filters,
    memoryCheck(),
    diskCheck(rootDir),
    uv,
    rhubarbCheck(rootDir, config),
    corpusCheck(rootDir, config),
    comfyui,
    chromiumCheck(),
  ];
}

/** Standalone runner: `tsx tools/doctor-checks/index.ts` prints the report
 * without loading the adapter registry — a fast environment sanity check. */
async function main(): Promise<void> {
  const { loadConfig } = await import("@anim/core");
  const { config, rootDir } = loadConfig(process.cwd());
  const checks = await systemChecks(config, rootDir);
  let failed = 0;
  process.stdout.write("system checks (standalone)\n");
  for (const c of checks) {
    if (!c.ok) failed++;
    process.stdout.write(`  [${c.ok ? "  ok  " : " FAIL "}] ${c.name} — ${c.detail}\n`);
    if (!c.ok && c.fix) process.stdout.write(`           fix: ${c.fix}\n`);
  }
  process.stdout.write(`\n${failed} hard failure(s).\n`);
  process.exitCode = failed > 0 ? 1 : 0;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  void main();
}
