/**
 * Shared helpers for the audio stages (voice / lipsync / music / mix): episode
 * path resolution, ffprobe/ffmpeg primitives, sentence splitting, the
 * deterministic silence-gap concat trick, and the two "storyteller register"
 * filter chains. Salvaged from the previous engine's narrate.mjs / mix.sh and
 * rewritten typed with execa.
 */
import { existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execa } from "execa";
import { resolvePath, type AnimConfig } from "@anim/core";

/** TTS providers whose audio is a whole pre-recorded human take (no sentence */
/** splitting, gentle filter chain only — never the synthetic register shift). */
export const HUMAN_TAKE_PROVIDERS = new Set(["dir"]);

/** Silence inserted between sentence chunks so narration breathes (ARCHITECTURE §10). */
export const SENTENCE_GAP_S = 0.55;

export interface EpisodePaths {
  dir: string;
  audioDir: string;
  cuesDir: string;
  voiceDir: string;
  scriptPath: string;
  timelinePath: string;
  musicPath: string;
  mixPath: string;
  mixMp3Path: string;
  narrationPath: string;
  narrPath: (sceneId: string) => string;
  linePath: (lineId: string) => string;
}

export function episodePaths(config: AnimConfig, rootDir: string, slug: string): EpisodePaths {
  const dir = join(resolvePath(rootDir, config.paths.episodes), slug);
  const audioDir = join(dir, "audio");
  return {
    dir,
    audioDir,
    cuesDir: join(dir, "cues"),
    voiceDir: join(dir, "voice"),
    scriptPath: join(dir, "script.json"),
    timelinePath: join(dir, "timeline.json"),
    musicPath: join(audioDir, "music.wav"),
    mixPath: join(audioDir, "mix.wav"),
    mixMp3Path: join(audioDir, "mix.mp3"),
    narrationPath: join(audioDir, "narration.wav"),
    narrPath: (sceneId: string) => join(audioDir, `narr-${sceneId}.wav`),
    linePath: (lineId: string) => join(audioDir, `line-${lineId}.wav`),
  };
}

/**
 * Split scene text into sentences on `. ` / `; ` / `! ` / `? `. The ending
 * punctuation stays with the sentence; the whitespace after becomes the concat
 * boundary that a fixed silence gap replaces.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.;!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function ffprobeDuration(path: string): Promise<number> {
  const { stdout } = await execa("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path,
  ]);
  return Number.parseFloat(stdout.trim());
}

export async function probeAudio(path: string): Promise<{ rate: number; channels: number }> {
  const { stdout } = await execa("ffprobe", [
    "-v", "error", "-select_streams", "a:0",
    "-show_entries", "stream=sample_rate,channels", "-of", "csv=p=0", path,
  ]);
  const [rate, channels] = stdout.trim().split(",").map(Number);
  return { rate: rate ?? 44100, channels: channels ?? 1 };
}

/**
 * Concatenate `chunkPaths` with `gapS` seconds of real silence between each,
 * via the ffmpeg concat demuxer (deterministic — same generated silence file,
 * same demuxer, every run; no re-encode surprises). Cleans up its temp files.
 */
export async function concatWithGaps(chunkPaths: string[], gapS: number, outPath: string): Promise<void> {
  if (chunkPaths.length === 0) throw new Error("concatWithGaps: no chunks");
  const { rate, channels } = await probeAudio(chunkPaths[0]!);
  const silence = outPath + ".silence.wav";
  await execa("ffmpeg", [
    "-y", "-v", "error", "-f", "lavfi",
    "-i", `anullsrc=r=${rate}:cl=${channels === 1 ? "mono" : "stereo"}`,
    "-t", String(gapS), "-c:a", "pcm_s16le", silence,
  ]);
  const listFile = outPath + ".concat.txt";
  const lines: string[] = [];
  chunkPaths.forEach((p, i) => {
    lines.push(`file '${p.replace(/'/g, "'\\''")}'`);
    if (i < chunkPaths.length - 1) lines.push(`file '${silence.replace(/'/g, "'\\''")}'`);
  });
  writeFileSync(listFile, lines.join("\n") + "\n");
  await execa("ffmpeg", [
    "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", listFile,
    "-ar", String(rate), "-ac", String(channels), "-c:a", "pcm_s16le", outPath,
  ]);
  rmSync(silence, { force: true });
  rmSync(listFile, { force: true });
}

export interface RegisterOptions {
  /** Pitch multiplier for the synthetic register shift (<1 = deeper). */
  pitch?: number;
  /** Tempo multiplier applied after the pitch shift. */
  tempo?: number;
}

/**
 * Apply the "storyteller register" post-chain from `src` to `out` (mono, 44.1k).
 *
 * - synthetic voices get the full register shift: pitch-down (sample-rate
 *   reinterpret, made source-rate-aware so it is correct for any TTS engine,
 *   not just the 16 kHz the trick was written for), band-limit, a warm EQ
 *   bump, a breath of room (aecho), and loudness match.
 * - human takes get only a gentle high-pass + loudness match, keeping the
 *   recorded performance natural (DECISIONS.md: only synthetic voices are
 *   register-shifted).
 */
export async function applyStorytellerRegister(
  src: string,
  out: string,
  human: boolean,
  opts: RegisterOptions = {},
): Promise<void> {
  let af: string;
  if (human) {
    af = "highpass=f=60,loudnorm=I=-17:TP=-2:LRA=9,aresample=44100";
  } else {
    const pitch = opts.pitch ?? 0.95;
    const tempo = opts.tempo ?? 1.0;
    const { rate } = await probeAudio(src);
    af =
      `asetrate=${rate}*${pitch},aresample=44100,atempo=${tempo},` +
      "highpass=f=75,lowpass=f=7600,equalizer=f=220:t=q:w=1.2:g=2,treble=g=-1.5," +
      "aecho=0.55:0.42:26|44:0.13|0.08,loudnorm=I=-17:TP=-2:LRA=9,aresample=44100";
  }
  await execa("ffmpeg", ["-y", "-v", "error", "-i", src, "-af", af, "-ac", "1", out]);
}

/** True if the narration WAV for `sceneId` exists (used by lipsync/mix guards). */
export function narrExists(paths: EpisodePaths, sceneId: string): boolean {
  return existsSync(paths.narrPath(sceneId));
}

/** ISO timestamp for generated-manifest provenance; `ANIM_NOW` pins it for CI. */
export function stageNow(): string {
  return process.env.ANIM_NOW ?? new Date().toISOString();
}
