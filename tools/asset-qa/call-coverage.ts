import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { parse } from "yaml";
import { parseProcedureCalls, type ProcedureCall } from "@anim/core";

type RecordValue = Record<string, unknown>;

export interface InlineCallOccurrence {
  scene: string;
  statement: number;
  actor: string;
  group: number;
  call: number;
  sourceStart: number;
  raw: string;
  parsed: ProcedureCall;
}

export interface CallCoverageInput {
  episode: unknown;
  performance: unknown;
  episodePath?: string;
  performancePath?: string;
}

export interface CallCoverageRow {
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
  event: {
    kind: string;
    subject: string;
    start: number;
    end: number;
    source?: string;
  } | null;
  eventTiming: {start: number; end: number; duration: number} | null;
  trackKinds: string[];
  rendererTrackKinds: string[];
  audibleCues: Array<{kind: "sfx" | "music" | "speech"; cue?: string; at?: number; duration?: number}>;
  status: "covered" | "uncovered";
  reason: string[];
}

export interface CallCoverageReceipt {
  generatedBy: "tools/asset-qa/call-coverage.ts";
  deterministic: true;
  episode: string;
  source: {episode: string; performance: string};
  summary: {
    calls: number;
    covered: number;
    uncovered: number;
    byClass: Record<string, {covered: number; uncovered: number}>;
    uncoveredClasses: string[];
  };
  calls: CallCoverageRow[];
}

function record(value: unknown): RecordValue | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : undefined;
}

function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function eventValue(event: RecordValue): RecordValue {
  return record(event.value) ?? event;
}

/** Enumerate strict brace calls without losing their source order or offset. */
export function enumerateInlineCalls(episode: unknown): InlineCallOccurrence[] {
  const root = record(episode);
  const scenes = Array.isArray(root?.scenes) ? root.scenes : [];
  const result: InlineCallOccurrence[] = [];
  for (const [sceneIndex, sceneValue] of scenes.entries()) {
    const scene = record(sceneValue);
    const sceneId = string(scene?.id) ?? `scene-${sceneIndex}`;
    const script = Array.isArray(scene?.script) ? scene.script : [];
    for (const [statementIndex, statementValue] of script.entries()) {
      const statement = record(statementValue);
      if (!statement) continue;
      const actor = Object.keys(statement)[0] ?? "";
      const source = string(statement[actor]) ?? "";
      const groups = /\{([^{}]*)\}/g;
      let groupMatch: RegExpExecArray | null;
      let groupIndex = 0;
      while ((groupMatch = groups.exec(source))) {
        const rawGroup = groupMatch[1]?.trim() ?? "";
        const calls = parseProcedureCalls(rawGroup);
        if (!calls) throw new Error(`call coverage: invalid inline call group at ${sceneId}.${statementIndex}: ${rawGroup}`);
        calls.forEach((parsed, callIndex) => result.push({
          scene: sceneId,
          statement: statementIndex,
          actor,
          group: groupIndex,
          call: callIndex,
          sourceStart: groupMatch!.index,
          raw: parsed.raw,
          parsed,
        }));
        groupIndex++;
      }
    }
  }
  return result;
}

function eventCall(event: RecordValue): RecordValue | undefined {
  return record(event.call);
}

function eventRaw(event: RecordValue): string | undefined {
  return string(eventCall(event)?.raw);
}

function eventPath(event: RecordValue): string | undefined {
  return string(eventCall(event)?.path);
}

function sceneEvents(performance: unknown, sceneId: string): RecordValue[] {
  const root = record(performance);
  const scenes = Array.isArray(root?.sceneTrack) ? root.sceneTrack : [];
  const scene = scenes.map(record).find((item) => item && item.id === sceneId);
  const tracks = Array.isArray(scene?.performanceTracks)
    ? scene.performanceTracks
    : Array.isArray(root?.performanceTracks) ? root.performanceTracks : [];
  return tracks.flatMap((trackValue) => {
    const track = record(trackValue);
    return Array.isArray(track?.events) ? track.events.map(record).filter((event): event is RecordValue => Boolean(event)) : [];
  });
}

