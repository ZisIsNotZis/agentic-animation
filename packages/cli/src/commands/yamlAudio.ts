import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import {
  YamlAudioPreparationSchema,
  YamlAudioAlignmentsSchema,
  alignmentForTake,
  buildYamlAudioPreparation,
  cleanSpokenText,
  createYamlAudioCacheKey,
  DEFAULT_ELLIPSIS_BEAT_SEC,
  loadNarrowEpisode,
  measuredTts,
  readJson,
  writeGenerated,
  yamlAudioSourceFromEpisode,
  segmentYamlAudio,
  hashString,
  type BoundaryAlignment,
  type YamlAudioPreparationArtifact,
  type YamlAudioUnmatched,
  type TtsAdapter,
  type TtsMeasurement,
  type YamlAudioMeasurements,
} from "@anim/core";
import type { StageContext } from "../runtime/context";
import {
  HUMAN_TAKE_PROVIDERS,
  applyStorytellerRegister,
  episodePaths,
  ffprobeDuration,
  stageNow,
} from "./audioSupport";
import { execa } from "execa";

const DEFAULT_PROFILE = "storyteller";
const DEFAULT_COMPILER_VERSION = "yaml-audio-v1";
const ARTIFACT_NAME = "yaml-audio.json";

export interface YamlAudioOptions {
  episode: string;
  provider?: string;
  profile?: string;
  compilerVersion?: string;
  /** Optional JSON object keyed by take id or cache key with provider boundaries. */
  alignment?: string;
  /** Test/offline measurements; normal runs use the selected TTS adapter. */
  measurements?: YamlAudioMeasurements;
  /** Existing source-audio directory; defaults to this episode's audio dir. */
  reuseDir?: string;
  /** Opt in to network synthesis for exact-text misses. */
  synthesizeUnmatched?: boolean;
}

type AlignmentFile = ReturnType<typeof YamlAudioAlignmentsSchema.parse>;

/**
 * Prepare YAML speech takes. The TTS adapter owns synthesis; this command owns
 * cleaning, final-duration measurement, cache reuse, and the shared timing
 * artifact consumed by later audio stages.
 */
