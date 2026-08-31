import { test } from "node:test";
import assert from "node:assert/strict";
import { auditCallCoverage, enumerateInlineCalls } from "./call-coverage";

const episode = (text: string) => ({
  episode: {id: "test"},
  scenes: [{id: "scene", script: [{alice: text}]}],
});

const callEvent = (raw: string, tracks: unknown[]) => ({
  kind: "call", subject: "alice", start: 1, end: 2,
  call: {raw, path: raw.slice(0, raw.indexOf("(")), subject: "alice"}, source: "inline", tracks,
});

test("enumerates every call in concurrent groups in source order", () => {
  const calls = enumerateInlineCalls(episode("before {alice.face.happy(), camera.use.wide(), sfx.play.hit()} after"));
  assert.deepEqual(calls.map((call) => call.raw), ["alice.face.happy()", "camera.use.wide()", "sfx.play.hit()"]);
  assert.equal(calls[0]!.sourceStart, calls[1]!.sourceStart);
});

test("requires renderer-effective payloads, not merely track names", () => {
  const result = auditCallCoverage({
    episode: episode("{alice.act.wave()}{alice.face.happy()}{camera.use.wide()}{sfx.play.hit()}"),
    performance: {sceneTrack: [{id: "scene", performanceTracks: [{subject: "alice", events: [
      callEvent("alice.act.wave()", [{kind: "bone", events: [{parts: ["arm_u_r"]}]}]),
      callEvent("alice.face.happy()", [{kind: "expression", events: [{value: {emotion: "happy"}}]}]),
    ]}, {subject: "camera", events: [{kind: "call", subject: "camera", start: 1, end: 2, call: {raw: "camera.use.wide()", path: "camera.use.wide"}, tracks: [{kind: "camera", events: [{value: {zoom: 0.7}}]}]}]}, {subject: "sfx", events: [{kind: "call", subject: "sfx", start: 1, end: 2, call: {raw: "sfx.play.hit()", path: "sfx.play.hit"}, tracks: [{kind: "sfx", events: [{value: {cue: "hit", kind: "sfx"}}]}]}]}]}]},
  });
  assert.deepEqual(result.summary.uncoveredClasses, ["camera"]);
  assert.equal(result.summary.uncovered, 1);
  assert.equal(result.calls[2]!.reason[0], "camera track has no renderer-consumed x/y/z/rotation key; zoom/operation alone is a no-op");
  assert.equal(result.calls[3]!.status, "covered");
});

test("flags gaze-only calls that are not projected into renderer face state", () => {
  const result = auditCallCoverage({
    episode: episode("{alice.look.at(bob)}"),
    performance: {sceneTrack: [{id: "scene", performanceTracks: [{subject: "alice", events: [callEvent("alice.look.at(bob)", [{kind: "gaze", events: [{target: "bob"}]}])]}]}]},
  });
  assert.equal(result.calls[0]!.status, "uncovered");
  assert.match(result.calls[0]!.reason[0]!, /not projected/);
});

test("classifies mixed procedure effects and supports a top-level compiled track list", () => {
  const result = auditCallCoverage({
    episode: episode("{alice.face.laughing()}{alice.voice.interrupt(bob)}"),
    performance: {performanceTracks: [{subject: "alice", events: [
      callEvent("alice.face.laughing()", [{kind: "expression", events: [{value: {emotion: "laughing"}}]}, {kind: "sfx", events: [{value: {cue: "laugh", kind: "sfx"}}]}]),
      callEvent("alice.voice.interrupt(bob)", [{kind: "bone", events: [{parts: ["head"]}]}]),
    ]}]},
  });
  assert.deepEqual(result.summary.uncoveredClasses, []);
  assert.deepEqual(result.calls.map((call) => call.classes), [["sfx", "visual"], ["speech", "visual"]]);
});

test("recognizes compiled music tracks as audible coverage", () => {
  const result = auditCallCoverage({
    episode: episode("{music.play.ending()}"),
    performance: {performanceTracks: [{subject: "music", events: [
      {...callEvent("music.play.ending()", [{kind: "music", events: [{value: {cue: "ending-cadence", kind: "music"}}]}]), subject: "music"},
    ]}]},
  });
  assert.equal(result.calls[0]!.status, "covered");
  assert.deepEqual(result.calls[0]!.audibleCues, [{kind: "music", cue: "ending-cadence"}]);
});
