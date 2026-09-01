import type { NarrowEpisode } from "../schemas/narrowEpisode";
import { parseProcedureCall, parseProcedureCalls, type ProcedureCall } from "../schemas/narrowEpisode";
import { hashJson } from "../util/hash";
import { z } from "zod";
import { GeneratedBySchema } from "../schemas/common";

export type YamlAudioStatement =
  { actor: string; text: string };

export interface YamlAudioActor { voice: string; }

export interface YamlAudioScene {
  id: string;
  script: readonly YamlAudioStatement[];
}

export interface YamlAudioSource {
  episodeId: string;
  actors: Readonly<Record<string, YamlAudioActor>>;
  scenes: readonly YamlAudioScene[];
}

export interface YamlAudioUnmatched {
  id: string;
  sceneId: string;
  statementIndex: number;
  actor: string;
  text: string;
  chunkIndex?: number;
  reason: "no-exact-reuse";
}

export interface RemovedInlineToken {
  kind: "call" | "cue";
  raw: string;
  start: number;
  end: number;
  /** Offset in the cleaned string where this zero-width event occurs. */
  cleanStart: number;
}

export interface CleanTextSegment {
  sourceStart: number;
  sourceEnd: number;
  cleanStart: number;
  cleanEnd: number;
}

export interface CleanedSpokenText {
  /** Exact source text after removing only strict calls and #cues. */
  text: string;
  removed: RemovedInlineToken[];
  /** Piecewise map for the source characters that remain in `text`. */
  segments: CleanTextSegment[];
}

export interface BoundaryAlignment {
  kind: "word" | "character";
  /** The aligned word/segment when the provider reports text instead of offsets. */
  text?: string;
  startSec: number;
  endSec: number;
  /** Preferred: offsets in the cleaned spoken string. */
  startChar?: number;
  endChar?: number;
}

export interface TtsSynthesisResult {
  path: string;
  durationSec: number;
  boundaries?: readonly BoundaryAlignment[];
}

export const BoundaryAlignmentSchema = z.object({
  kind: z.enum(["word", "character"]),
  text: z.string().min(1).optional(),
  startSec: z.number().finite().nonnegative(),
  endSec: z.number().finite().nonnegative(),
  startChar: z.number().int().nonnegative().optional(),
  endChar: z.number().int().nonnegative().optional(),
}).superRefine((boundary, ctx) => {
  if (boundary.text === undefined && boundary.startChar === undefined && boundary.endChar === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "a boundary needs text or character offsets" });
  }
  if (boundary.endSec < boundary.startSec) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endSec"], message: "endSec must be >= startSec" });
  }
  if (boundary.startChar !== undefined && boundary.endChar !== undefined && boundary.endChar < boundary.startChar) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endChar"], message: "endChar must be >= startChar" });
  }
});

export interface TtsMeasurement {
  /** Measured duration of the final audio take, in seconds. */
  durationSec: number;
  /** Optional absolute start for callers that already assembled the take. */
  startSec?: number;
  /** Provider-supplied word or character boundaries, relative to the take. */
  boundaries?: readonly BoundaryAlignment[];
  /** Audio path is carried through for the downstream lip-sync adapter. */
  audioPath?: string;
}

export const TtsMeasurementSchema = z.object({
  durationSec: z.number().finite().nonnegative(),
  startSec: z.number().finite().nonnegative().optional(),
  boundaries: z.array(BoundaryAlignmentSchema).optional(),
  audioPath: z.string().min(1).optional(),
});

/** Normalize a TTS adapter result at the audio seam. */
export function measuredTts(result: TtsSynthesisResult): TtsMeasurement {
  return {
    audioPath: result.path,
    durationSec: result.durationSec,
    ...(result.boundaries ? { boundaries: result.boundaries } : {}),
  };
}

export type YamlAudioMeasurements =
  | Readonly<Record<string, TtsMeasurement | number | undefined>>
  | ReadonlyMap<string, TtsMeasurement | number | undefined>;

export type YamlAudioAlignmentEntry =
  | readonly BoundaryAlignment[]
  | { readonly boundaries: readonly BoundaryAlignment[] };