function matchEvent(occurrence: InlineCallOccurrence, events: RecordValue[], used: Set<RecordValue>): RecordValue | null {
  const candidates = events.filter((event) => !used.has(event) && event.kind === "call" && event.subject === occurrence.parsed.subject);
  const exact = candidates.find((event) => eventRaw(event) === occurrence.raw);
  if (exact) return exact;
  const path = occurrence.parsed.path;
  return candidates.find((event) => eventPath(event) === path) ?? null;
}

function speechEvent(occurrence: InlineCallOccurrence, events: RecordValue[], used: Set<RecordValue>): RecordValue | null {
  const text = occurrence.parsed.args[0]?.kind === "string" ? occurrence.parsed.args[0].value : undefined;
  return events.find((event) => !used.has(event) && event.kind === "speech" && event.subject === occurrence.parsed.subject && (text === undefined || event.text === text)) ?? null;
}

function trackRows(event: RecordValue | null): RecordValue[] {
  return Array.isArray(event?.tracks)
    ? event.tracks.map(record).filter((track): track is RecordValue => Boolean(track))
    : [];
}

function trackEvents(track: RecordValue): RecordValue[] {
  return Array.isArray(track.events) ? track.events.map(record).filter((event): event is RecordValue => Boolean(event)) : [];
}

function hasParts(track: RecordValue): boolean {
  return trackEvents(track).some((item) => {
    const value = eventValue(item);
    return Array.isArray(value.parts) && value.parts.length > 0;
  });
}

function hasExpression(track: RecordValue): boolean {
  return trackEvents(track).some((item) => {
    const value = eventValue(item);
    return Boolean(string(value.name) ?? string(value.emotion));
  });
}

function hasCameraKey(track: RecordValue): boolean {
  return trackEvents(track).some((item) => {
    const value = eventValue(item);
    return ["x", "y", "z", "rotation"].some((key) => number(value[key]) !== undefined);
  });
}

function hasVfx(track: RecordValue): boolean {
  return trackEvents(track).some((item) => {
    const value = eventValue(item);
    return Boolean(string(value.type) ?? string(value.style));
  });
}

function hasBinding(track: RecordValue): boolean {
  return trackEvents(track).some((item) => {
    const value = eventValue(item);
    return Boolean(string(value.object) ?? string(value.prop)) && Boolean(string(value.holder) ?? string(value.actor) ?? string(value.subject));
  });
}

function hasState(track: RecordValue): boolean {
  return trackEvents(track).some((item) => {
    const value = eventValue(item);
    return ["present", "pose", "face", "gaze", "state", "placement"].some((key) => value[key] !== undefined);
  });
}

function audibleCues(tracks: RecordValue[], event: RecordValue | null): CallCoverageRow["audibleCues"] {
  const cues: CallCoverageRow["audibleCues"] = [];
  for (const track of tracks) {
    const kind = track.kind;
    if (kind !== "sfx" && kind !== "music") continue;
    for (const item of trackEvents(track)) {
      const value = eventValue(item);
      const cue = string(value.cue);
      if (!cue) continue;
      const cueKind = value.kind === "music" || kind === "music" ? "music" : "sfx";
      const at = number(item.at);
      const duration = number(value.duration);
      cues.push({kind: cueKind, cue, ...(at === undefined ? {} : {at}), ...(duration === undefined ? {} : {duration})});
    }
  }
  if (event?.kind === "speech") cues.push({kind: "speech"});
  return cues;
}

function classesFor(occurrence: InlineCallOccurrence, event: RecordValue | null): string[] {
  const {subject, namespace} = occurrence.parsed;
  const tracks = trackRows(event);
  const classes = new Set<string>();
  if (namespace === "state" || tracks.some((track) => track.kind === "lifecycle")) classes.add("state");
  if (subject === "camera") classes.add("camera");
  if (subject === "vfx" || tracks.some((track) => track.kind === "vfx")) classes.add("visual");
  if (subject === "sfx" || tracks.some((track) => track.kind === "sfx" && trackEvents(track).some((item) => eventValue(item).kind !== "music"))) classes.add("sfx");
  if (subject === "music" || tracks.some((track) => (track.kind === "sfx" || track.kind === "music") && trackEvents(track).some((item) => eventValue(item).kind === "music"))) classes.add("music");
  if (namespace === "say" || namespace === "voice" || event?.kind === "speech") classes.add("speech");
  if (namespace !== "state" && namespace !== "say" && subject !== "camera" && subject !== "vfx" && subject !== "sfx" && subject !== "music") classes.add("visual");
  return [...classes].sort();
}