export async function yamlAudioStage(ctx: StageContext, opts: YamlAudioOptions): Promise<void> {
  const provider = opts.provider ?? ctx.config.adapters.tts;
  const profile = opts.profile ?? DEFAULT_PROFILE;
  const compilerVersion = opts.compilerVersion ?? DEFAULT_COMPILER_VERSION;
  const tts = ctx.registry.require("tts", provider) as TtsAdapter & BoundaryTtsAdapter;
  const paths = episodePaths(ctx.config, ctx.rootDir, opts.episode);
  const yamlPath = join(paths.dir, "episode.yml");
  if (!existsSync(yamlPath)) throw new Error(`yaml audio: missing ${yamlPath}`);

  const episode = await loadNarrowEpisode(yamlPath);
  const source = yamlAudioSourceFromEpisode(episode);
  const alignment = opts.alignment ? readAlignment(opts.alignment) : undefined;
  const measurements = normalizeMeasurements(opts.measurements);
  const reuseDir = opts.reuseDir ?? paths.audioDir;
  const sourceLines = readLegacySourceLines(paths.dir);
  const unmatched: YamlAudioUnmatched[] = [];
  let reuseCount = 0;
  mkdirSync(paths.audioDir, { recursive: true });

  for (const chunk of segmentYamlAudio(source)) {
      const takeId = chunk.id;
      const cleanedText = cleanTextForSynthesis(chunk.text);
      const voice = source.actors[chunk.actor]?.voice ?? ctx.config.tts.voice;
      const cacheKey = createYamlAudioCacheKey({
        text: cleanedText,
        voiceAsset: voice,
        profile,
        compilerVersion,
        speed: chunk.speed,
      });
      const deliveryKey = tts.cacheIdentityForVoice
        ? hashString(tts.cacheIdentityForVoice(voice))
        : undefined;
      const outPath = join(paths.audioDir, `yaml-${takeId.replace(/[^a-zA-Z0-9._-]/g, "_")}.wav`);
      const cachePath = join(reuseDir, `yaml-cache-${cacheKey}${deliveryKey ? `-${deliveryKey}` : ""}.wav`);
      if (chunk.silence) {
        const durationSec = [...chunk.text].filter((char) => char === "…").length * DEFAULT_ELLIPSIS_BEAT_SEC;
        measurements.set(takeId, { durationSec });
        continue;
      }
      // Provider-aware caches take precedence over the stable take path. This
      // prevents an old WAV from surviving a voice delivery/mapping change.
      if (deliveryKey && existsSync(cachePath)) {
        copyFileSync(cachePath, outPath);
        const durationSec = await ffprobeDuration(outPath);
        measurements.set(takeId, {
          ...measuredTts({path: relative(paths.dir, outPath), durationSec}),
          boundaries: alignmentForTake(alignment, takeId) ?? uniformCharacterBoundaries(cleanedText, durationSec),
        });
        reuseCount++;
        continue;
      }
      if (existsSync(outPath) && !deliveryKey) {
        const durationSec = await ffprobeDuration(outPath);
        const fallback = alignmentForTake(alignment, takeId) ?? uniformCharacterBoundaries(cleanedText, durationSec);
        measurements.set(takeId, {
          ...measuredTts({path: relative(paths.dir, outPath), durationSec}),
          boundaries: fallback,
        });
        reuseCount++;
        continue;
      }
      if (existsSync(cachePath)) {
        copyFileSync(cachePath, outPath);
        const durationSec = await ffprobeDuration(outPath);
        measurements.set(takeId, {
          ...measuredTts({path: relative(paths.dir, outPath), durationSec}),
          boundaries: alignmentForTake(alignment, takeId) ?? uniformCharacterBoundaries(cleanedText, durationSec),
        });
        reuseCount++;
        continue;
      }
      const sourceLine = deliveryKey ? undefined : takeSourceLine(sourceLines, cleanedText);
      let boundaries = alignmentForTake(alignment, takeId)
        ?? (sourceLine ? alignmentForTake(alignment, sourceLine.id) : undefined)
        ?? (sourceLine ? readSourceAlignment(reuseDir, sourceLine.id) : undefined);
      if (sourceLine) {
        const sourcePath = join(reuseDir, `line-${basename(sourceLine.id)}.wav`);
        if (existsSync(sourcePath)) {
          copyFileSync(sourcePath, outPath);
          const durationSec = await ffprobeDuration(outPath);
          measurements.set(takeId, {
            ...measuredTts({ path: relative(paths.dir, outPath), durationSec }),
            ...(boundaries ? { boundaries } : {}),
          });
          reuseCount++;
          continue;
        }
      }

      const supplied = findMeasurement(measurements, takeId, cacheKey);
      if (!opts.synthesizeUnmatched && !supplied) {
        unmatched.push({ id: takeId, sceneId: chunk.sceneId, statementIndex: chunk.statementIndex, actor: chunk.actor, text: cleanedText, chunkIndex: chunk.chunkIndex, reason: "no-exact-reuse" });
        continue;
      }
      if (!supplied || !supplied.audioPath || !existsSync(supplied.audioPath)) {
        const rawPath = `${outPath}.raw.wav`;
        const result = await synthesizeWithOptionalBoundaries(tts, {
          text: cleanedText,
          voice,
          lang: languageOf(episode.episode.language),
          outPath: rawPath,
        });
        const synthesizedPath = existsSync(rawPath) ? rawPath : result.path;
        if (!existsSync(synthesizedPath)) {
          throw new Error(`yaml audio: TTS adapter returned missing audio path ${synthesizedPath} for take "${takeId}"`);
        }
        await applyStorytellerRegister(synthesizedPath, outPath, HUMAN_TAKE_PROVIDERS.has(provider), {tempo: chunk.speed});
        if (chunk.speed !== 1 && HUMAN_TAKE_PROVIDERS.has(provider)) await applyAudioSpeed(outPath, chunk.speed);
        boundaries = boundaries ?? result.boundaries;
      } else {
        copyFileSync(supplied.audioPath, outPath);
      }
      const durationSec = await ffprobeDuration(outPath);
      measurements.set(takeId, {
        ...measuredTts({ path: relative(paths.dir, outPath), durationSec }),
        ...(boundaries ? { boundaries } : {}),
      });
      if (!existsSync(cachePath)) copyFileSync(outPath, cachePath);
  }

  const preparation = buildYamlAudioPreparation(source, {
    profile,
    compilerVersion,
    measurements,
    allowUnmeasured: true,
  });
  const artifact: YamlAudioPreparationArtifact = {
    ...preparation,
    reuseCount,
    unmatchedCount: unmatched.length,
    ...(unmatched.length ? { unmatched } : {}),
  };
  const artifactPath = join(paths.audioDir, ARTIFACT_NAME);
  writeGenerated(artifactPath, YamlAudioPreparationSchema, artifact, {
    stage: "yaml-audio",
    tool: `tts:${provider}`,
    at: stageNow(),
    inputs: { episode, provider, profile, compilerVersion },
  });

  const count = artifact.takes.length;
  ctx.log.stage("yaml-audio").info(`prepared ${count} spoken take(s): ${artifact.takes.map((take) => take.id).join(", ")}; reused ${reuseCount}; unmatched ${unmatched.length}`, { provider, profile, artifactPath });
  process.stdout.write(`yaml-audio: wrote ${count} take(s); reused ${reuseCount}; unmatched ${unmatched.length} → ${artifactPath}\n`);
}

