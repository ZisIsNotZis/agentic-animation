/**
 * renderer-remotion — drives the @anim/studio Remotion project programmatically
 * (ARCHITECTURE §9, §11). `renderManifest()` reads the canonical performance manifest, selects the `performance`
 * composition, renders silent H.264 with bounded off-thread caching, then
 * muxes manifest/preparation audio and exact voice captions. `still()` renders
 * single frames for the stills QA + golden stages.
 *
 * Determinism: the render is a pure function of the RenderModel (all assets
 * inlined as data URIs by @anim/studio) and the frame number.
 */
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { execa } from "execa";
import { bundle } from "@remotion/bundler";
import { ensureBrowser, renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import type { VideoConfig } from "remotion/no-react";
import {
  hashString,
  notReadyCheck,
  readJson,
  type AdapterRegistration,
  type Check,
  type RendererAdapter,
  type RenderReport,
} from "@anim/core";
import { type PerformanceManifest } from "@anim/studio";

const ID = "remotion";
const PERFORMANCE_COMPOSITION_ID = "performance";

// Fallback memory budget for 24 GB (ARCHITECTURE §11): render never runs
// concurrently with image gen, and is itself capped. The CLI passes the
// operator's configured caps (render.concurrency / .offthreadVideoCacheSizeInBytes)
// through the render request; these apply only when it does not.
const OFFTHREAD_CACHE_BYTES = 2 * 1024 * 1024 * 1024;
// Remotion 4.0.486 supports `chromeMode`, not the `mode: "chrome-devtools"`
// option described in the local acceleration note. `chrome-for-testing` is
// the supported route to Chromium's new headless implementation; the
// headless-shell path would force `--headless=old` in this Remotion release.
const CHROME_MODE = "chrome-for-testing" as const;
const CHROMIUM_OPTIONS = {
  // EGL is the Linux GPU path for Chrome-for-testing. If the driver cannot
  // initialize it, Remotion/Chromium falls back rather than failing the job.
  gl: "egl" as const,
  enableMultiProcessOnLinux: true,
} as const;
let lastProgress = -1;

function localBrowser(): string | undefined {
  const candidates = [
    process.env.ANIM_BROWSER,
    "/home/z/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome",
  ].filter((p): p is string => Boolean(p));
  return candidates.find((p) => existsSync(p));
}

const require = createRequire(import.meta.url);

/** Absolute path to the studio Remotion entry (registerRoot). */
function studioEntry(): string {
  return require.resolve("@anim/studio/remotion-entry");
}

let bundlePromise: Promise<string> | undefined;
/** Bundle the studio once per process; the bundle is build-independent. */
async function serveUrl(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = bundle({ entryPoint: studioEntry() });
  }
  return bundlePromise;
}

interface PreparedPerformance {
  manifest: PerformanceManifest;
  composition: VideoConfig;
  serve: string;
  fps: number;
}

const performanceCompCache = new Map<string, PreparedPerformance>();