function evaluateRow(occurrence: InlineCallOccurrence, event: RecordValue | null): Omit<CallCoverageRow, "index" | "scene" | "statement" | "actor" | "group" | "call" | "sourceStart" | "rawCall"> {
  const tracks = trackRows(event);
  const trackKinds = [...new Set(tracks.map((track) => string(track.kind)).filter((kind): kind is string => Boolean(kind)))].sort();
  const rendererTrackKinds: string[] = [];
  const reasons: string[] = [];
  const {subject, namespace} = occurrence.parsed;
  const kind = event?.kind === "speech" ? "speech" : string(event?.performance && record(event.performance)?.id) ?? occurrence.parsed.path;
  const classes = classesFor(occurrence, event);
  const cues = audibleCues(tracks, event);
  const hasBone = tracks.some((track) => (track.kind === "bone" || track.kind === "movement") && hasParts(track));
  const hasFace = tracks.some((track) => track.kind === "expression" && hasExpression(track));
  const hasGaze = tracks.some((track) => track.kind === "gaze");
  const hasCamera = tracks.some((track) => track.kind === "camera" && hasCameraKey(track));
  const hasVfxTrack = tracks.some((track) => track.kind === "vfx" && hasVfx(track));
  const hasLifecycle = tracks.some((track) => track.kind === "lifecycle" && hasState(track));
  const hasBindingTrack = tracks.some((track) => track.kind === "binding" && hasBinding(track));

  if (hasBone) rendererTrackKinds.push("bone/movement");
  if (hasFace) rendererTrackKinds.push("expression");
  // The renderer currently carries gaze tracks through evaluation but does not
  // project them into actor.expression, so a gaze track alone is not evidence.
  if (hasCamera) rendererTrackKinds.push("camera");
  if (hasVfxTrack) rendererTrackKinds.push("vfx");
  if (hasLifecycle) rendererTrackKinds.push("lifecycle");
  if (hasBindingTrack) rendererTrackKinds.push("binding");

  let covered = false;
  if (!event) reasons.push("no compiled event matched this inline occurrence");
  else if (namespace === "say") covered = cues.some((cue) => cue.kind === "speech");
  else if (subject === "camera") {
    covered = hasCamera;
    if (!covered) reasons.push("camera track has no renderer-consumed x/y/z/rotation key; zoom/operation alone is a no-op");
  } else if (subject === "vfx") {
    covered = hasVfxTrack;
    if (!covered) reasons.push("vfx track has no renderer-consumed type or style payload");
  } else if (subject === "sfx" || subject === "music") {
    covered = cues.some((cue) => cue.kind === (subject === "music" ? "music" : "sfx"));
    if (!covered) reasons.push(`${subject} call has no compiled audible cue`);
  } else if (namespace === "state") {
    covered = hasLifecycle;
    if (!covered) reasons.push("state call has no renderer-consumed lifecycle state event");
  } else if (namespace === "face") {
    covered = hasFace;
    if (!covered) reasons.push("face call has no renderer-consumed expression event");
  } else if (namespace === "look") {
    covered = hasBone || hasBindingTrack;
    if (!hasGaze) reasons.push("gaze call has no compiled gaze track");
    else if (!covered) reasons.push("compiled gaze track is not projected into renderer face/gaze state");
  } else {
    covered = hasBone || hasBindingTrack;
    if (!covered) reasons.push("visual call has no renderer-consumed bone/movement or binding event with payload");
  }
  if (covered) reasons.push(`renderer consumes ${rendererTrackKinds.join(", ") || cues.map((cue) => `${cue.kind} cue`).join(", ")}`);
  return {
    procedure: kind,
    classes,
    event: event ? {kind: string(event.kind) ?? "unknown", subject: string(event.subject) ?? "", start: number(event.start) ?? 0, end: number(event.end) ?? 0, ...((() => { const source = string(event.source); return source ? {source} : {}; })())} : null,
    eventTiming: event ? {start: number(event.start) ?? 0, end: number(event.end) ?? 0, duration: (number(event.end) ?? 0) - (number(event.start) ?? 0)} : null,
    trackKinds,
    rendererTrackKinds,
    audibleCues: cues,
    status: covered ? "covered" : "uncovered",
    reason: reasons,
  };
}