/** Alignment JSON may use a bare boundary array or `{boundaries: [...]}` per take. */
export type YamlAudioAlignments = Readonly<Record<string, YamlAudioAlignmentEntry>>;

export const YamlAudioAlignmentEntrySchema = z.union([
  z.array(BoundaryAlignmentSchema),
  z.object({ boundaries: z.array(BoundaryAlignmentSchema) }).strict(),
]);

export const YamlAudioAlignmentsSchema = z.record(YamlAudioAlignmentEntrySchema);

export function alignmentForTake(
  alignments: YamlAudioAlignments | undefined,
  takeId: string,
  cacheKey?: string,
): readonly BoundaryAlignment[] | undefined {
  const entry = alignments?.[takeId] ?? (cacheKey ? alignments?.[cacheKey] : undefined);
  if (!entry) return undefined;
  if (Array.isArray(entry)) return entry as readonly BoundaryAlignment[];
  return (entry as { readonly boundaries: readonly BoundaryAlignment[] }).boundaries;
}

export interface YamlAudioPreparationOptions {
  /** Fallback for sources that do not carry a per-actor cast voice. */
  voiceAsset?: string;
  profile: string;
  compilerVersion: string;
  /** Entries may be keyed by stable take id or by the composite cache key. */
  measurements?: YamlAudioMeasurements;
  /** Test/offline input for a measured duration when no audio result is available. */
  durations?: Readonly<Record<string, number>>;
  /** Keep a migration artifact for measured statements when other lines miss. */
  allowUnmeasured?: boolean;
  /** Duration contributed by one `…` in an ellipsis-only statement. */
  ellipsisBeatSec?: number;
  /** Alias used by callers that name the value after the DSL wording. */
  standardBeatSec?: number;
}

export interface PreparedInlineEvent {
  kind: "call" | "cue";
  /** Procedure name or literal #cue name. */
  name: string;
  sourceStart: number;
  cleanStart: number;
  /** Absolute take time when alignment resolves it; null means unresolved. */
  atSec: number | null;
}

export interface PreparedCaption {
  startSec: number;
  endSec: number;
  /** Must equal the complete cleaned spoken text for this take. */
  text: string;
}

export interface PreparedLipSyncTiming {
  text: string;
  audioPath?: string;
  startSec: number;
  endSec: number;
  /** Boundaries stay relative to the take, matching existing lip-sync adapters. */
  boundaries: BoundaryAlignment[];
}

export interface PreparedTakeTiming {
  text: string;
  audioPath?: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  boundaries: BoundaryAlignment[];
  inlineEvents: PreparedInlineEvent[];
}

export interface PreparedYamlAudioTake {
  id: string;
  lineId: string;
  sceneId: string;
  statementIndex: number;
  chunkIndex: number;
  /** Ordinal among spoken statements in this scene. */
  spokenIndex: number;
  actor: string;
  voiceAsset: string;
  profile: string;
  compilerVersion: string;
  cacheKey: string;
  sourceText: string;
  text: string;
  /** True for an ellipsis-only source segment; it has timing but no speech. */
  silence: boolean;
  speed: number;
  /** Start relative to the containing dialogue line before compiler sync. */
  relativeStartSec: number;
  /** Set for an actor.say interruption nested in another actor's statement. */
  interruptOf?: string;
  durationSec: number;
  audioPath?: string;
  cleaned: CleanedSpokenText;
  /** The one timing object from which all three downstream views derive. */
  timing: PreparedTakeTiming;
  captions: PreparedCaption[];
  lipSync: PreparedLipSyncTiming;
  inlineEvents: PreparedInlineEvent[];
}

export interface YamlAudioPreparation {
  episodeId: string;
  profile: string;
  compilerVersion: string;
  takes: PreparedYamlAudioTake[];
  /** Relative or absolute canonical mixed voice WAV, written after compile. */
  mixPath?: string;
  reuseCount?: number;
  unmatchedCount?: number;
  unmatched?: YamlAudioUnmatched[];
  audioPath?: string;
}