function readPerformanceManifest(manifestPath: string): PerformanceManifest {
  if (!existsSync(manifestPath)) {
    throw new Error(`renderer: performance manifest ${manifestPath} does not exist. Run 'anim make' first.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new Error(`renderer: performance manifest ${manifestPath} is not valid JSON — ${(err as Error).message}`);
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`renderer: performance manifest ${manifestPath} must be a JSON object`);
  }
  return value as PerformanceManifest;
}

function performanceFps(manifest: PerformanceManifest, override?: number): number {
  const fps = override ?? manifest.video?.fps ?? 24;
  if (!Number.isInteger(fps) || fps < 1) throw new Error("renderer: performance fps must be a positive integer");
  return fps;
}

/** The exact inclusive frame range used by a manifest render. */
export function performanceFramePlan(
  composition: Pick<VideoConfig, "durationInFrames" | "fps">,
  duration?: number,
): { frameRange: [number, number]; frames: number; durationSec: number } {
  if (duration !== undefined && (!Number.isFinite(duration) || duration <= 0)) {
    throw new Error("renderer: performance duration must be greater than zero");
  }
  const frames = Math.max(1, Math.min(
    composition.durationInFrames,
    duration === undefined ? composition.durationInFrames : Math.ceil(duration * composition.fps),
  ));
  return { frameRange: [0, frames - 1], frames, durationSec: frames / composition.fps };
}

function resolveManifestPath(manifestPath: string, path: string): string {
  return isAbsolute(path) ? path : resolve(dirname(manifestPath), path);
}

type AudioTake = { actor?: unknown; text?: unknown; audioPath?: unknown; timing?: { audioPath?: unknown; startSec?: unknown }; captions?: unknown };
export interface PerformanceAudioInput {
  path: string;
  startSec: number;
  gain?: number;
  durationSec?: number;
  loop?: boolean;
  cue?: string;
  kind?: "sfx" | "music" | "speech";
}
type UnresolvedPerformanceAudioInput = Omit<PerformanceAudioInput, "path">;

interface AudioCueAsset {
  kind: "sfx" | "music";
  path: string;
}

interface AudioCueCatalog {
  cues: Record<string, AudioCueAsset>;
}

function performanceSpeechStarts(manifest: PerformanceManifest): Array<{subject?: string; text?: string; start: number}> {
  const tracks = (manifest as unknown as {performanceTracks?: Array<{subject?: string; events?: Array<{kind?: string; start?: unknown; text?: unknown}>}>}).performanceTracks;
  return (tracks ?? []).flatMap((track) => (track.events ?? [])
    .filter((event) => event.kind === "speech" && typeof event.start === "number")
    .map((event) => ({subject: track.subject, text: typeof event.text === "string" ? event.text : undefined, start: event.start as number})));
}

function speechStartForTake(
  take: AudioTake,
  speeches: Array<{subject?: string; text?: string; start: number}>,
  used: Set<number>,
  fallbackIndex: number,
): number {
  const match = speeches.findIndex((speech, index) =>
    !used.has(index) && (typeof take.actor !== "string" || speech.subject === take.actor) &&
    (typeof take.text !== "string" || speech.text === take.text),
  );
  const index = match >= 0 ? match : fallbackIndex;
  if (index < speeches.length) used.add(index);
  return speeches[index]?.start ?? 0;
}

function readAudioCueCatalog(catalogPath: string): AudioCueCatalog {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(catalogPath, "utf8"));
  } catch (err) {
    throw new Error(`renderer: audio cue catalog ${catalogPath} is not valid JSON — ${(err as Error).message}`);
  }
  const cues = value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as {cues?: unknown}).cues
    : undefined;
  if (cues === null || typeof cues !== "object" || Array.isArray(cues)) {
    throw new Error(`renderer: audio cue catalog ${catalogPath} must contain a cues object`);
  }
  const parsed: Record<string, AudioCueAsset> = {};
  for (const [cue, raw] of Object.entries(cues as Record<string, unknown>)) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`renderer: audio cue catalog entry "${cue}" is invalid`);
    }
    const entry = raw as {kind?: unknown; path?: unknown};
    if ((entry.kind !== "sfx" && entry.kind !== "music") || typeof entry.path !== "string" || !entry.path) {
      throw new Error(`renderer: audio cue catalog entry "${cue}" needs kind and path`);
    }
    parsed[cue] = {kind: entry.kind, path: entry.path};
  }
  return {cues: parsed};
}

function performanceTracksForAudio(manifest: PerformanceManifest): Array<{subject?: string; events?: unknown[]}> {
  if (Array.isArray(manifest.performanceTracks) && manifest.performanceTracks.length) return manifest.performanceTracks as Array<{subject?: string; events?: unknown[]}>;
  return (manifest.sceneTrack ?? []).flatMap((scene) => (scene.performanceTracks ?? []) as Array<{subject?: string; events?: unknown[]}>);
}

function recordValue(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function timedValue(value: unknown, fps: number, timebase: PerformanceManifest["timebase"]): number | undefined {
  const number = finiteNumber(value);
  return number === undefined ? undefined : timebase === "frames" ? number / fps : number;
}

function performanceCueInputs(manifest: PerformanceManifest, manifestPath: string, catalogPath?: string): PerformanceAudioInput[] {
  const fps = manifest.video?.fps ?? 24;
  const timebase = manifest.timebase ?? "seconds";
  const tracks = performanceTracksForAudio(manifest);
  const audioTracks: UnresolvedPerformanceAudioInput[] = tracks.flatMap((track) => (track.events ?? []).flatMap((eventValue) => {
    const event = recordValue(eventValue);
    if (!event) return [];
    const eventStart = timedValue(event.start, fps, timebase) ?? 0;
    const eventEnd = timedValue(event.end, fps, timebase);
    return (Array.isArray(event.tracks) ? event.tracks : []).flatMap((trackValue) => {
      const track = recordValue(trackValue);
      if (!track || (track.kind !== "sfx" && track.kind !== "music")) return [];
      return (Array.isArray(track.events) ? track.events : []).flatMap((itemValue) => {
        const item = recordValue(itemValue);
        const value = recordValue(item?.value) ?? item;
        if (!item || !value) return [];
        const cue = typeof value.cue === "string" ? value.cue : undefined;
        if (!cue) return [];
        const kind: "sfx" | "music" = value.kind === "music" || track.kind === "music" ? "music" : "sfx";
        const absoluteFrame = finiteNumber(item.frame);
        const relativeAt = timedValue(item.at, fps, timebase) ?? 0;
        const startSec = absoluteFrame === undefined ? eventStart + relativeAt : absoluteFrame / fps;
        const durationSec = timedValue(value.duration ?? item.duration, fps, timebase) ?? (eventEnd === undefined ? undefined : Math.max(0, eventEnd - eventStart));
        const gain = finiteNumber(value.gain);
        const loop = value.loop === true;
        return [{cue, kind, startSec, ...(gain === undefined ? {} : {gain}), ...(durationSec === undefined ? {} : {durationSec}), ...(loop ? {loop} : {})} satisfies UnresolvedPerformanceAudioInput];
      });
    });
  }));
  if (!audioTracks.length) return [];

  const manifestRecord = manifest as unknown as Record<string, unknown>;
  const resolvedCatalogPath = catalogPath ?? (typeof manifestRecord.audioCueCatalog === "string"
    ? resolveManifestPath(manifestPath, manifestRecord.audioCueCatalog)
    : resolveManifestPath(manifestPath, "../../library/audio/catalog.json"));
  const catalog = readAudioCueCatalog(resolvedCatalogPath);
  return audioTracks.map((input) => {
    const asset = catalog.cues[input.cue!];
    if (!asset) throw new Error(`renderer: missing audio cue "${input.cue}" in ${resolvedCatalogPath}`);
    if (asset.kind !== input.kind) throw new Error(`renderer: audio cue "${input.cue}" is catalogued as ${asset.kind}, recipe requires ${input.kind}`);
    const path = resolveManifestPath(resolvedCatalogPath, asset.path);
    if (!existsSync(path)) throw new Error(`renderer: missing audio cue asset "${input.cue}" at ${path}`);
    return {...input, path};
  });
}

export function performanceAudioInputs(manifest: PerformanceManifest, manifestPath: string, catalogPath?: string): PerformanceAudioInput[] {
  const source = manifest as PerformanceManifest & {
    audioPath?: unknown;
    audio?: { audioPath?: unknown; path?: unknown; takes?: unknown } | string;
    preparation?: { audioPath?: unknown; path?: unknown; takes?: unknown };
  };
  const audioObject = typeof source.audio === "object" && source.audio !== null ? source.audio : undefined;
  const explicit = [source.audioPath, audioObject?.audioPath, audioObject?.path, source.preparation?.audioPath, source.preparation?.path]
    .find((value): value is string => typeof value === "string" && value.length > 0);
  const rawTakes = Array.isArray(audioObject?.takes)
    ? audioObject.takes as AudioTake[]
    : Array.isArray(source.preparation?.takes) ? source.preparation.takes as AudioTake[] : [];
  const speeches = performanceSpeechStarts(manifest);
  const usedSpeeches = new Set<number>();
  const takes: PerformanceAudioInput[] = rawTakes.flatMap((take, index) => {
    const path = typeof take.audioPath === "string" ? take.audioPath : take.timing?.audioPath;
    const preparedStart = typeof take.timing?.startSec === "number" ? take.timing.startSec : undefined;
    // yaml-audio preparation stores per-take timing relative to the take by
    // default; the compiled speech event supplies its absolute film start.
    const start = preparedStart && preparedStart > 0
      ? preparedStart
      : speechStartForTake(take, speeches, usedSpeeches, index) || preparedStart || 0;
    return typeof path === "string" && Number.isFinite(start) && start >= 0
      ? [{path: resolveManifestPath(manifestPath, path), startSec: start, kind: "speech" as const}]
      : [];
  });
  const base = explicit
    ? [{path: resolveManifestPath(manifestPath, explicit), startSec: 0, kind: "speech" as const}]
    : takes;
  return [...base, ...performanceCueInputs(manifest, manifestPath, catalogPath)];
}

/** Build the ffmpeg argv separately so timing and every mux input are testable. */
export function muxArguments(
  videoPath: string,
  audioInputs: PerformanceAudioInput[],
  captionsPath: string | undefined,
  outPath: string,
  durationSec: number,
): string[] {
  const haveAudio = audioInputs.length > 0;
  const haveSrt = captionsPath !== undefined;
  const args: string[] = ["-y", "-v", "error", "-i", videoPath];
  for (const input of audioInputs) args.push("-i", input.path);
  if (haveSrt) args.push("-i", captionsPath!);

  args.push("-map", "0:v:0");
  if (haveAudio) {
    const direct = audioInputs.length === 1 && audioInputs[0]!.startSec === 0 && audioInputs[0]!.gain === undefined &&
      audioInputs[0]!.durationSec === undefined && audioInputs[0]!.loop !== true;
    if (direct) {
      args.push("-map", "1:a:0");
    } else {
      const filters = audioInputs.map((input, index) => {
        const operations = [
          ...(input.loop === true ? ["aloop=loop=-1:size=2147483647"] : []),
          ...(input.durationSec === undefined ? [] : [`atrim=duration=${Math.max(0, input.durationSec)}`]),
          ...(input.gain === undefined ? [] : [`volume=${Math.max(0, input.gain)}`]),
          `adelay=${Math.max(0, Math.round(input.startSec * 1000))}:all=1`,
        ];
        return `[${index + 1}:a]${operations.join(",")} [a${index}]`.replace(/ \[/, "[");
      });
      filters.push(`${audioInputs.map((_input, index) => `[a${index}]`).join("")}amix=inputs=${audioInputs.length}:duration=longest:normalize=0[aout]`);
      args.push("-filter_complex", filters.join(";"), "-map", "[aout]");
    }
  }
  if (haveSrt) args.push("-map", `${1 + audioInputs.length}:s:0`);

  args.push("-c:v", "copy");
  if (haveAudio) args.push("-c:a", "aac", "-b:a", "160k");
  if (haveSrt) args.push("-c:s", "mov_text", "-metadata:s:s:0", "language=eng");
  args.push("-movflags", "+faststart", "-t", String(durationSec), outPath);
  return args;
}

function srtTimestamp(seconds: number): string {
  const millis = Math.max(0, Math.round(seconds * 1000));
  const hours = Math.floor(millis / 3_600_000);
  const minutes = Math.floor((millis % 3_600_000) / 60_000);
  const secs = Math.floor((millis % 60_000) / 1000);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")},${String(millis % 1000).padStart(3, "0")}`;
}

/** Exact voice captions from the preparation artifact, ready for ffmpeg. */
export function performanceSubtitles(manifest: PerformanceManifest): string {
  const source = manifest as PerformanceManifest & {audio?: {takes?: unknown}; preparation?: {takes?: unknown}};
  const takes = Array.isArray(source.audio?.takes)
    ? source.audio.takes as AudioTake[]
    : Array.isArray(source.preparation?.takes) ? source.preparation.takes as AudioTake[] : [];
  const speeches = performanceSpeechStarts(manifest);
  const usedSpeeches = new Set<number>();
  const entries = takes.flatMap((take, index) => {
    const preparedStart = typeof take.timing?.startSec === "number" ? take.timing.startSec : undefined;
    const captions = Array.isArray(take.captions) ? take.captions as Array<{startSec?: unknown; endSec?: unknown; text?: unknown}> : [];
    const offset = preparedStart && preparedStart > 0
      ? 0
      : speechStartForTake(take, speeches, usedSpeeches, index);
    return captions.filter((caption) => typeof caption.startSec === "number" && typeof caption.endSec === "number" && typeof caption.text === "string")
      .map((caption) => ({start: offset + (caption.startSec as number), end: offset + (caption.endSec as number), text: caption.text as string}));
  });
  if (!entries.length) {
    const timed = (manifest.subtitles ?? manifest.subtitleTrack ?? manifest.captions ?? []).flatMap((subtitle) => {
      const start = subtitle.startFrame ?? subtitle.start ?? 0;
      const end = subtitle.endFrame ?? subtitle.end ?? (subtitle.durationFrames ? start + subtitle.durationFrames : subtitle.duration ? start + subtitle.duration : undefined);
      const inFrames = manifest.timebase === "frames" || subtitle.startFrame !== undefined || subtitle.endFrame !== undefined;
      return typeof end === "number" && typeof subtitle.text === "string"
        ? [{start: inFrames ? start / (manifest.video?.fps ?? 24) : start, end: inFrames ? end / (manifest.video?.fps ?? 24) : end, text: subtitle.text}]
        : [];
    });
    entries.push(...timed);
  }
  entries.sort((a, b) => a.start - b.start);
  return entries.map((entry, index) => `${index + 1}\n${srtTimestamp(entry.start)} --> ${srtTimestamp(entry.end)}\n${entry.text}\n`).join("\n");
}

async function preparePerformance(manifestPath: string, requestedFps?: number): Promise<PreparedPerformance> {
  const source = readPerformanceManifest(manifestPath);
  const fps = performanceFps(source, requestedFps);
  const sourceFps = source.video?.fps ?? 24;
  const sourceDurationSec = source.duration ?? source.total ?? source.totalDuration ??
    (source.durationInFrames === undefined ? undefined : source.durationInFrames / sourceFps);
  const manifest = {
    ...source,
    video: {...source.video, fps},
    ...(sourceDurationSec === undefined ? {} : {durationInFrames: Math.max(1, Math.round(sourceDurationSec * fps))}),
  } as PerformanceManifest;
  const key = hashString(JSON.stringify({manifestPath, manifest}));
  const cached = performanceCompCache.get(key);
  if (cached) return cached;

  const browserExecutable = localBrowser();
  if (!browserExecutable) await ensureBrowser({ chromeMode: CHROME_MODE });
  const serve = await serveUrl();
  const composition = await selectComposition({
    serveUrl: serve,
    id: PERFORMANCE_COMPOSITION_ID,
    inputProps: {manifest},
    chromeMode: CHROME_MODE,
    chromiumOptions: CHROMIUM_OPTIONS,
    ...(browserExecutable ? {browserExecutable} : {}),
  });
  const prepared = {manifest, composition, serve, fps};
  performanceCompCache.set(key, prepared);
  return prepared;
}

/** ffmpeg mux: silent video + mix.wav (+ soft captions) capped at `-t total`. */
async function mux(
  videoPath: string,
  audioInputs: PerformanceAudioInput[],
  captionsPath: string | undefined,
  outPath: string,
  durationSec: number,
): Promise<void> {
  const inputs = audioInputs.map((input) => {
    if (!existsSync(input.path)) throw new Error(`renderer: missing audio input ${input.path}`);
    return input;
  });
  const args = muxArguments(videoPath, inputs, captionsPath && existsSync(captionsPath) ? captionsPath : undefined, outPath, durationSec);
  await execa("ffmpeg", args, { stdio: "inherit" });
}

const adapter: RendererAdapter = {
  id: ID,
  async renderManifest(req): Promise<RenderReport> {
    lastProgress = -1;
    const p = await preparePerformance(req.manifestPath, req.fps);
    const plan = performanceFramePlan(p.composition, req.duration);
    const browserExecutable = localBrowser();
    mkdirSync(dirname(req.outPath), { recursive: true });
    const silent = join(tmpdir(), `anim-performance-${hashString(req.outPath).slice(0, 12)}.mp4`);
    const subtitles = performanceSubtitles(p.manifest);
    const audio = performanceAudioInputs(p.manifest, req.manifestPath);
    const scale = req.scale === undefined
      ? undefined
      : Math.round(p.composition.height * req.scale) / p.composition.height;
    const subtitlePath = subtitles ? join(tmpdir(), `anim-performance-${hashString(`${req.outPath}:srt`).slice(0, 12)}.srt`) : undefined;
    let actualRenderedFrames = 0;
    if (subtitlePath) writeFileSync(subtitlePath, subtitles);
    try {
      await renderMedia({
        serveUrl: p.serve,
        composition: {...p.composition, durationInFrames: plan.frames},
        codec: "h264",
        outputLocation: silent,
        inputProps: {manifest: p.manifest},
        crf: req.crf,
        // The manifest API calls this threads: it is the Remotion renderer's
        // concurrency, with no hidden cap or fallback.
        concurrency: req.threads,
        offthreadVideoCacheSizeInBytes: OFFTHREAD_CACHE_BYTES,
        offthreadVideoThreads: 2,
        frameRange: plan.frameRange,
        ...(scale ? {scale} : {}),
        hardwareAcceleration: "if-possible" as const,
        chromeMode: CHROME_MODE,
        chromiumOptions: CHROMIUM_OPTIONS,
        ...(browserExecutable ? {browserExecutable} : {}),
        muted: true,
        overwrite: true,
        onProgress: ({renderedFrames, encodedFrames, progress}) => {
          actualRenderedFrames = Math.max(actualRenderedFrames, renderedFrames);
          const done = Math.max(renderedFrames, encodedFrames);
          const pct = Math.floor(progress * 100);
          if (pct !== lastProgress) {
            lastProgress = pct;
            process.stderr.write(`render: ${pct}% (${done}/${plan.frames} frames)\n`);
          }
        },
      });
      await mux(silent, audio, subtitlePath, req.outPath, plan.durationSec);
    } finally {
      if (subtitlePath && existsSync(subtitlePath)) unlinkSync(subtitlePath);
      if (existsSync(silent)) unlinkSync(silent);
    }
    return {outPath: req.outPath, frames: actualRenderedFrames || plan.frames, durationSec: plan.durationSec};
  },

  async doctor(): Promise<Check[]> {
    const checks: Check[] = [];

    // Studio entry resolvable.
    try {
      const entry = studioEntry();
      checks.push({ name: `renderer:${ID} studio entry`, ok: true, detail: entry });
    } catch (err) {
      checks.push(
        notReadyCheck(
          `renderer:${ID}`,
          `studio Remotion entry not resolvable: ${(err as Error).message}`,
          "Ensure @anim/studio is installed and exposes ./remotion-entry.",
        ),
      );
    }

    // ffmpeg present (mux).
    try {
      await execa("ffmpeg", ["-version"]);
      checks.push({ name: `renderer:${ID} ffmpeg`, ok: true, detail: "ffmpeg on PATH" });
    } catch {
      checks.push(notReadyCheck(`renderer:${ID}`, "ffmpeg not found on PATH.", "Install ffmpeg 8.x (brew install ffmpeg)."));
    }

    // Headless browser is fetched on first render (ensureBrowser); doctor only
    // advises so it never triggers a multi-hundred-MB download as a side effect.
    checks.push({
      name: `renderer:${ID} chromium`,
      ok: true,
      detail: "Remotion fetches its headless Chromium on first render (or 'npx remotion browser ensure').",
    });

    return checks;
  },
};

export default { kind: "renderer", adapter } satisfies AdapterRegistration;
