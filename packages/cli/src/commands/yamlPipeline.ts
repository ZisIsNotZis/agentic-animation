import { existsSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  compileEpisode as coreCompileEpisode,
  createProcedureResolver,
  hashJson,
  loadAssetRegistry as coreLoadAssetRegistry,
  loadNarrowEpisode,
  readJson,
  synchronizeYamlAudioStarts,
  segmentYamlAudio,
  yamlAudioSourceFromEpisode,
  writeGenerated,
  YamlAudioPreparationSchema,
  resolvePath,
  type AssetRegistry,
  type CompiledEpisode,
  type ProcedureResolver,
  type RenderReport,
  type SpeechTimingProvider,
  type YamlAudioPreparationArtifact,
} from "@anim/core";
import type { RendererAdapter } from "@anim/core";
import type { StageContext } from "../runtime/context";
import { assembleYamlAudio, yamlAudioStage } from "./yamlAudio";
import { stageNow } from "./audioSupport";

export const YAML_PERFORMANCE_MANIFEST_NAME = "performance.json";
export const YAML_AUDIO_ARTIFACT_NAME = "yaml-audio.json";

export interface YamlMakeOptions {
  provider?: string;
  synthesizeUnmatched?: boolean;
}

export interface YamlRenderOptions {
  threads?: number;
  duration?: number;
  scale?: number;
  fps?: number;
  crf?: number;
  force?: boolean;
}

export interface YamlRenderRequest {
  manifestPath: string;
  outPath: string;
  fps: number;
  crf: number;
  threads: number;
  duration?: number;
  scale?: number;
  force?: boolean;
}

export interface YamlPipelineDependencies {
  loadAssetRegistry?: (libraryRoot: string) => Promise<AssetRegistry>;
  compileEpisode?: typeof coreCompileEpisode;
  prepareAudio?: (
    ctx: StageContext,
    episodePath: string,
    provider?: string,
  ) => Promise<YamlAudioPreparationArtifact>;
  speechTimingProvider?: SpeechTimingProvider;
  renderManifest?: (ctx: StageContext, request: YamlRenderRequest) => Promise<RenderReport>;
  /** Compiler timing seam for procedure implementations, never guessed by CLI. */
  procedureResolver?: ProcedureResolver;
  now?: () => string;
}

export interface YamlCheckResult {
  episodePath: string;
  episodeId: string;
  scenes: number;
  spokenTakes: number;
}

export interface YamlMakeResult extends YamlCheckResult {
  audioPath: string;
  manifestPath: string;
  totalDuration: number;
}

export interface YamlRenderResult extends YamlMakeResult {
  rendered: boolean;
  outPath?: string;
  report?: RenderReport;
}

interface ResolvedEpisode {
  path: string;
  dir: string;
  slug: string;
  episode: Awaited<ReturnType<typeof loadNarrowEpisode>>;
}

/** Resolve the author input without making the caller cd into the project. */
export async function resolveYamlEpisode(ctx: StageContext, input: string): Promise<ResolvedEpisode> {
  const candidates = [resolve(ctx.rootDir, input), resolve(process.cwd(), input)];
  const path = candidates.find((candidate) => existsSync(candidate));
  if (!path) throw new Error(`yaml: episode file does not exist: ${candidates[0]}`);
  if (basename(path) !== "episode.yml") {
    throw new Error(`yaml: canonical input must be named episode.yml (got ${path})`);
  }
  const episode = await loadNarrowEpisode(path);
  return { path, dir: dirname(path), slug: basename(dirname(path)), episode };
}

/** Validate YAML, immutable assets, procedure contracts, and compiler state. */
export async function checkYamlEpisode(
  ctx: StageContext,
  input: string,
  deps: YamlPipelineDependencies = {},
): Promise<YamlCheckResult> {
  const resolved = await resolveYamlEpisode(ctx, input);
  const registry = await (deps.loadAssetRegistry ?? coreLoadAssetRegistry)(libraryDir(ctx));
  const checkProcedures = createProcedureResolver({registry});
  const compiled = await (deps.compileEpisode ?? coreCompileEpisode)(resolved.path, {
    registry,
    resolver: deps.procedureResolver ?? checkProcedures.resolve.bind(checkProcedures),
    speechTiming: deps.speechTimingProvider ?? dryRunSpeechTiming,
  });
  const result = resultOf(resolved, compiled, spokenTakeCount(resolved));
  process.stdout.write(
    `check: OK ${resolved.path} (${result.scenes} scene(s), ${result.spokenTakes} spoken take(s))\n`,
  );
  return result;
}

