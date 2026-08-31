import {test} from "node:test";
import assert from "node:assert/strict";
import {buildYamlAudioPreparation, cleanSpokenText, createYamlAudioCacheKey, segmentYamlAudio, type YamlAudioSource} from "../src/audio";

const source: YamlAudioSource = {
  episodeId: "demo", actors: {awei: {voice: "voice.zh.aw.v1"}, xiaohong: {voice: "voice.zh.xh.v1"}},
  scenes: [{id: "opening", script: [{actor: "awei", text: "先说 {awei.voice.speed(1.5), awei.say(\"打断\")}重点。然后继续。"}]}],
};

test("cleanSpokenText removes concurrent call groups and preserves spoken text", () => {
  const cleaned = cleanSpokenText(source.scenes[0]!.script[0]!.text);
  assert.equal(cleaned.text, "先说 重点。然后继续。");
  assert.equal(cleaned.removed[0]!.raw, "{awei.voice.speed(1.5), awei.say(\"打断\")}");
});

test("segments at brace boundaries, applies voice state forward, and preserves interruption", () => {
  const chunks = segmentYamlAudio(source);
  assert.deepEqual(chunks.map(({id, text, speed}) => ({id, text, speed})), [
    {id: "opening.0.0", text: "先说 ", speed: 1},
    {id: "opening.0.interrupt", text: "打断", speed: 1.5},
    {id: "opening.0.1", text: "重点。然后继续。", speed: 1.5},
  ]);
  assert.equal(chunks[1]!.interruptOf, "opening.0");
});

test("preparation uses measured chunk timings and exact subtitle/lip text", () => {
  const prepared = buildYamlAudioPreparation(source, {profile: "storyteller", compilerVersion: "v", measurements: {
    "opening.0.0": {durationSec: 0.5}, "opening.0.interrupt": {durationSec: 0.2}, "opening.0.1": {durationSec: 1.1},
  }});
  assert.deepEqual(prepared.takes.map((take) => take.text), ["先说 ", "打断", "重点。然后继续。"]);
  assert.deepEqual(prepared.takes.map((take) => take.captions.length), [1, 1, 1]);
  assert.deepEqual(prepared.takes.map((take) => take.lipSync.text), prepared.takes.map((take) => take.text));
});

test("ellipsis-only chunks become configured silence without captions", () => {
  const prepared = buildYamlAudioPreparation({episodeId: "demo", actors: source.actors, scenes: [{id: "s", script: [{actor: "awei", text: "……"}]}]}, {profile: "p", compilerVersion: "v", standardBeatSec: 0.4});
  assert.equal(prepared.takes[0]!.durationSec, 0.8);
  assert.equal(prepared.takes[0]!.silence, true);
  assert.deepEqual(prepared.takes[0]!.captions, []);
});

test("cache identity includes voice speed", () => {
  const base = {text: "说话。", voiceAsset: "voice.a.v1", profile: "p", compilerVersion: "v"};
  assert.notEqual(createYamlAudioCacheKey({...base, speed: 1}), createYamlAudioCacheKey({...base, speed: 2}));
});
