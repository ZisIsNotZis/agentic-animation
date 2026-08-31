import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVisualSamplingManifest, assertVisualSamplingManifest } from "./visual-sampling";

const row = (overrides: Record<string, unknown> = {}) => ({
  episode: {id: "test"},
  scenes: [{id: "scene", script: [{alice: "{alice.act.wave()}"}]}],
  ...overrides,
});

const performance = (track: Record<string, unknown>, start = 1, end = 2) => ({
  video: {width: 1920, height: 1080, fps: 24},
  timebase: "frames",
  tracks: [{...track, subject: "alice", events: (track.events as Array<Record<string, unknown>>).map((event) => ({...event, frame: 24 + Number(event.at ?? 0) * 24, durationFrames: Number(event.duration ?? 0) * 24}))}],
  performanceTracks: [{subject: "alice", events: [{
    kind: "call", subject: "alice", start, end,
    call: {raw: "alice.act.wave()", path: "alice.act.wave"},
    source: "inline", tracks: [track],
  }]}],
});

test("samples every visual call at deterministic start, peak, and recovery frames", () => {
  const manifest = buildVisualSamplingManifest({
    episode: row(),
    performance: performance({kind: "bone", events: [{at: 0, duration: 1, value: {action: "wave", parts: ["arm_u_r"]}}]}),
  });
  assert.equal(manifest.summary.inlineCalls, 1);
  assert.equal(manifest.summary.visualCalls, 1);
  assert.equal(manifest.summary.samples, 6);
  assert.deepEqual(manifest.calls[0]!.samples.map((sample) => sample.role), ["start", "peak", "recovery"]);
  assert.deepEqual(manifest.calls[0]!.samples.map((sample) => sample.frame), [24, 36, 47]);
  assert.equal(manifest.calls[0]!.channelSamples.length, 3);
  assert.ok(manifest.calls[0]!.channelSamples.some((sample) => sample.observedVisibleChannels.includes("body")));
  assert.doesNotThrow(() => assertVisualSamplingManifest(manifest));
});

test("fails when a visual call has no start/peak/recovery sampling", () => {
  const manifest = buildVisualSamplingManifest({
    episode: row(),
    performance: performance({kind: "bone", events: [{at: 0, duration: 1, value: {action: "wave", parts: ["arm_u_r"]}}]}),
  });
  manifest.calls[0]!.samples.pop();
  assert.throws(() => assertVisualSamplingManifest(manifest), /missing start\/peak\/recovery/);
});

test("samples a short prop-binding window at its own deterministic channel frames", () => {
  const manifest = buildVisualSamplingManifest({
    episode: row(),
    performance: performance({kind: "binding", events: [{at: 0.62, duration: 0.01, value: {operation: "release", object: "thermos", holder: "alice"}}]}),
  });
  assert.equal(manifest.calls[0]!.expectedVisibleChannels.includes("prop-binding"), true);
  assert.ok(manifest.calls[0]!.channelSamples.some((sample) => sample.channel === "prop-binding" && sample.frame === 39));
});

test("fails zero-duration visual tracks even when coverage has a track name", () => {
  const manifest = buildVisualSamplingManifest({
    episode: row(),
    performance: performance({kind: "bone", events: [{at: 0, duration: 0, value: {action: "wave", parts: ["arm_u_r"]}}]}, 1, 1),
  });
  assert.equal(manifest.calls[0]!.status, "unobservable");
  assert.match(manifest.calls[0]!.reason.join("; "), /zero duration|unobservable/);
  assert.throws(() => assertVisualSamplingManifest(manifest), /visual call has zero duration|unobservable/);
});
