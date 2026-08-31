/**
 * `anim golden` — SHA256 of rendered still buffers at fixed timestamps versus a
 * committed `golden.json` (ARCHITECTURE §12). The renderer is deterministic, so
 * any hash diff is a real visual change. `--update` re-baselines but requires
 * `--scope <shotId>` so a bulk re-baseline can never silently mask a regression
 * (lesson from the previous engine).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import {
  EpisodeBuildSchema,
  readJson,
  type EpisodeBuild,
  type Logger,
  type RendererAdapter,
} from "@anim/core";

export interface GoldenOptions {
  slug: string;
  episodeDir: string;
  renderer: RendererAdapter;
  update?: boolean;
  /** Required with --update: the single shot id being re-baselined. */
  scope?: string;
  log?: Logger;
}

export interface GoldenResult {
  ok: boolean;
  checked: number;
  diffs: { key: string; expected: string; actual: string }[];
  updated: boolean;
}

/** Sample times per shot: start+0.5 and mid, keyed `shotId@time` (stable). */
function sampleKeys(build: EpisodeBuild): { key: string; shot: string; t: number }[] {
  const out: { key: string; shot: string; t: number }[] = [];
  for (const s of build.shots) {
    const dur = Math.max(0, s.end - s.start);
    const a = round(s.start + Math.min(0.5, dur / 4));
    const b = round(s.start + dur / 2);
    out.push({ key: `${s.id}@${a}`, shot: s.id, t: a });
    out.push({ key: `${s.id}@${b}`, shot: s.id, t: b });
  }
  return out;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function golden(opts: GoldenOptions): Promise<GoldenResult> {
  if (opts.update && !opts.scope) {
    throw new Error(
      "golden --update requires --scope <shotId>: bulk re-baselines are refused so a regression cannot be masked. " +
        "Re-baseline one shot at a time after reviewing its stills.",
    );
  }
  const buildPath = join(opts.episodeDir, "episode.build.json");
  if (!existsSync(buildPath)) throw new Error("golden: episode.build.json not found. Run 'anim assemble' first.");
  const build = readJson(buildPath, EpisodeBuildSchema);

  const goldenPath = join(opts.episodeDir, "golden.json");
  const existing: Record<string, string> = existsSync(goldenPath)
    ? (JSON.parse(readFileSync(goldenPath, "utf8")) as Record<string, string>)
    : {};

  const scratch = join(tmpdir(), `anim-golden-${opts.slug}`);
  mkdirSync(scratch, { recursive: true });

  const samples = sampleKeys(build);
  const fresh: Record<string, string> = {};
  for (const { key, t } of samples) {
    const png = join(scratch, `${key.replace(/[^a-z0-9]/gi, "_")}.png`);
    await opts.renderer.still({ buildPath, timeSec: t, outPath: png });
    fresh[key] = createHash("sha256").update(readFileSync(png)).digest("hex").slice(0, 16);
  }

  // Create the baseline on first run.
  if (!existsSync(goldenPath)) {
    writeFileSync(goldenPath, JSON.stringify(fresh, null, 2) + "\n");
    opts.log?.info(`golden: created baseline with ${samples.length} frame(s).`);
    return { ok: true, checked: samples.length, diffs: [], updated: true };
  }

  if (opts.update) {
    const merged = { ...existing };
    let n = 0;
    for (const { key, shot } of samples) {
      if (shot === opts.scope) {
        merged[key] = fresh[key]!;
        n++;
      }
    }
    if (n === 0) throw new Error(`golden --update --scope "${opts.scope}": no shot with that id in the build.`);
    writeFileSync(goldenPath, JSON.stringify(merged, null, 2) + "\n");
    opts.log?.warn(
      `golden: re-baselined ${n} frame(s) for shot "${opts.scope}". ` +
        `Stills sweep checklist: confirm every OTHER shot is unchanged before committing golden.json.`,
    );
    return { ok: true, checked: n, diffs: [], updated: true };
  }

  const diffs: { key: string; expected: string; actual: string }[] = [];
  for (const { key } of samples) {
    const exp = existing[key];
    if (exp && exp !== fresh[key]) diffs.push({ key, expected: exp, actual: fresh[key]! });
  }
  if (diffs.length) {
    for (const d of diffs) opts.log?.error(`golden DIFF ${d.key}: ${d.expected} → ${d.actual}`);
    opts.log?.error(`golden: ${diffs.length}/${samples.length} frame(s) changed — run --update --scope <shotId> if intentional.`);
  } else {
    opts.log?.info(`golden: ${samples.length} frame(s) unchanged.`);
  }
  return { ok: diffs.length === 0, checked: samples.length, diffs, updated: false };
}