export const CleanedSpokenTextSchema = z.object({
  text: z.string(),
  removed: z.array(z.object({
    kind: z.enum(["call", "cue"]),
    raw: z.string(),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
    cleanStart: z.number().int().nonnegative(),
  })),
  segments: z.array(z.object({
    sourceStart: z.number().int().nonnegative(),
    sourceEnd: z.number().int().nonnegative(),
    cleanStart: z.number().int().nonnegative(),
    cleanEnd: z.number().int().nonnegative(),
  })),
});

export const PreparedInlineEventSchema = z.object({
  kind: z.enum(["call", "cue"]),
  name: z.string().min(1),
  sourceStart: z.number().int().nonnegative(),
  cleanStart: z.number().int().nonnegative(),
  atSec: z.number().finite().nonnegative().nullable(),
});

const PreparedBoundarySchema = BoundaryAlignmentSchema;
export const PreparedTimingSchema = z.object({
  text: z.string(),
  audioPath: z.string().min(1).optional(),
  startSec: z.number().finite().nonnegative(),
  endSec: z.number().finite().nonnegative(),
  durationSec: z.number().finite().nonnegative(),
  boundaries: z.array(PreparedBoundarySchema),
  inlineEvents: z.array(PreparedInlineEventSchema),
}).superRefine((timing, ctx) => {
  if (timing.endSec < timing.startSec || Math.abs((timing.endSec - timing.startSec) - timing.durationSec) > 1e-9) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endSec"], message: "timing end/start/duration do not agree" });
  }
});

export const PreparedCaptionSchema = z.object({
  startSec: z.number().finite().nonnegative(),
  endSec: z.number().finite().nonnegative(),
  text: z.string().min(1),
});

export const PreparedLipSyncTimingSchema = z.object({
  text: z.string(),
  audioPath: z.string().min(1).optional(),
  startSec: z.number().finite().nonnegative(),
  endSec: z.number().finite().nonnegative(),
  boundaries: z.array(PreparedBoundarySchema),
});

export const PreparedYamlAudioTakeSchema = z.object({
  id: z.string().min(1),
  lineId: z.string().min(1),
  sceneId: z.string().min(1),
  statementIndex: z.number().int().nonnegative(),
  chunkIndex: z.number().int().nonnegative(),
  spokenIndex: z.number().int().nonnegative(),
  actor: z.string().min(1),
  voiceAsset: z.string().min(1),
  profile: z.string().min(1),
  compilerVersion: z.string().min(1),
  cacheKey: z.string().regex(/^[a-f0-9]{64}$/),
  sourceText: z.string(),
  text: z.string(),
  silence: z.boolean(),
  speed: z.number().finite().positive(),
  relativeStartSec: z.number().finite().nonnegative(),
  interruptOf: z.string().min(1).optional(),
  durationSec: z.number().finite().nonnegative(),
  audioPath: z.string().min(1).optional(),
  cleaned: CleanedSpokenTextSchema,
  timing: PreparedTimingSchema,
  captions: z.array(PreparedCaptionSchema),
  lipSync: PreparedLipSyncTimingSchema,
  inlineEvents: z.array(PreparedInlineEventSchema),
}).superRefine((take, ctx) => {
  if (take.timing.text !== take.text) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["timing", "text"], message: "timing text must equal cleaned text" });
  if (!nearlyEqual(take.timing.durationSec, take.durationSec)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["timing", "durationSec"], message: "timing duration must equal take duration" });
  if (take.lipSync.text !== take.text) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["lipSync", "text"], message: "lip-sync text must equal cleaned text" });
  if (take.captions.length !== (take.text && !take.silence ? 1 : 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["captions"], message: "a take must have one full voice caption or none for empty text" });
  } else if (take.text && !take.silence && take.captions[0]?.text !== take.text) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["captions", 0, "text"], message: "caption text must equal cleaned text" });
  }
  if (take.inlineEvents.length !== take.timing.inlineEvents.length || !take.inlineEvents.every((event, index) => sameInlineEvent(event, take.timing.inlineEvents[index]!))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["inlineEvents"], message: "inline events must come from timing" });
  }
});

