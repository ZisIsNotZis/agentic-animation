import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parse } from "yaml";
import { evaluatePerformance, performanceMetadata, type PerformanceFrameState } from "../../packages/studio/src/performance/index";
import { auditCallCoverage, type CallCoverageRow } from "./call-coverage";

type RecordValue = Record<string, unknown>;
type VisualChannel = "body" | "face" | "prop-binding" | "camera" | "vfx" | "lifecycle";
type SampleRole = "start" | "peak" | "recovery";

interface TrackEvent extends RecordValue {
  at?: number;
  duration?: number;
}

interface Track extends RecordValue {
  kind?: string;
  target?: string;
  events?: TrackEvent[];
}

export interface VisualSample {
  role: SampleRole;
  timestampSec: number;
  frame: number;
  expectedVisibleChannels: VisualChannel[];
  observedVisibleChannels: VisualChannel[];
  observable: boolean;
}

export interface VisualChannelSample extends VisualSample {
  channel: VisualChannel;
}

export interface VisualCallRow {
  index: number;
  scene: string;
  statement: number;
  actor: string;
  group: number;
  call: number;
  sourceStart: number;
  rawCall: string;
  procedure: string;
  classes: string[];
  visual: boolean;
  expectedVisibleChannels: VisualChannel[];
  rendererTrackKinds: string[];
  event: CallCoverageRow["event"];
  eventTiming: CallCoverageRow["eventTiming"];
  trackObservability: Record<string, {positiveDurationEvents: number; zeroDurationEvents: number; observable: boolean}>;
  samples: VisualSample[];
  channelSamples: VisualChannelSample[];
  status: "sampled" | "non-visual" | "unobservable" | "unmatched";
  reason: string[];
}

export interface VisualSamplingManifest {
  generatedBy: "tools/asset-qa/visual-sampling.ts";
  deterministic: true;
  episode: string;
  source: {episode: string; performance: string};
  timebase: "seconds";
  video: {fps: number; width: number; height: number};
  summary: {
    inlineCalls: number;
    visualCalls: number;
    sampledVisualCalls: number;
    unobservableVisualCalls: number;
    nonVisualCalls: number;
    samples: number;
    channels: Record<VisualChannel, number>;
  };
  calls: VisualCallRow[];
  contactSheetInputs: Array<{callIndex: number; role: SampleRole; frame: number; timestampSec: number; expectedVisibleChannels: VisualChannel[]}>;
}

function record(value: unknown): RecordValue | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : undefined;
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function eventValue(event: TrackEvent): RecordValue {
  return record(event.value) ?? event;
}

function sceneEvents(performance: unknown, sceneId: string): RecordValue[] {
  const root = record(performance);
  const scenes = Array.isArray(root?.sceneTrack) ? root.sceneTrack : [];
  const scene = scenes.map(record).find((item) => item?.id === sceneId);
  const tracks = Array.isArray(scene?.performanceTracks)
    ? scene.performanceTracks
    : Array.isArray(root?.performanceTracks) ? root.performanceTracks : [];
  return tracks.flatMap((trackValue) => {
    const track = record(trackValue);
    return Array.isArray(track?.events)
      ? track.events.map(record).filter((event): event is RecordValue => Boolean(event))
      : [];
  });
}

function callRaw(event: RecordValue): string | undefined { return text(record(event.call)?.raw); }
function callPath(event: RecordValue): string | undefined { return text(record(event.call)?.path); }

/** Pair coverage rows with the exact compiled event, preserving duplicate calls. */
function compiledCalls(rows: CallCoverageRow[], performance: unknown): Array<RecordValue | null> {
  const used = new Set<RecordValue>();
  return rows.map((row) => {
    if (!row.event) return null;
    const candidates = sceneEvents(performance, row.scene).filter((event) =>
      !used.has(event) && event.kind === "call" && event.subject === row.event!.subject,
    );
    const exact = candidates.find((event) => callRaw(event) === row.rawCall)
      ?? candidates.find((event) => callPath(event) === row.rawCall.slice(0, row.rawCall.indexOf("(")));
    if (exact) used.add(exact);
    return exact ?? null;
  });
}

const CHANNEL_TRACKS: Record<VisualChannel, string[]> = {
  body: ["bone", "movement"],
  face: ["expression"],
  "prop-binding": ["binding", "object"],
  camera: ["camera"],
  vfx: ["vfx"],
  lifecycle: ["lifecycle"],
};