/** Prepare measured audio, then compile the one renderer-neutral manifest. */
export async function makeYamlEpisode(
  ctx: StageContext,
  input: string,
  opts: YamlMakeOptions = {},
  deps: YamlPipelineDependencies = {},
): Promise<YamlMakeResult> {
  const resolved = await resolveYamlEpisode(ctx, input);
  const registry = await (deps.loadAssetRegistry ?? coreLoadAssetRegistry)(libraryDir(ctx));
  let preparation = await (deps.prepareAudio ?? prepareYamlAudio)(ctx, resolved.path, opts.provider, opts.synthesizeUnmatched);
  if (preparation.unmatchedCount) {
    throw new Error(
      `make: ${preparation.unmatchedCount} YAML speech take(s) have no exact source audio; ` +
      "rerun with --synthesize-unmatched or provide exact legacy takes",
    );
  }
  const timing = deps.speechTimingProvider ?? speechTimingFromPreparation(preparation);
  const procedures = createProcedureResolver({registry});
  const procedureResolver = deps.procedureResolver ?? procedures.resolve.bind(procedures);
  const compiled = await (deps.compileEpisode ?? coreCompileEpisode)(resolved.path, {
    registry,
    resolver: procedureResolver,
    speechTiming: timing,
  });
  const starts = speechStarts(preparation, compiled);
  preparation = synchronizeYamlAudioStarts(preparation, starts);
  const audioPath = preparation.takes.some((take) => take.audioPath)
    ? await assembleYamlAudio(resolved.dir, preparation, compiled.totalDuration)
    : "";
  preparation = { ...preparation, ...(audioPath ? {mixPath: audioPath} : {}) };
  writeGenerated(join(resolved.dir, "audio", YAML_AUDIO_ARTIFACT_NAME), YamlAudioPreparationSchema, preparation, {
    stage: "yaml-audio",
    tool: "yaml-audio-migration",
    at: deps.now?.() ?? stageNow(),
    inputs: { episode: resolved.episode, provider: opts.provider ?? ctx.config.adapters.tts, starts, totalDuration: compiled.totalDuration },
  });
  const manifestPath = join(resolved.dir, YAML_PERFORMANCE_MANIFEST_NAME);
  const manifest = performanceManifest(ctx, resolved, compiled, preparation, deps.now?.() ?? stageNow());
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  const result = resultOf(resolved, compiled, preparation.takes.length, {
    audioPath,
    manifestPath,
    totalDuration: compiled.totalDuration,
  });
  process.stdout.write(`make: wrote ${manifestPath} (${compiled.totalDuration.toFixed(3)}s)\n`);
  return result;
}

/** Prepare/check and render a short QA preview when a manifest renderer exists. */
export async function previewYamlEpisode(
  ctx: StageContext,
  input: string,
  deps: YamlPipelineDependencies = {},
): Promise<YamlRenderResult> {
  const made = await makeYamlEpisode(ctx, input, {}, deps);
  const outPath = join(dirname(made.manifestPath), "dist", `${basename(dirname(made.manifestPath))}-preview.mp4`);
  const report = await renderYamlManifest(ctx, made, {duration: 5, force: true}, deps, outPath, true);
  if (!report) {
    process.stdout.write(`preview: prepared ${made.manifestPath}; manifest renderer is not installed\n`);
    return {...made, rendered: false};
  }
  process.stdout.write(`preview: wrote ${report.outPath}\n`);
  return {...made, rendered: true, outPath: report.outPath, report};
}

/** Prepare/check and render the canonical performance manifest. */
export async function renderYamlEpisode(
  ctx: StageContext,
  input: string,
  opts: YamlRenderOptions = {},
  deps: YamlPipelineDependencies = {},
): Promise<YamlRenderResult> {
  const made = await makeYamlEpisode(ctx, input, {}, deps);
  const outPath = join(dirname(made.manifestPath), "dist", `${basename(dirname(made.manifestPath))}.mp4`);
  const report = await renderYamlManifest(ctx, made, opts, deps, outPath, false);
  if (!report) throw manifestRendererMissing();
  process.stdout.write(`render-yaml: wrote ${report.outPath} (${report.frames} frames)\n`);
  return {...made, rendered: true, outPath: report.outPath, report};
}

async function prepareYamlAudio(
  ctx: StageContext,
  episodePath: string,
  provider?: string,
  synthesizeUnmatched?: boolean,
): Promise<YamlAudioPreparationArtifact> {
  const resolved = await resolveYamlEpisode(ctx, episodePath);
  const audioContext: StageContext = {
    ...ctx,
    rootDir: dirname(resolved.dir),
    config: {
      ...ctx.config,
      paths: {
        ...ctx.config.paths,
        episodes: ".",
      },
    },
  };
  await yamlAudioStage(audioContext, {
    episode: resolved.slug,
    ...(provider ? {provider} : {}),
    ...(synthesizeUnmatched ? {synthesizeUnmatched: true} : {}),
  });
  return readJson(join(resolved.dir, "audio", YAML_AUDIO_ARTIFACT_NAME), YamlAudioPreparationSchema);
}