/** Persisted, generated speech-preparation artifact for future audio stages. */
export const YamlAudioPreparationSchema = z.object({
  generatedBy: GeneratedBySchema.optional(),
  episodeId: z.string().min(1),
  profile: z.string().min(1),
  compilerVersion: z.string().min(1),
  takes: z.array(PreparedYamlAudioTakeSchema),
  mixPath: z.string().min(1).optional(),
  reuseCount: z.number().int().nonnegative().optional(),
  unmatchedCount: z.number().int().nonnegative().optional(),
  unmatched: z.array(z.object({
    id: z.string().min(1),
    sceneId: z.string().min(1),
    statementIndex: z.number().int().nonnegative(),
    actor: z.string().min(1),
    text: z.string(),
    chunkIndex: z.number().int().nonnegative().optional(),
    reason: z.literal("no-exact-reuse"),
  })).optional(),
  audioPath: z.string().min(1).optional(),
}).strict();
export type YamlAudioPreparationArtifact = z.infer<typeof YamlAudioPreparationSchema>;

const CUE = /^#[^\s{}(),]+$/u;

/**
 * Remove only strict inline procedure calls and #cues. All other braces are
 * spoken text and remain byte-for-byte unchanged. Offsets are JS string
 * offsets (UTF-16 code units), the same convention used by `String#slice`.
 */
export function cleanSpokenText(source: string): CleanedSpokenText {
  const removed: RemovedInlineToken[] = [];
  const segments: CleanTextSegment[] = [];
  let text = "";
  let sourceCursor = 0;

  for (let i = 0; i < source.length; i++) {
    if (source[i] !== "{") continue;
    const close = source.indexOf("}", i + 1);
    if (close < 0) continue;
    const raw = source.slice(i, close + 1);
    const token = source.slice(i + 1, close).trim();
    const kind = CUE.test(token) ? "cue" : parseProcedureCalls(token) ? "call" : undefined;
    if (!kind) continue;

    appendSegment(source, sourceCursor, i, text, segments);
    text += source.slice(sourceCursor, i);
    removed.push({ kind, raw, start: i, end: close + 1, cleanStart: text.length });
    sourceCursor = close + 1;
    i = close;
  }

  appendSegment(source, sourceCursor, source.length, text, segments);
  text += source.slice(sourceCursor);
  return { text, removed, segments };
}

function appendSegment(
  source: string,
  sourceStart: number,
  sourceEnd: number,
  cleanText: string,
  segments: CleanTextSegment[],
): void {
  if (sourceEnd <= sourceStart) return;
  segments.push({
    sourceStart,
    sourceEnd,
    cleanStart: cleanText.length,
    cleanEnd: cleanText.length + sourceEnd - sourceStart,
  });
}

/** Stable, content-independent identity for a spoken statement position. */
export function stableTakeId(sceneId: string, statementIndex: number): string {
  if (!sceneId || !Number.isInteger(statementIndex) || statementIndex < 0) {
    throw new Error("yaml audio: stable take ids require a scene id and non-negative statement index");
  }
  // Keep the same source-location convention as the YAML compiler's line ids.
  return `${sceneId}.${statementIndex}`;
}

function chunkTakeId(sceneId: string, statementIndex: number, chunkIndex: number): string {
  return `${stableTakeId(sceneId, statementIndex)}.${chunkIndex}`;
}

/** Cache identity: exactly cleaned text + voice asset + profile + compiler version. */
export function createYamlAudioCacheKey(input: {
  text: string;
  voiceAsset: string;
  profile: string;
  compilerVersion: string;
  speed?: number;
}): string {
  return hashJson({
    text: input.text,
    voiceAsset: input.voiceAsset,
    profile: input.profile,
    compilerVersion: input.compilerVersion,
    ...(input.speed !== undefined ? {speed: input.speed} : {}),
  });
}

export interface YamlAudioSpeechChunk {
  id: string;
  lineId: string;
  sceneId: string;
  statementIndex: number;
  chunkIndex: number;
  actor: string;
  text: string;
  sourceText: string;
  sourceStart: number;
  sourceEnd: number;
  speed: number;
  silence: boolean;
  interruptOf?: string;
  calls?: readonly { call: ProcedureCall; sourceStart: number; at: "start" | "end" }[];
}

