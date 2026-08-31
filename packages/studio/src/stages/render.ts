/**
 * `anim render` — deterministic MP4 render, gated on QA (ARCHITECTURE §12).
 * Before spending render time it requires a *fresh* stills sweep and a stills
 * review receipt (both keyed to the current build hash); `--force` overrides.
 * The actual frame render + audio/caption mux lives in the renderer adapter;
 * this stage owns the gates and picks the output path.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  EpisodeBuildSchema,
  readJson,
  type Logger,
  type RendererAdapter,
  type RenderReport,
} from "@anim/core";
import { buildHashOf, readStillsManifest } from "./stills";

export interface StillsReview {
  buildHash: string;
  reviewer?: string;
  rounds?: number;
  at?: string;
  notes?: string[];
}

export function stillsReviewPath(episodeDir: string): string {
  return join(episodeDir, "build", "stills-review.json");
}

/** Record a stills-review receipt keyed to the current build (for the qa skill). */
export function writeStillsReview(episodeDir: string, review: StillsReview): void {
  writeFileSync(stillsReviewPath(episodeDir), JSON.stringify(review, null, 2) + "\n");
}

function readStillsReview(episodeDir: string): StillsReview | undefined {
  const p = stillsReviewPath(episodeDir);
  if (!existsSync(p)) return undefined;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as StillsReview;
  } catch {
    return undefined;
  }
}

export interface RenderStageOptions {
  slug: string;
  episodeDir: string;
  renderer: RendererAdapter;
  fps: number;
  crf: number;
  /** Memory-budget caps forwarded to the renderer (ARCHITECTURE §11). */
  concurrency?: number;
  offthreadVideoCacheSizeInBytes?: number;
  frameRange?: [number, number];
  scale?: number;
  force?: boolean;
  log?: Logger;
}

/**
 * TTS tools whose model output is not Apache/MIT-licensed and must never ship in
 * monetized video (DECISIONS.md hard rule 4). `anim voice` stamps the tool it
 * used into timeline.json's provenance; render refuses it unless `--force`.
 */
const DEV_ONLY_TTS_TOOLS = new Set(["tts:say", "tts:espeak"]);

/** The tts tool recorded in timeline.json's generatedBy header, if any. */
function narrationTool(episodeDir: string): string | undefined {
  const p = join(episodeDir, "timeline.json");
  if (!existsSync(p)) return undefined;
  try {
    const parsed = JSON.parse(readFileSync(p, "utf8")) as { generatedBy?: { tool?: string } };
    return parsed.generatedBy?.tool;
  } catch {
    return undefined;
  }
}

export async function renderEpisode(opts: RenderStageOptions): Promise<RenderReport> {
  const buildPath = join(opts.episodeDir, "episode.build.json");
  if (!existsSync(buildPath)) throw new Error("render: episode.build.json not found. Run 'anim assemble' first.");
  const build = readJson(buildPath, EpisodeBuildSchema);
  const buildHash = buildHashOf(buildPath);

  if (!opts.force) {
    const tool = narrationTool(opts.episodeDir);
    if (tool && DEV_ONLY_TTS_TOOLS.has(tool)) {
      throw new Error(
        `render: narration was synthesized with "${tool}", which is dev/smoke-only and must never ship ` +
          `in monetized video (DECISIONS.md hard rule 4). Re-run 'anim voice' with a licensed provider ` +
          `(tts:kokoro, or tts:dir for human takes), or pass --force for a throwaway/dev render.`,
      );
    }

    const manifest = readStillsManifest(opts.episodeDir);
    if (!manifest) {
      throw new Error("render: no stills sweep found. Run 'anim stills' and review the PNGs, or pass --force.");
    }
    if (manifest.buildHash !== buildHash) {
      throw new Error(
        "render: the stills sweep is stale (build changed since 'anim stills'). " +
          "Re-run 'anim stills', review the PNGs, then render — or pass --force.",
      );
    }
    const review = readStillsReview(opts.episodeDir);
    if (!review) {
      throw new Error(
        "render: stills not reviewed. After reading every PNG in build/stills/, record build/stills-review.json " +
          "(the qa-stills skill does this), or pass --force.",
      );
    }
    if (review.buildHash !== buildHash) {
      throw new Error("render: stills-review.json is for an older build. Re-review the current stills, or pass --force.");
    }
  }

  if (!existsSync(build.audioPath)) {
    opts.log?.warn(`render: ${build.audioPath} not found — the mux will produce a silent video. Run 'anim mix'.`);
  }

  const outPath = join(opts.episodeDir, "dist", `${opts.slug}.mp4`);
  opts.log?.info(`render: ${build.shots.length} shot(s), ${build.total}s @ ${opts.fps}fps, crf ${opts.crf}.`);
  return opts.renderer.render({
    buildPath,
    outPath,
    fps: opts.fps,
    crf: opts.crf,
    ...(opts.concurrency !== undefined ? { concurrency: opts.concurrency } : {}),
    ...(opts.offthreadVideoCacheSizeInBytes !== undefined
      ? { offthreadVideoCacheSizeInBytes: opts.offthreadVideoCacheSizeInBytes }
      : {}),
    ...(opts.frameRange !== undefined ? { frameRange: opts.frameRange } : {}),
    ...(opts.scale !== undefined ? { scale: opts.scale } : {}),
  });
}
