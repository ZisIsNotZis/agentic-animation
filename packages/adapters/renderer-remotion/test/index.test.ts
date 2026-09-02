import assert from "node:assert/strict";
import { join, resolve } from "node:path";
function repoRoot(): string {
  return resolve(import.meta.dirname ?? ".", "..", "..", "..", "..");
}

import { test } from "node:test";
import { muxArguments, performanceAudioInputs, performanceFramePlan, performanceSubtitles } from "../src/index";

test("performance frame plan limits duration and counts the inclusive rendered range", () => {
  assert.deepEqual(performanceFramePlan({durationInFrames: 100, fps: 24}, 1), {
    frameRange: [0, 23],
    frames: 24,
    durationSec: 1,
  });
  assert.deepEqual(performanceFramePlan({durationInFrames: 10, fps: 24}, 1), {
    frameRange: [0, 9],
    frames: 10,
    durationSec: 10 / 24,
  });
});

test("performance subtitles preserve preparation text and align it to compiled speech starts", () => {
  const result = performanceSubtitles({
    video: {width: 320, height: 180, fps: 10},
    duration: 4,
    performanceTracks: [
      {subject: "alice", kind: "actor", events: [{kind: "speech", subject: "alice", start: 1, end: 2, text: "hello"}]},
    ],
    audio: {
      takes: [{
        actor: "alice",
        text: "hello",
        captions: [{startSec: 0, endSec: 1, text: "hello"}],
      }],
    },
  } as any);
  assert.equal(result, "1\n00:00:01,000 --> 00:00:02,000\nhello\n");
});

test("performance subtitles keep an already absolute preparation start absolute", () => {
  const result = performanceSubtitles({
    video: {width: 320, height: 180, fps: 10},
    performanceTracks: [{subject: "alice", kind: "actor", events: [{kind: "speech", subject: "alice", start: 1, end: 2, text: "hello"}]}],
    audio: {takes: [{actor: "alice", text: "hello", timing: {startSec: 2}, captions: [{startSec: 2, endSec: 3, text: "hello"}]}]},
  } as any);
  assert.equal(result, "1\n00:00:02,000 --> 00:00:03,000\nhello\n");
});

test("extracts recipe audio at absolute event time and resolves manifest-embedded cues", () => {
  const cueFile = join(repoRoot(), "library", "music", "cues", "ending-cadence.wav");
  const inputs = performanceAudioInputs({
    video: {width: 320, height: 180, fps: 10},
    timebase: "seconds",
    audio: {cues: {"ending-cadence": {kind: "music", path: cueFile}}},
    performanceTracks: [{subject: "music", events: [{kind: "call", start: 4, end: 7, tracks: [
      {kind: "music", events: [{at: 1.25, duration: 2.8, value: {cue: "ending-cadence", kind: "music", gain: 0.72}}]},
    ]}]}],
  } as any, "/tmp/performance.json");
  assert.equal(inputs.length, 1);
  assert.equal(inputs[0]!.startSec, 5.25);
  assert.equal(inputs[0]!.gain, 0.72);
  assert.equal(inputs[0]!.path, cueFile);
});

test("fails closed when a manifest has no embedded cue block", () => {
  assert.throws(() => performanceAudioInputs({
    video: {width: 320, height: 180, fps: 10},
    performanceTracks: [{subject: "sfx", events: [{kind: "call", start: 1, end: 2, tracks: [
      {kind: "sfx", events: [{at: 0, value: {cue: "x", kind: "sfx"}}]},
    ]}]}],
  } as any, "/tmp/performance.json"), /manifest\.audio\.cues is missing/);
});

test("mux arguments include voice and recipe cues with delayed, gained mixing", () => {
  const args = muxArguments("silent.mp4", [
    {path: "voice.wav", startSec: 0, kind: "speech"},
    {path: "hit.wav", startSec: 5.25, durationSec: 0.3, gain: 0.72, kind: "sfx", cue: "hit"},
  ], undefined, "out.mp4", 8);
  assert.deepEqual(args.filter((value) => value === "-i").length, 3);
  const filter = args[args.indexOf("-filter_complex") + 1]!;
  assert.match(filter, /\[2:a\]atrim=duration=0\.3,volume=0\.72,adelay=5250:all=1\[a1\]/);
  assert.match(filter, /amix=inputs=2:duration=longest:normalize=0/);
  assert.deepEqual(args.slice(-5), ["-movflags", "+faststart", "-t", "8", "out.mp4"]);
});

test("fails closed when a recipe cue is absent from the embedded cue block", () => {
  assert.throws(() => performanceAudioInputs({
    video: {width: 320, height: 180, fps: 10},
    audio: {cues: {}},
    performanceTracks: [{subject: "sfx", events: [{kind: "call", start: 1, end: 2, tracks: [
      {kind: "sfx", events: [{at: 0, value: {cue: "not-in-catalog", kind: "sfx"}}]},
    ]}]}],
  } as any, "/tmp/performance.json"), /missing audio cue/);
});