export const DEFAULT_ELLIPSIS_BEAT_SEC = 0.55;

/**
 * Split direct dialogue at brace groups. The parser has already rejected bad
 * groups, so this seam only deals with timing/audio concerns.
 */
export function segmentYamlAudio(source: YamlAudioSource, voiceSpeed?: number): YamlAudioSpeechChunk[] {
  const chunks: YamlAudioSpeechChunk[] = [];
  for (const scene of source.scenes) {
    for (const [statementIndex, statement] of scene.script.entries()) {
      const lineId = stableTakeId(scene.id, statementIndex);
      let cursor = 0;
      let chunkIndex = 0;
      let speed = voiceSpeed ?? 1;
      let interruptionIndex = 0;
      let pendingEvents: Array<{call: ProcedureCall; sourceStart: number; at: "start" | "end"}> = [];
      let previousChunk: YamlAudioSpeechChunk | undefined;
      const addText = (sourceStart: number, sourceEnd: number): void => {
        const idChunkIndex = chunkIndex;
        if (sourceEnd <= sourceStart) return;
        const text = statement.text.slice(sourceStart, sourceEnd);
        const chunk: YamlAudioSpeechChunk = {
          id: chunkTakeId(scene.id, statementIndex, idChunkIndex), lineId, sceneId: scene.id,
          statementIndex, chunkIndex: idChunkIndex, actor: statement.actor, text,
          sourceText: text, sourceStart, sourceEnd, speed, silence: isEllipsisSilence(text),
          ...(pendingEvents.length ? {calls: pendingEvents} : {}),
        };
        chunks.push(chunk);
        previousChunk = chunk;
        pendingEvents = [];
        chunkIndex++;
      };
      while (cursor < statement.text.length) {
        const open = statement.text.indexOf("{", cursor);
        if (open < 0) { addText(cursor, statement.text.length); cursor = statement.text.length; break; }
        addText(cursor, open);
        const close = statement.text.indexOf("}", open + 1);
        if (close < 0) break;
        const calls = parseProcedureCalls(statement.text.slice(open + 1, close));
        if (calls) {
          for (const call of calls) {
            if (call.namespace === "say") {
              const value = call.args[0];
              if (value?.kind !== "string") continue;
              const id = `${lineId}.interrupt${interruptionIndex++ ? `.${interruptionIndex - 1}` : ""}`;
              chunks.push({
                id, lineId, sceneId: scene.id, statementIndex, chunkIndex: interruptionIndex,
                actor: call.subject, text: value.value, sourceText: statement.text,
                sourceStart: open, sourceEnd: close + 1, speed, silence: isEllipsisSilence(value.value),
                interruptOf: lineId,
                });
                continue;
            }
            pendingEvents.push({call, sourceStart: open, at: "start"});
            if (call.namespace === "voice" && call.terminal === "speed") {
              const value = call.args[0];
              if (value?.kind === "number" && value.value > 0) speed = value.value;
            }
          }
          // Events at a brace boundary belong to the preceding chunk. If the
          // group starts the line, addText will attach them to the next chunk.
          if (previousChunk && pendingEvents.length) {
            previousChunk.calls = [...(previousChunk.calls ?? []), ...pendingEvents.map((event) => ({...event, at: "end" as const}))];
            pendingEvents = [];
          }
        }
        cursor = close + 1;
      }
      if (pendingEvents.length && previousChunk) {
        previousChunk.calls = [...(previousChunk.calls ?? []), ...pendingEvents.map((event) => ({...event, at: "end" as const}))];
      }
      // A statement containing only calls has no spoken chunk; it still has no
      // TTS work. A final empty segment is intentionally not synthesized.
    }
  }
  return chunks;
}

function isEllipsisSilence(text: string): boolean {
  return text.includes("…") && text.replace(/…/gu, "").trim() === "";
}