/** Assemble exactly the compiled speech starts; no scene-duration guessing. */
export async function assembleYamlAudio(
  episodeDir: string,
  preparation: YamlAudioPreparationArtifact,
  totalDuration: number,
): Promise<string> {
  const audioDir = join(episodeDir, "audio");
  const outPath = join(audioDir, "yaml-mix.wav");
  const takes = preparation.takes.filter((take) => take.audioPath);
  if (!takes.length) throw new Error("yaml audio: cannot assemble without prepared takes");
  const inputs = takes.map((take) => ({
    path: resolveAudioPath(episodeDir, take.audioPath!),
    startSec: take.timing.startSec,
  }));
  if (inputs.some((input) => !existsSync(input.path))) {
    const missing = inputs.find((input) => !existsSync(input.path))!;
    throw new Error(`yaml audio: missing take audio ${missing.path}`);
  }
  const filter = inputs.map((input, index) =>
    `[${index}:a]adelay=${Math.max(0, Math.round(input.startSec * 1000))}:all=1[a${index}]`,
  );
  filter.push(`${inputs.map((_input, index) => `[a${index}]`).join("")}amix=inputs=${inputs.length}:duration=longest:normalize=0,apad=whole_dur=${totalDuration},atrim=duration=${totalDuration}[out]`);
  await execa("ffmpeg", [
    "-y", "-v", "error",
    ...inputs.flatMap((input) => ["-i", input.path]),
    "-filter_complex", filter.join(";"), "-map", "[out]",
    "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", outPath,
  ]);
  return relative(episodeDir, outPath);
}

export interface YamlAudioQaResult {
  takes: number;
  reuseCount: number;
  unmatchedCount: number;
  audioFiles: number;
  subtitleCount: number;
  overlaps: string[];
}

/** Pure QA for tests and callers that already have ffprobe durations. */
export function qaYamlAudio(
  preparation: YamlAudioPreparationArtifact,
  durations: Readonly<Record<string, number>>,
  toleranceSec = 0.01,
): YamlAudioQaResult {
  const overlaps: string[] = [];
  const takes = [...preparation.takes].sort((a, b) => a.timing.startSec - b.timing.startSec);
  for (let i = 1; i < takes.length; i++) {
    if (takes[i]!.timing.startSec < takes[i - 1]!.timing.endSec - toleranceSec) overlaps.push(`${takes[i - 1]!.id} overlaps ${takes[i]!.id}`);
  }
  return {
    takes: preparation.takes.length,
    reuseCount: preparation.reuseCount ?? 0,
    unmatchedCount: preparation.unmatchedCount ?? 0,
    audioFiles: preparation.takes.filter((take) => take.audioPath && durations[take.id] !== undefined && Math.abs(durations[take.id]! - take.durationSec) <= toleranceSec).length,
    subtitleCount: preparation.takes.reduce((count, take) => count + take.captions.length, 0),
    overlaps,
  };
}

function resolveAudioPath(episodeDir: string, path: string): string {
  return path.startsWith("/") ? path : join(episodeDir, path);
}

function cleanTextForSynthesis(source: string): string {
  return cleanSpokenText(source).text;
}

/** Deterministic fallback for providers/runs that did not emit word timing. */
function uniformCharacterBoundaries(text: string, durationSec: number): BoundaryAlignment[] {
  const chars = [...text];
  if (!chars.length || durationSec <= 0) return [];
  let offset = 0;
  return chars.map((char, index) => {
    const startChar = offset;
    offset += char.length;
    return {
      kind: "character" as const,
      text: char,
      startChar,
      endChar: offset,
      startSec: durationSec * index / chars.length,
      endSec: durationSec * (index + 1) / chars.length,
    };
  });
}

function readAlignment(path: string): AlignmentFile {
  return readJson(path, YamlAudioAlignmentsSchema) as AlignmentFile;
}

function normalizeMeasurements(input: YamlAudioMeasurements | undefined): Map<string, TtsMeasurement | number | undefined> {
  if (!input) return new Map();
  return input instanceof Map ? new Map(input) : new Map(Object.entries(input));
}

type BoundaryTtsAdapter = {
  synthesizeWithBoundaries?: (req: Parameters<TtsAdapter["synthesize"]>[0]) => Promise<{
    path: string;
    durationSec: number;
    boundaries?: readonly BoundaryAlignment[];
  }>;
  cacheIdentityForVoice?: (voiceAsset: string) => string;
};

