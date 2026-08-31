import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { edgeVoiceArgs, edgeVoiceCacheIdentity, mapSubtitleBoundaries, parseSubtitleBoundaries, retryEdgeRequest } from "../src/index";

const fixtures = join(dirname(fileURLToPath(import.meta.url)), "fixtures");

test("maps immutable voice assets to distinct Edge voice, rate, and pitch arguments", () => {
  const awei = edgeVoiceArgs({ text: "我先试试。", voice: "voice.zh.awei.v1", outPath: "/tmp/awei.wav" });
  const aqiang = edgeVoiceArgs({ text: "稳一点。", voice: "voice.zh.aqiang.v1", outPath: "/tmp/aqiang.wav" });
  assert.deepEqual(awei.slice(0, 6), ["--voice", "zh-CN-YunxiNeural", "--rate=+8%", "--pitch=+2Hz", "--text", "我先试试。"]);
  assert.deepEqual(aqiang.slice(0, 6), ["--voice", "zh-CN-YunyangNeural", "--rate=-6%", "--pitch=-6Hz", "--text", "稳一点。"]);
  assert.notDeepEqual(awei.slice(0, 4), aqiang.slice(0, 4));
  assert.notEqual(edgeVoiceCacheIdentity("voice.zh.awei.v1"), edgeVoiceCacheIdentity("voice.zh.aqiang.v1"));
});

test("retries one Edge request internally beyond the old attempt limit", async () => {
  let calls = 0;
  const waits: number[] = [];
  await retryEdgeRequest(async () => {
    calls++;
    if (calls < 7) throw new Error("NoAudioReceived");
  }, async (ms) => { waits.push(ms); });
  assert.equal(calls, 7);
  assert.deepEqual(waits, [500, 1000, 2000, 4000, 8000, 8000]);
});

test("parses exact SRT cue timing and text", () => {
  const cues = parseSubtitleBoundaries(readFileSync(join(fixtures, "boundaries.srt"), "utf8"));
  assert.deepEqual(cues, [
    { text: "先说，", startSec: 0, endSec: 0.42 },
    { text: "重点。", startSec: 0.42, endSec: 1.1 },
    { text: "无法匹配的片段", startSec: 1.1, endSec: 1.6 },
  ]);
});

test("parses WebVTT cue settings and maps punctuation/whitespace monotonically", () => {
  const cues = parseSubtitleBoundaries(readFileSync(join(fixtures, "boundaries.vtt"), "utf8"));
  assert.deepEqual(cues, [
    { text: "Hello", startSec: 0, endSec: 0.25 },
    { text: "world!", startSec: 0.25, endSec: 1.125 },
  ]);
  assert.deepEqual(mapSubtitleBoundaries("Hello,  world", cues), [
    { kind: "word", text: "Hello", startSec: 0, endSec: 0.25, startChar: 0, endChar: 5 },
    { kind: "word", text: "world!", startSec: 0.25, endSec: 1.125, startChar: 8, endChar: 13 },
  ]);
});

test("does not invent offsets when a cue cannot be matched", () => {
  const cues = parseSubtitleBoundaries(readFileSync(join(fixtures, "boundaries.srt"), "utf8"));
  assert.deepEqual(mapSubtitleBoundaries("先说 重点。", cues), [
    { kind: "word", text: "先说，", startSec: 0, endSec: 0.42, startChar: 0, endChar: 2 },
    { kind: "word", text: "重点。", startSec: 0.42, endSec: 1.1, startChar: 3, endChar: 6 },
    { kind: "word", text: "无法匹配的片段", startSec: 1.1, endSec: 1.6 },
  ]);
});

test("keeps repeated cue matches in input order", () => {
  const cues = [
    { text: "ha!", startSec: 0, endSec: 0.2 },
    { text: "ha", startSec: 0.2, endSec: 0.4 },
  ];
  assert.deepEqual(mapSubtitleBoundaries("ha, ha", cues), [
    { kind: "word", text: "ha!", startSec: 0, endSec: 0.2, startChar: 0, endChar: 3 },
    { kind: "word", text: "ha", startSec: 0.2, endSec: 0.4, startChar: 4, endChar: 6 },
  ]);
});