/** Convert the validated narrow YAML episode into the speech-only source. */
export function yamlAudioSourceFromEpisode(episode: NarrowEpisode): YamlAudioSource {
  return {
    episodeId: episode.episode.id,
    actors: Object.fromEntries(
      Object.entries(episode.actors).map(([actor, member]) => [actor, { voice: member.voice }]),
    ),
    scenes: episode.scenes.map((scene) => ({
      id: scene.id,
      script: scene.script.map((statement): YamlAudioStatement => {
        const [actor, text] = Object.entries(statement)[0]!;
        return {actor, text};
      }),
    })),
  };
}

/** Convert a source position to the corresponding cleaned offset. */
export function sourceToCleanOffset(sourceOffset: number, cleaned: CleanedSpokenText): number {
  const event = cleaned.removed.find((token) => sourceOffset >= token.start && sourceOffset <= token.end);
  if (event) return event.cleanStart;
  const segment = cleaned.segments.find((candidate) => sourceOffset >= candidate.sourceStart && sourceOffset <= candidate.sourceEnd);
  if (segment) return segment.cleanStart + sourceOffset - segment.sourceStart;
  if (sourceOffset <= 0) return 0;
  return cleaned.text.length;
}

export function buildYamlAudioPreparation(
  source: YamlAudioSource,
  options: YamlAudioPreparationOptions,
): YamlAudioPreparation {
  const takes: PreparedYamlAudioTake[] = [];
  const lineCursor = new Map<string, number>();
  const spokenByScene = new Map<string, number>();
  const beat = options.ellipsisBeatSec ?? options.standardBeatSec ?? 0.5;
  if (!Number.isFinite(beat) || beat < 0) throw new Error("yaml audio: ellipsis beat must be finite and non-negative");

  for (const chunk of segmentYamlAudio(source)) {
    const voiceAsset = source.actors[chunk.actor]?.voice ?? options.voiceAsset;
    if (!voiceAsset) throw new Error(`yaml audio: no voice asset for actor "${chunk.actor}"`);
    const cleaned = cleanSpokenText(chunk.text);
    // Chunk text is brace-free by construction. Keep the cleaner at this seam
    // so its exact-text and offset guarantees remain true for callers.
    const cacheKey = createYamlAudioCacheKey({
      text: cleaned.text,
      voiceAsset,
      profile: options.profile,
      compilerVersion: options.compilerVersion,
      speed: chunk.speed,
    });
    const supplied = options.measurements ? findMeasurement(options.measurements, chunk.id, cacheKey) : undefined;
    const fallbackDuration = chunk.silence ? [...chunk.text].filter((char) => char === "…").length * beat : undefined;
      const measured = supplied ?? (options.durations?.[chunk.id] !== undefined
      ? {durationSec: options.durations[chunk.id]!}
      : fallbackDuration !== undefined ? {durationSec: fallbackDuration} : undefined);
    if (!measured) {
      if (options.allowUnmeasured) continue;
      throw new Error(`yaml audio: missing measured duration for take "${chunk.id}"`);
    }
    assertMeasurement(chunk.id, measured);

    const prior = lineCursor.get(chunk.lineId) ?? 0;
    const startSec = measured.startSec ?? prior;
    const boundaries = (measured.boundaries ?? []).map((boundary) => ({...boundary}));
    const eventTiming = chunk.calls?.flatMap((entry) => {
      const name = entry.call.path;
      const cleanStart = entry.at === "start" ? 0 : cleaned.text.length;
      return [{kind: "call" as const, name, sourceStart: entry.sourceStart, cleanStart,
        atSec: startSec + (entry.at === "end" ? measured.durationSec : 0)}];
    }) ?? [];
    const timing: PreparedTakeTiming = {
      text: cleaned.text,
      ...(measured.audioPath ? {audioPath: measured.audioPath} : {}),
      startSec,
      endSec: startSec + measured.durationSec,
      durationSec: measured.durationSec,
      boundaries,
      inlineEvents: eventTiming,
    };
    const spokenIndex = spokenByScene.get(chunk.sceneId) ?? 0;
      takes.push({
      id: chunk.id,
      lineId: chunk.lineId,
      sceneId: chunk.sceneId,
      statementIndex: chunk.statementIndex,
      chunkIndex: chunk.chunkIndex,
      spokenIndex,
      actor: chunk.actor,
      voiceAsset,
      profile: options.profile,
      compilerVersion: options.compilerVersion,
      cacheKey,
      sourceText: chunk.text,
      text: cleaned.text,
      silence: chunk.silence,
      speed: chunk.speed,
      relativeStartSec: startSec,
      ...(chunk.interruptOf ? {interruptOf: chunk.interruptOf} : {}),
      durationSec: measured.durationSec,
      ...(measured.audioPath ? {audioPath: measured.audioPath} : {}),
      cleaned,
      timing,
      captions: chunk.silence ? [] : captionsFromTiming(timing),
      lipSync: lipSyncFromTiming(timing),
      inlineEvents: eventTiming,
    });
      if (!chunk.interruptOf) {
      lineCursor.set(chunk.lineId, startSec + measured.durationSec);
      spokenByScene.set(chunk.sceneId, spokenIndex + 1);
    }
  }

  return {
    episodeId: source.episodeId,
    profile: options.profile,
    compilerVersion: options.compilerVersion,
    takes,
  };
}