export function auditCallCoverage(input: CallCoverageInput): CallCoverageReceipt {
  const occurrences = enumerateInlineCalls(input.episode);
  const rows: CallCoverageRow[] = [];
  const byScene = new Map<string, RecordValue[]>();
  for (const occurrence of occurrences) if (!byScene.has(occurrence.scene)) byScene.set(occurrence.scene, sceneEvents(input.performance, occurrence.scene));
  const used = new Set<RecordValue>();
  for (const [index, occurrence] of occurrences.entries()) {
    const events = byScene.get(occurrence.scene) ?? [];
    const event = occurrence.parsed.namespace === "say" ? speechEvent(occurrence, events, used) : matchEvent(occurrence, events, used);
    if (event) used.add(event);
    const evaluated = evaluateRow(occurrence, event);
    rows.push({index, scene: occurrence.scene, statement: occurrence.statement, actor: occurrence.actor, group: occurrence.group, call: occurrence.call, sourceStart: occurrence.sourceStart, rawCall: occurrence.raw, ...evaluated});
  }
  const byClass: CallCoverageReceipt["summary"]["byClass"] = {};
  for (const row of rows) for (const className of row.classes) {
    const counts = byClass[className] ?? {covered: 0, uncovered: 0};
    counts[row.status]++;
    byClass[className] = counts;
  }
  const uncoveredClasses = Object.keys(byClass).filter((className) => byClass[className]!.uncovered > 0).sort();
  return {
    generatedBy: "tools/asset-qa/call-coverage.ts",
    deterministic: true,
    episode: string(record(input.episode)?.episode && record(record(input.episode)?.episode)?.id) ?? "unknown",
    source: {episode: input.episodePath ?? "episode.yml", performance: input.performancePath ?? "performance.json"},
    summary: {calls: rows.length, covered: rows.filter((row) => row.status === "covered").length, uncovered: rows.filter((row) => row.status === "uncovered").length, byClass, uncoveredClasses},
    calls: rows,
  };
}

function displayPath(path: string, root: string): string {
  return relative(root, path).split("\\").join("/") || path;
}

export function runCallCoverage(episodePath: string, performancePath: string, outputPath: string): CallCoverageReceipt {
  const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
  const episode = parse(readFileSync(episodePath, "utf8"));
  const performance = JSON.parse(readFileSync(performancePath, "utf8"));
  const receipt = auditCallCoverage({episode, performance, episodePath: displayPath(episodePath, root), performancePath: displayPath(performancePath, root)});
  mkdirSync(dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, JSON.stringify(receipt, null, 2) + "\n");
  return receipt;
}

function main(): void {
  const root = resolve(dirname(new URL(import.meta.url).pathname), "../..");
  const episodeDir = resolve(root, process.argv[2] ?? "episodes/ai-work-adventure");
  const episodePath = episodeDir.endsWith("episode.yml") ? episodeDir : join(episodeDir, "episode.yml");
  const performancePath = process.argv[3] ? resolve(root, process.argv[3]) : join(dirname(episodePath), "performance.json");
  const outputPath = process.argv[4] ? resolve(root, process.argv[4]) : join(dirname(episodePath), "build", "asset-qa", "call-coverage.json");
  const receipt = runCallCoverage(episodePath, performancePath, outputPath);
  console.log(`call coverage: ${receipt.summary.covered}/${receipt.summary.calls} covered`);
  console.log(`receipt: ${outputPath}`);
  if (receipt.summary.uncovered) {
    console.error(`uncovered classes: ${receipt.summary.uncoveredClasses.join(", ")}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