function channelsFor(row: CallCoverageRow, tracks: Track[]): VisualChannel[] {
  const kinds = new Set(row.rendererTrackKinds);
  const channels: VisualChannel[] = [];
  if (kinds.has("bone/movement")) channels.push("body");
  if (kinds.has("expression")) channels.push("face");
  if (kinds.has("binding") && tracks.some((track) => track.kind === "binding")) channels.push("prop-binding");
  if (kinds.has("camera")) channels.push("camera");
  if (kinds.has("vfx")) channels.push("vfx");
  if (kinds.has("lifecycle")) channels.push("lifecycle");
  return channels;
}

function tracksFor(event: RecordValue | null): Track[] {
  return Array.isArray(event?.tracks)
    ? event.tracks.map(record).filter((track): track is Track => Boolean(track))
    : [];
}

function trackDuration(item: TrackEvent, fallback: number): number {
  const duration = finite(item.duration);
  if (duration !== undefined) return duration;
  const end = finite(item.end);
  const at = finite(item.at) ?? 0;
  return end === undefined ? fallback : end - at;
}

function trackObservability(tracks: Track[], fallback: number): VisualCallRow["trackObservability"] {
  const result: VisualCallRow["trackObservability"] = {};
  for (const track of tracks) {
    const kind = text(track.kind);
    if (!kind || !Object.values(CHANNEL_TRACKS).some((kinds) => kinds.includes(kind))) continue;
    const events = track.events ?? [];
    const positiveDurationEvents = events.filter((item) => trackDuration(item, fallback) > 0).length;
    const zeroDurationEvents = events.filter((item) => trackDuration(item, fallback) <= 0).length;
    const previous = result[kind];
    result[kind] = {
      positiveDurationEvents: (previous?.positiveDurationEvents ?? 0) + positiveDurationEvents,
      zeroDurationEvents: (previous?.zeroDurationEvents ?? 0) + zeroDurationEvents,
      observable: (previous?.positiveDurationEvents ?? 0) + positiveDurationEvents > 0,
    };
  }
  return result;
}

function channelTrackKinds(channel: VisualChannel): string[] { return CHANNEL_TRACKS[channel]; }

function channelsWithTracks(channels: VisualChannel[], tracks: Track[]): VisualChannel[] {
  return channels.filter((channel) => channelTrackKinds(channel).some((kind) => tracks.some((track) => track.kind === kind)));
}

function frameAt(seconds: number, fps: number): number { return Math.max(0, Math.round(seconds * fps)); }

function sampleAt(role: SampleRole, seconds: number, fps: number, expected: VisualChannel[], subject: string, state: PerformanceFrameState): VisualSample {
  const frame = frameAt(seconds, fps);
  const observed = observedChannels(state, expected, subject);
  return {
    role,
    timestampSec: frame / fps,
    frame,
    expectedVisibleChannels: expected,
    observedVisibleChannels: observed,
    observable: observed.length > 0,
  };
}

function activeTrack(state: PerformanceFrameState, kinds: string[], subject?: string): boolean {
  return state.tracks.some((track) =>
    kinds.includes(track.kind) && (!subject || track.subject === subject || track.target === subject)
      && track.events.some((event) => event.active),
  );
}

function observedChannels(state: PerformanceFrameState, expected: VisualChannel[], subject: string): VisualChannel[] {
  const result: VisualChannel[] = [];
  // The generic runtime state is intentionally used here: it is the same
  // state consumed by PerformanceFrame, without inventing screenshot-only data.
  for (const channel of expected) {
    if (channel === "camera" && activeTrack(state, ["camera"], "camera")) result.push(channel);
    else if (channel === "vfx" && state.vfx.length > 0) result.push(channel);
    else if (channel === "face" && (activeTrack(state, ["expression"], subject) || state.actors.some((item) => activeTrack({ ...state, tracks: item.tracks }, ["expression"])))) result.push(channel);
    else if (channel === "body" && (activeTrack(state, ["bone", "movement"], subject) || state.actors.some((item) => activeTrack({ ...state, tracks: item.tracks }, ["bone", "movement"])))) result.push(channel);
    else if (channel === "lifecycle" && (activeTrack(state, ["lifecycle"], subject) || state.actors.some((item) => activeTrack({ ...state, tracks: item.tracks }, ["lifecycle"])))) result.push(channel);
    else if (channel === "prop-binding" && state.tracks.some((track) => track.kind === "binding" && track.target && track.events.some((event) => event.active))) result.push(channel);
  }
  return result;
}

function sampleSeconds(start: number, end: number, fps: number): {start: number; peak: number; recovery: number} {
  const peak = start + (end - start) / 2;
  return {start, peak, recovery: Math.max(start, end - 1 / fps)};
}