/**
 * Move prepared takes onto starts returned by the compiler. The compiler is
 * authoritative because procedure durations can move the next speech line;
 * this function only shifts derived views and never changes take duration.
 */
export function synchronizeYamlAudioStarts(
  preparation: YamlAudioPreparation,
  starts: Readonly<Record<string, number>>,
): YamlAudioPreparation {
  return {
    ...preparation,
    takes: preparation.takes.map((take) => {
      const startSec = starts[take.id];
      if (startSec === undefined) return take;
      if (!Number.isFinite(startSec) || startSec < 0) {
        throw new Error(`yaml audio: compiler returned invalid start for take "${take.id}"`);
      }
      const delta = startSec - take.timing.startSec;
      const timing: PreparedTakeTiming = {
        ...take.timing,
        startSec,
        endSec: startSec + take.durationSec,
        inlineEvents: take.timing.inlineEvents.map((event) => ({
          ...event,
          atSec: event.atSec === null ? null : event.atSec + delta,
        })),
      };
      const captions = take.captions.map((caption) => ({
        ...caption,
        startSec: caption.startSec + delta,
        endSec: caption.endSec + delta,
      }));
      const lipSync: PreparedLipSyncTiming = {
        ...take.lipSync,
        startSec,
        endSec: startSec + take.durationSec,
      };
      return {
        ...take,
        timing,
        captions,
        lipSync,
        inlineEvents: timing.inlineEvents,
      };
    }),
  };
}

function findMeasurement(
  measurements: YamlAudioMeasurements,
  takeId: string,
  cacheKey: string,
): TtsMeasurement | undefined {
  const raw = measurements instanceof Map
    ? measurements.get(takeId) ?? measurements.get(cacheKey)
    : (measurements as Readonly<Record<string, TtsMeasurement | number | undefined>>)[takeId]
      ?? (measurements as Readonly<Record<string, TtsMeasurement | number | undefined>>)[cacheKey];
  return typeof raw === "number" ? { durationSec: raw } : raw;
}

function assertMeasurement(id: string, measurement: TtsMeasurement): void {
  if (!Number.isFinite(measurement.durationSec) || measurement.durationSec < 0) {
    throw new Error(`yaml audio: measured duration for take "${id}" must be a finite non-negative number`);
  }
  if (measurement.startSec !== undefined && (!Number.isFinite(measurement.startSec) || measurement.startSec < 0)) {
    throw new Error(`yaml audio: measured start for take "${id}" must be a finite non-negative number`);
  }
  for (const [index, boundary] of (measurement.boundaries ?? []).entries()) {
    if (
      !Number.isFinite(boundary.startSec) ||
      !Number.isFinite(boundary.endSec) ||
      boundary.startSec < 0 ||
      boundary.endSec < boundary.startSec ||
      boundary.endSec - measurement.durationSec > 1e-3
    ) {
      throw new Error(`yaml audio: invalid boundary ${index} for take "${id}"`);
    }
    if (boundary.startChar !== undefined && (!Number.isInteger(boundary.startChar) || boundary.startChar < 0)) {
      throw new Error(`yaml audio: invalid boundary startChar ${index} for take "${id}"`);
    }
    if (boundary.endChar !== undefined && (!Number.isInteger(boundary.endChar) || boundary.endChar < (boundary.startChar ?? 0))) {
      throw new Error(`yaml audio: invalid boundary endChar ${index} for take "${id}"`);
    }
  }
}