async function renderYamlManifest(
  ctx: StageContext,
  made: YamlMakeResult,
  opts: YamlRenderOptions,
  deps: YamlPipelineDependencies,
  outPath: string,
  optional: boolean,
): Promise<RenderReport | undefined> {
  validateRenderOptions(opts);
  const request: YamlRenderRequest = {
    manifestPath: made.manifestPath,
    outPath,
    fps: opts.fps ?? ctx.config.video.fps,
    crf: opts.crf ?? ctx.config.video.crf,
    threads: opts.threads ?? ctx.config.render.concurrency,
    ...(opts.duration !== undefined ? {duration: opts.duration} : {}),
    ...(opts.scale !== undefined ? {scale: opts.scale} : {}),
    ...(opts.force !== undefined ? {force: opts.force} : {}),
  };
  if (deps.renderManifest) return deps.renderManifest(ctx, request);
  const renderer = ctx.registry.find("renderer", ctx.config.adapters.renderer) as (RendererAdapter & {
    renderManifest?: (request: YamlRenderRequest) => Promise<RenderReport>;
  }) | undefined;
  if (renderer?.renderManifest) return renderer.renderManifest(request);
  if (optional) return undefined;
  return undefined;
}

function validateRenderOptions(opts: YamlRenderOptions): void {
  if (opts.threads !== undefined && (!Number.isInteger(opts.threads) || opts.threads < 1)) {
    throw new Error("render-yaml: --threads must be a positive integer");
  }
  if (opts.duration !== undefined && (!Number.isFinite(opts.duration) || opts.duration <= 0)) {
    throw new Error("render-yaml: --duration must be greater than zero");
  }
  if (opts.scale !== undefined && (!Number.isFinite(opts.scale) || opts.scale <= 0)) {
    throw new Error("render-yaml: --scale must be greater than zero");
  }
  if (opts.fps !== undefined && (!Number.isInteger(opts.fps) || opts.fps < 1)) {
    throw new Error("render-yaml: --fps must be a positive integer");
  }
  if (opts.crf !== undefined && (!Number.isInteger(opts.crf) || opts.crf < 0 || opts.crf > 51)) {
    throw new Error("render-yaml: --crf must be an integer from 0 to 51");
  }
}

function performanceManifest(
  ctx: StageContext,
  resolved: ResolvedEpisode,
  compiled: CompiledEpisode,
  preparation: YamlAudioPreparationArtifact,
  at: string,
): Record<string, unknown> {
  return {
    version: 1,
    timebase: "seconds",
    video: ctx.config.video,
    duration: compiled.totalDuration,
    total: compiled.totalDuration,
    ...compiled,
    audio: preparation,
    generatedBy: {
      stage: "yaml-make",
      tool: "@anim/core/compileEpisode",
      at,
      inputHash: hashJson({episode: resolved.episode, audio: preparation}),
    },
  };
}

function speechStarts(preparation: YamlAudioPreparationArtifact, compiled: CompiledEpisode): Record<string, number> {
  const result: Record<string, number> = {};
  const takesByScene = new Map<string, typeof preparation.takes>();
  for (const take of preparation.takes) takesByScene.set(take.sceneId, [...(takesByScene.get(take.sceneId) ?? []), take]);
  for (const scene of compiled.sceneTrack) {
    const speech = scene.performanceTracks.flatMap((track) => track.events)
      .filter((event): event is Extract<typeof event, {kind: "speech"}> => event.kind === "speech")
      .sort((a, b) => a.start - b.start);
    for (const [index, event] of speech.entries()) {
      const take = takesByScene.get(scene.id)?.[index];
      if (take) result[take.id] = event.start;
    }
  }
  return result;
}

function resultOf(
  resolved: ResolvedEpisode,
  compiled: CompiledEpisode,
  spokenTakes: number,
  extra: Partial<YamlMakeResult> = {},
): YamlMakeResult {
  return {
    episodePath: resolved.path,
    episodeId: compiled.episode.id,
    scenes: resolved.episode.scenes.length,
    spokenTakes,
    audioPath: extra.audioPath ?? "",
    manifestPath: extra.manifestPath ?? "",
    totalDuration: extra.totalDuration ?? compiled.totalDuration,
  };
}

function libraryDir(ctx: StageContext): string {
  return resolvePath(ctx.rootDir, ctx.config.paths.library);
}

function spokenTakeCount(resolved: ResolvedEpisode): number {
  return segmentYamlAudio(yamlAudioSourceFromEpisode(resolved.episode)).length;
}

const dryRunSpeechTiming: SpeechTimingProvider = (request) => ({
  durationSec: 1,
  markers: Object.fromEntries(request.inlineTokens.map((token) => [token, 0])),
});

function speechTimingFromPreparation(preparation: YamlAudioPreparationArtifact): SpeechTimingProvider {
  const byId = new Map(preparation.takes.map((take) => [take.id, take]));
  return (request) => {
    const take = byId.get(request.lineId);
    if (!take) throw new Error(`make: audio preparation has no take for ${request.lineId}`);
    const markers: Record<string, number> = {};
    for (const event of take.inlineEvents) {
      if (event.atSec === null) {
        throw new Error(
          `make: audio take ${take.id} has no alignment for inline event at source offset ${event.sourceStart}; ` +
            "use an alignment-capable TTS provider",
        );
      }
      const relative = Math.max(0, Math.min(take.durationSec, event.atSec - take.timing.startSec));
      markers[event.name] = relative;
    }
    return {durationSec: take.durationSec, markers};
  };
}

function manifestRendererMissing(): Error {
  return new Error(
    "render-yaml: no renderer exposing renderManifest(manifestPath, ...) is registered",
  );
}