function channelWindows(channel: VisualChannel, tracks: Track[], timing: CallCoverageRow["eventTiming"]): Array<{start: number; end: number}> {
  if (!timing) return [];
  const kinds = new Set(channelTrackKinds(channel));
  const windows = tracks
    .filter((track) => kinds.has(track.kind ?? ""))
    .flatMap((track) => (track.events ?? []).map((item) => {
      const start = timing.start + (finite(item.at) ?? 0);
      return {start, end: start + trackDuration(item, timing.duration)};
    }))
    .filter((window) => window.end >= window.start);
  return windows.length ? windows : [{start: timing.start, end: timing.end}];
}

function allChannels(): VisualChannel[] { return ["body", "face", "prop-binding", "camera", "vfx", "lifecycle"]; }

export function buildVisualSamplingManifest(input: {
  episode: unknown;
  performance: unknown;
  episodePath?: string;
  performancePath?: string;
}): VisualSamplingManifest {
  const coverage = auditCallCoverage(input);
  const performance = input.performance;
  const metadata = performanceMetadata(performance as Parameters<typeof performanceMetadata>[0]);
  const fps = metadata.fps;
  const events = compiledCalls(coverage.calls, performance);
  const calls = coverage.calls.map((coverageRow, index): VisualCallRow => {
    const event = events[index];
    const tracks = tracksFor(event);
    const expected = channelsFor(coverageRow, tracks);
    const timing = coverageRow.eventTiming;
    const fallback = timing?.duration ?? 0;
    const observations = trackObservability(tracks, fallback);
    const trackBackedChannels = channelsWithTracks(expected, tracks);
    const invalidChannels = trackBackedChannels.filter((channel) => !channelTrackKinds(channel).some((kind) => observations[kind]?.observable));
    const visual = expected.length > 0;
    const reason: string[] = [];
    if (!visual) reason.push("no renderer-consumed visual channel; audio/state metadata only");
    if (visual && !event) reason.push("no compiled event matched this visual inline occurrence");
    if (visual && event && (timing === null || timing.duration <= 0)) reason.push("visual call has zero duration");
    if (visual && event && invalidChannels.length) reason.push(`zero-duration or unobservable visual track for ${invalidChannels.join(", ")}`);
    if (visual && event && trackBackedChannels.length !== expected.length) reason.push("visual channel has no matching compiled track");
    const status: VisualCallRow["status"] = !visual
      ? "non-visual"
      : !event
        ? "unmatched"
        : reason.length
          ? "unobservable"
          : "sampled";
    const samples = visual && event && timing && timing.duration > 0
      ? Object.entries(sampleSeconds(timing.start, timing.end, fps)).map(([role, seconds]) => sampleAt(role as SampleRole, seconds, fps, expected, coverageRow.event?.subject ?? coverageRow.actor, evaluatePerformance(performance as Parameters<typeof evaluatePerformance>[0], frameAt(seconds, fps))))
      : [];
    const channelSamples = visual && event && timing && timing.duration > 0
      ? expected.flatMap((channel) => {
        const windows = channelWindows(channel, tracks, timing);
        const window = windows.reduce((shortest, candidate) => (candidate.end - candidate.start < shortest.end - shortest.start ? candidate : shortest), windows[0]!);
        return Object.entries(sampleSeconds(window.start, window.end, fps)).map(([role, seconds]) => ({
          ...sampleAt(role as SampleRole, seconds, fps, [channel], coverageRow.event?.subject ?? coverageRow.actor, evaluatePerformance(performance as Parameters<typeof evaluatePerformance>[0], frameAt(seconds, fps))),
          channel,
        }));
      })
      : [];
    const observed = new Set(channelSamples.flatMap((sample) => sample.observedVisibleChannels));
    for (const channel of expected) if (!observed.has(channel)) reason.push(`runtime samples never exposed ${channel}`);
    return {
      index: coverageRow.index,
      scene: coverageRow.scene,
      statement: coverageRow.statement,
      actor: coverageRow.actor,
      group: coverageRow.group,
      call: coverageRow.call,
      sourceStart: coverageRow.sourceStart,
      rawCall: coverageRow.rawCall,
      procedure: coverageRow.procedure,
      classes: coverageRow.classes,
      visual,
      expectedVisibleChannels: expected,
      rendererTrackKinds: coverageRow.rendererTrackKinds,
      event: coverageRow.event,
      eventTiming: timing,
      trackObservability: observations,
      samples,
      channelSamples,
      status: reason.length && visual ? (event ? "unobservable" : "unmatched") : status,
      reason,
    };
  });
  const channels = Object.fromEntries(allChannels().map((channel) => [channel, calls.filter((call) => call.expectedVisibleChannels.includes(channel)).length])) as Record<VisualChannel, number>;
  const contactSheetInputs = calls.flatMap((call) => [...call.samples, ...call.channelSamples].map((sample) => ({callIndex: call.index, role: sample.role, ...("channel" in sample ? {channel: sample.channel} : {}), frame: sample.frame, timestampSec: sample.timestampSec, expectedVisibleChannels: sample.expectedVisibleChannels})));
  return {
    generatedBy: "tools/asset-qa/visual-sampling.ts",
    deterministic: true,
    episode: typeof record(input.episode)?.episode === "object" ? String(record(record(input.episode)?.episode)?.id ?? "unknown") : "unknown",
    source: {episode: input.episodePath ?? "episode.yml", performance: input.performancePath ?? "performance.json"},
    timebase: "seconds",
    video: {fps, width: metadata.width, height: metadata.height},
    summary: {
      inlineCalls: calls.length,
      visualCalls: calls.filter((call) => call.visual).length,
      sampledVisualCalls: calls.filter((call) => call.status === "sampled").length,
      unobservableVisualCalls: calls.filter((call) => call.status === "unobservable" || call.status === "unmatched").length,
      nonVisualCalls: calls.filter((call) => !call.visual).length,
      samples: contactSheetInputs.length,
      channels,
    },
    calls,
    contactSheetInputs,
  };
}

