/**
 * `anim stills` — render shot start/mid/end PNGs to `build/stills/` plus a
 * `stills-manifest.json` that `render` reads as its QA receipt: render refuses
 * if the stills are stale versus the build hash unless `--force` (ARCHITECTURE
 * §12). The make-episode skill reads every PNG and iterates ≥ 2 rounds.
 *
 * The RendererAdapter is injected so this stage stays renderer-agnostic.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  EpisodeBuildSchema,
  hashFile,
  readJson,
  type EpisodeBuild,
  type Logger,
  type RendererAdapter,
} from "@anim/core";

export type StillKind = "start" | "mid" | "end";

export interface StillEntry {
  shot: string;
  kind: StillKind;
  timeSec: number;
  file: string;
  sha256: string;
}

export interface StillsManifest {
  /** Hash of the episode.build.json this sweep was rendered from. */
  buildHash: string;
  fps: number;
  stills: StillEntry[];
}

export interface StillsOptions {
  /** Absolute path to `episodes/<slug>/`. */
  episodeDir: string;
  renderer: RendererAdapter;
  log?: Logger;
}

/** The three sample times for a shot, clamped just inside its bounds. */
export function shotSampleTimes(start: number, end: number): Record<StillKind, number> {
  const dur = Math.max(0, end - start);
  const pad = Math.min(0.1, dur / 4);
  return {
    start: round(start + pad),
    mid: round(start + dur / 2),
    end: round(Math.max(start, end - pad)),
  };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/** Hash of the build manifest — the staleness key stills + render share. */
export function buildHashOf(buildPath: string): string {
  return hashFile(buildPath);
}

export function stillsManifestPath(episodeDir: string): string {
  return join(episodeDir, "build", "stills-manifest.json");
}

export function readStillsManifest(episodeDir: string): StillsManifest | undefined {
  const p = stillsManifestPath(episodeDir);
  if (!existsSync(p)) return undefined;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as StillsManifest;
  } catch {
    return undefined;
  }
}

export async function stills(opts: StillsOptions): Promise<StillsManifest> {
  const buildPath = join(opts.episodeDir, "episode.build.json");
  if (!existsSync(buildPath)) {
    throw new Error(`stills: episode.build.json not found. Run 'anim assemble' first.`);
  }
  const build: EpisodeBuild = readJson(buildPath, EpisodeBuildSchema);
  const stillsDir = join(opts.episodeDir, "build", "stills");
  mkdirSync(stillsDir, { recursive: true });

  const entries: StillEntry[] = [];
  for (const shot of build.shots) {
    const times = shotSampleTimes(shot.start, shot.end);
    for (const kind of ["start", "mid", "end"] as const) {
      const timeSec = times[kind];
      const file = join(stillsDir, `${shot.id}-${kind}.png`);
      await opts.renderer.still({ buildPath, timeSec, outPath: file });
      entries.push({ shot: shot.id, kind, timeSec, file, sha256: hashFile(file) });
      opts.log?.info(`stills: ${shot.id} ${kind} @ ${timeSec}s`);
    }
  }

  const manifest: StillsManifest = {
    buildHash: buildHashOf(buildPath),
    fps: build.video.fps,
    stills: entries,
  };
  writeFileSync(stillsManifestPath(opts.episodeDir), JSON.stringify(manifest, null, 2) + "\n");
  opts.log?.info(`stills: wrote ${entries.length} PNG(s) + stills-manifest.json.`);
  return manifest;
}