function inlineEvents(
  cleaned: CleanedSpokenText,
  boundaries: readonly BoundaryAlignment[],
  takeStartSec: number,
): PreparedInlineEvent[] {
  return cleaned.removed.map((removed) => {
    const token = removed.raw.slice(1, -1).trim();
    const name = removed.kind === "cue" ? token : parseProcedureCall(token)?.path;
    if (!name) throw new Error(`yaml audio: invalid inline token at offset ${removed.start}`);
    const atRelative = alignedTimeAtOffset(removed.cleanStart, cleaned.text, boundaries);
    return {
      kind: removed.kind,
      name,
      sourceStart: removed.start,
      cleanStart: removed.cleanStart,
      atSec: atRelative === null ? null : takeStartSec + atRelative,
    };
  });
}

function captionsFromTiming(timing: PreparedTakeTiming): PreparedCaption[] {
  return timing.text ? [{ startSec: timing.startSec, endSec: timing.endSec, text: timing.text }] : [];
}

function lipSyncFromTiming(timing: PreparedTakeTiming): PreparedLipSyncTiming {
  return {
    text: timing.text,
    ...(timing.audioPath ? { audioPath: timing.audioPath } : {}),
    startSec: timing.startSec,
    endSec: timing.endSec,
    boundaries: timing.boundaries,
  };
}

/**
 * Resolve a zero-width inline event to an aligned boundary. A missing or
 * non-matching alignment deliberately returns null; it never guesses from
 * character proportions or a scene duration.
 */
export function alignedTimeAtOffset(
  cleanOffset: number,
  text: string,
  boundaries: readonly BoundaryAlignment[],
): number | null {
  const located = locateBoundaries(text, boundaries);
  if (!located.length) return null;

  const explicit = located.some((boundary) => boundary.startChar !== undefined || boundary.endChar !== undefined);
  if (explicit) {
    const next = located.find((boundary) => (boundary.startChar ?? Number.POSITIVE_INFINITY) >= cleanOffset);
    if (next) return next.startSec;
    return located.at(-1)!.endSec;
  }

  const next = located.find((boundary) => boundary.cleanStart >= cleanOffset);
  if (next) return next.startSec;
  return located.at(-1)!.endSec;
}

interface LocatedBoundary extends BoundaryAlignment {
  cleanStart: number;
  cleanEnd: number;
}

function locateBoundaries(text: string, boundaries: readonly BoundaryAlignment[]): LocatedBoundary[] {
  const located: LocatedBoundary[] = [];
  let searchFrom = 0;
  for (const boundary of boundaries) {
    if (boundary.startChar !== undefined || boundary.endChar !== undefined) {
      const cleanStart = boundary.startChar ?? boundary.endChar ?? 0;
      const cleanEnd = boundary.endChar ?? cleanStart;
      located.push({ ...boundary, cleanStart, cleanEnd });
      continue;
    }
    if (!boundary.text) return [];
    const exact = text.indexOf(boundary.text, searchFrom);
    const trimmed = boundary.text.trim();
    const start = exact >= 0 ? exact : trimmed ? text.indexOf(trimmed, searchFrom) : -1;
    if (start < 0) return [];
    const end = start + (exact >= 0 ? boundary.text.length : trimmed.length);
    located.push({ ...boundary, cleanStart: start, cleanEnd: end });
    searchFrom = end;
  }
  return located.sort((a, b) => a.cleanStart - b.cleanStart || a.startSec - b.startSec);
}

function sameInlineEvent(a: PreparedInlineEvent, b: PreparedInlineEvent): boolean {
  return a.kind === b.kind && a.name === b.name && a.sourceStart === b.sourceStart && a.cleanStart === b.cleanStart && (
    a.atSec === b.atSec || (a.atSec !== null && b.atSec !== null && nearlyEqual(a.atSec, b.atSec))
  );
}

function nearlyEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-6;
}