export function assertVisualSamplingManifest(manifest: VisualSamplingManifest): void {
  if (manifest.summary.inlineCalls !== manifest.calls.length) throw new Error("visual QA: inline call count does not match manifest rows");
  const expectedRoles = ["start", "peak", "recovery"];
  for (const call of manifest.calls) {
    if (!call.visual) continue;
    if (call.status !== "sampled") throw new Error(`visual QA: ${call.index} ${call.rawCall}: ${call.reason.join("; ")}`);
    if (call.samples.length !== 3 || call.samples.map((sample) => sample.role).join(",") !== expectedRoles.join(",")) throw new Error(`visual QA: ${call.rawCall} is missing start/peak/recovery samples`);
    if (call.channelSamples.length !== call.expectedVisibleChannels.length * 3) throw new Error(`visual QA: ${call.rawCall} is missing channel start/peak/recovery samples`);
    if (call.samples.some((sample) => !Number.isInteger(sample.frame) || sample.timestampSec !== sample.frame / manifest.video.fps)) throw new Error(`visual QA: ${call.rawCall} has nondeterministic frame timestamps`);
    for (const channel of call.expectedVisibleChannels) {
      if (!call.channelSamples.some((sample) => sample.channel === channel && sample.observedVisibleChannels.includes(channel))) throw new Error(`visual QA: ${call.rawCall} never exposes ${channel}`);
    }
    for (const kind of call.rendererTrackKinds) {
      const keys = kind === "bone/movement" ? ["bone", "movement"] : [kind];
      for (const key of keys) {
        if (!allChannels().some((channel) => CHANNEL_TRACKS[channel].includes(key))) continue;
        if (!(key in call.trackObservability)) continue;
        const observation = call.trackObservability[key];
        if (!observation?.observable) throw new Error(`visual QA: ${call.rawCall} has zero-duration/unobservable ${key} track`);
      }
    }
  }
}

function displayPath(path: string, root: string): string { return relative(root, path).split("\\").join("/") || path; }

export function runVisualSampling(episodePath: string, performancePath: string, outputPath: string): VisualSamplingManifest {
  const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
  const manifest = buildVisualSamplingManifest({
    episode: parse(readFileSync(episodePath, "utf8")),
    performance: JSON.parse(readFileSync(performancePath, "utf8")),
    episodePath: displayPath(episodePath, root),
    performancePath: displayPath(performancePath, root),
  });
  mkdirSync(dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + "\n");
  writeFileSync(join(dirname(outputPath), "visual-contact-sheet-inputs.json"), JSON.stringify({generatedBy: manifest.generatedBy, deterministic: true, video: manifest.video, inputs: manifest.contactSheetInputs}, null, 2) + "\n");
  return manifest;
}

function main(): void {
  const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
  const episodeDir = resolve(root, process.argv[2] ?? "episodes/ai-work-adventure");
  const episodePath = episodeDir.endsWith("episode.yml") ? episodeDir : join(episodeDir, "episode.yml");
  const performancePath = process.argv[3] ? resolve(root, process.argv[3]) : join(dirname(episodePath), "performance.json");
  const outputPath = process.argv[4] ? resolve(root, process.argv[4]) : join(dirname(episodePath), "build", "asset-qa", "visual-sampling.json");
  const manifest = runVisualSampling(episodePath, performancePath, outputPath);
  console.log(`visual QA: ${manifest.summary.sampledVisualCalls}/${manifest.summary.visualCalls} visual calls sampled; ${manifest.summary.samples} samples`);
  console.log(`findings: ${manifest.summary.unobservableVisualCalls} visual calls need renderer-visible sampling/track repair`);
  console.log(`manifest: ${outputPath}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