async function synthesizeWithOptionalBoundaries(
  tts: TtsAdapter & BoundaryTtsAdapter,
  request: Parameters<TtsAdapter["synthesize"]>[0],
): Promise<{ path: string; durationSec: number; boundaries?: readonly BoundaryAlignment[] }> {
  if (tts.synthesizeWithBoundaries) return tts.synthesizeWithBoundaries(request);
  return tts.synthesize(request);
}

interface LegacySourceLine { id: string; text: string; }

function readLegacySourceLines(episodeDir: string): LegacySourceLine[] {
  const path = join(episodeDir, "script.json");
  if (!existsSync(path)) return [];
  try {
    const raw = JSON.parse(requireText(path)) as { scenes?: Array<{ dialogue?: Array<{ id?: string; tts?: string }> }> };
    return (raw.scenes ?? []).flatMap((scene) => (scene.dialogue ?? []).flatMap((line) =>
      typeof line.id === "string" && typeof line.tts === "string" ? [{ id: line.id, text: line.tts }] : [],
    ));
  } catch {
    return [];
  }
}

function requireText(path: string): string { return readFileSync(path, "utf8"); }

function takeSourceLine(lines: readonly LegacySourceLine[], text: string): LegacySourceLine | undefined {
  const matches = lines.filter((line) => line.text === text);
  return matches.length === 1 ? matches[0] : undefined;
}

function readSourceAlignment(dir: string, id: string): readonly BoundaryAlignment[] | undefined {
  const candidates = [
    join(dir, `line-${id}.json`),
    join(dir, `line-${id}.alignment.json`),
    join(dir, `${id}.alignment.json`),
    join(dir, `line-${id}.words.json`),
    join(dir, `${id}.words.json`),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
      const boundaries = Array.isArray(raw)
        ? raw
        : raw && typeof raw === "object" && "boundaries" in raw
          ? (raw as {boundaries: unknown}).boundaries
          : raw && typeof raw === "object" && "words" in raw
            ? (raw as {words: unknown}).words
            : undefined;
      if (!Array.isArray(boundaries)) continue;
      const normalized = boundaries.flatMap((boundary): BoundaryAlignment[] => {
        if (!boundary || typeof boundary !== "object") return [];
        const value = boundary as Record<string, unknown>;
        const startSec = typeof value.startSec === "number" ? value.startSec : typeof value.start === "number" ? value.start : undefined;
        const endSec = typeof value.endSec === "number" ? value.endSec : typeof value.end === "number" ? value.end : undefined;
        if (startSec === undefined || endSec === undefined) return [];
        const text = typeof value.text === "string" ? value.text : typeof value.word === "string" ? value.word : undefined;
        const kind = value.kind === "character" ? "character" : "word";
        return [{kind, startSec, endSec, ...(text ? {text} : {}), ...(typeof value.startChar === "number" ? {startChar: value.startChar} : {}), ...(typeof value.endChar === "number" ? {endChar: value.endChar} : {})}];
      });
      if (normalized.length) return alignmentForTake(YamlAudioAlignmentsSchema.parse({x: normalized}), "x");
    } catch {
      // Existing mouth-cue JSON and unrelated sidecars are not word alignment.
    }
  }
  return undefined;
}

function findMeasurement(measurements: Map<string, TtsMeasurement | number | undefined>, id: string, cacheKey?: string): TtsMeasurement | undefined {
  const raw = measurements.get(id) ?? (cacheKey ? measurements.get(cacheKey) : undefined);
  if (typeof raw === "number") return { durationSec: raw };
  return raw;
}

async function applyAudioSpeed(path: string, speed: number): Promise<void> {
  const temporary = `${path}.speed.wav`;
  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2) { filters.push("atempo=2"); remaining /= 2; }
  while (remaining < 0.5) { filters.push("atempo=0.5"); remaining /= 0.5; }
  filters.push(`atempo=${remaining}`);
  await execa("ffmpeg", ["-y", "-v", "error", "-i", path, "-af", filters.join(","), "-ac", "1", "-c:a", "pcm_s16le", temporary]);
  copyFileSync(temporary, path);
  const { rmSync } = await import("node:fs");
  rmSync(temporary, {force: true});
}

function languageOf(language: string): "en" | "hi" | "zh" {
  const languageCode = language.toLowerCase().split(/[-_]/)[0];
  if (languageCode === "en" || languageCode === "hi" || languageCode === "zh") return languageCode;
  throw new Error(`yaml audio: unsupported episode language "${language}"`);
}
