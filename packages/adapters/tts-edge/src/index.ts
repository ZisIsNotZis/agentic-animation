import { mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { execa } from "execa";
import { notReadyCheck, type AdapterRegistration, type BoundaryAlignment, type Check, type TtsAdapter, type VoiceInfo } from "@anim/core";

export interface EdgeVoiceDelivery {
  providerVoice: string;
  rate: string;
  pitch: string;
}

const VOICES: VoiceInfo[] = [
  { id: "zh-CN-YunxiaNeural", name: "云夏（卡通）", lang: "zh" },
  { id: "zh-CN-YunxiNeural", name: "云希（活泼男声）", lang: "zh" },
  { id: "zh-CN-YunyangNeural", name: "云扬（专业男声）", lang: "zh" },
  { id: "zh-CN-XiaoxiaoNeural", name: "晓晓（自然女声）", lang: "zh" },
];

/** Immutable library voice IDs are the authoring contract; Edge IDs are delivery details. */
export const EDGE_VOICE_DELIVERY: Readonly<Record<string, EdgeVoiceDelivery>> = {
  "voice.zh.awei.v1": { providerVoice: "zh-CN-YunxiNeural", rate: "+8%", pitch: "+2Hz" },
  "voice.zh.aqiang.v1": { providerVoice: "zh-CN-YunyangNeural", rate: "-6%", pitch: "-6Hz" },
};

export function edgeVoiceDelivery(voiceAsset: string): EdgeVoiceDelivery {
  return EDGE_VOICE_DELIVERY[voiceAsset] ?? {
    providerVoice: VOICES.some((voice) => voice.id === voiceAsset) ? voiceAsset : VOICES[0]!.id,
    rate: "+0%",
    pitch: "+0Hz",
  };
}

export function edgeVoiceCacheIdentity(voiceAsset: string): string {
  return JSON.stringify({asset: voiceAsset, delivery: edgeVoiceDelivery(voiceAsset)});
}

export function edgeVoiceArgs(req: { text: string; voice: string; outPath: string }, mp3 = `${req.outPath}.mp3`): string[] {
  const delivery = edgeVoiceDelivery(req.voice);
  return ["--voice", delivery.providerVoice, `--rate=${delivery.rate}`, `--pitch=${delivery.pitch}`, "--text", req.text, "--write-media", mp3];
}
export interface EdgeSubtitleCue {
  text: string;
  startSec: number;
  endSec: number;
}

function parseTimestamp(value: string): number | undefined {
  const parts = value.trim().split(":");
  if (parts.length !== 2 && parts.length !== 3) return undefined;
  const secondsPart = parts.pop()!;
  const seconds = Number(secondsPart.replace(/([,.])/, "."));
  if (!Number.isFinite(seconds) || seconds < 0 || seconds >= 60) return undefined;
  const minutes = Number(parts.pop());
  if (!Number.isInteger(minutes) || minutes < 0 || minutes >= 60) return undefined;
  const hours = parts.length ? Number(parts[0]) : 0;
  if (!Number.isInteger(hours) || hours < 0) return undefined;
  return hours * 3600 + minutes * 60 + seconds;
}

/** Parse the SRT emitted by edge-tts, and WebVTT with the same cue format. */
export function parseSubtitleBoundaries(source: string): EdgeSubtitleCue[] {
  const lines = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const cues: EdgeSubtitleCue[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(/^\s*(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/);
    if (!match) continue;
    const startSec = parseTimestamp(match[1]!);
    const endSec = parseTimestamp(match[2]!);
    if (startSec === undefined || endSec === undefined || endSec < startSec) continue;
    const text: string[] = [];
    for (i++; i < lines.length && lines[i]!.trim(); i++) {
      if (/^\s*\S+\s+-->\s+\S+/.test(lines[i]!)) {
        i--;
        break;
      }
      text.push(lines[i]!);
    }
    const content = text.join("\n").trim();
    if (content) cues.push({ text: content, startSec, endSec });
  }
  return cues;
}

interface SearchChar { value: string; start: number; end: number; }

function searchable(text: string): SearchChar[] {
  const result: SearchChar[] = [];
  for (let offset = 0; offset < text.length;) {
    const codePoint = text.codePointAt(offset)!;
    const value = String.fromCodePoint(codePoint);
    const end = offset + value.length;
    if (!/[\p{White_Space}\p{P}]/u.test(value)) result.push({ value, start: offset, end });
    offset = end;
  }
  return result;
}

function hasTrailingPunctuation(text: string): boolean {
  const trimmed = text.trimEnd();
  return trimmed.length > 0 && /\p{P}$/u.test(trimmed);
}

/** Map provider cue text to cleaned-input offsets without guessing unmatched cues. */
export function mapSubtitleBoundaries(text: string, cues: readonly EdgeSubtitleCue[]): BoundaryAlignment[] {
  const source = searchable(text);
  const boundaries: BoundaryAlignment[] = [];
  let searchFrom = 0;
  for (const cue of cues) {
    const needle = searchable(cue.text);
    let found = -1;
    if (needle.length) {
      for (let at = searchFrom; at <= source.length - needle.length; at++) {
        if (needle.every((part, index) => part.value === source[at + index]!.value)) {
          found = at;
          break;
        }
      }
    }
    if (found < 0) {
      boundaries.push({ kind: "word", text: cue.text, startSec: cue.startSec, endSec: cue.endSec });
      continue;
    }
    const first = source[found]!;
    const last = source[found + needle.length - 1]!;
    let endChar = last.end;
    if (hasTrailingPunctuation(cue.text)) {
      while (endChar < text.length) {
        const value = String.fromCodePoint(text.codePointAt(endChar)!);
        if (!/\p{P}/u.test(value)) break;
        endChar += value.length;
      }
    }
    boundaries.push({
      kind: "word",
      text: cue.text,
      startSec: cue.startSec,
      endSec: cue.endSec,
      startChar: first.start,
      endChar,
    });
    searchFrom = found + needle.length;
  }
  return boundaries;
}

type SynthesisRequest = Parameters<TtsAdapter["synthesize"]>[0];

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function retryEdgeRequest(
  run: () => Promise<unknown>,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await run();
      return;
    } catch (err) {
      await wait(Math.min(8000, 500 * 2 ** attempt));
    }
  }
}

async function synthesizeEdge(req: SynthesisRequest, subtitlePath?: string): Promise<{ path: string; durationSec: number }> {
  if (!req.text.trim()) throw new Error("tts:edge — empty text");
  mkdirSync(dirname(req.outPath), { recursive: true });
  const mp3 = `${req.outPath}.mp3`;
  const args = edgeVoiceArgs(req, mp3);
  if (subtitlePath) args.push("--write-subtitles", subtitlePath);
  // Use --rate=value: argparse otherwise treats a leading '+' as a new flag.
  await retryEdgeRequest(() => execa("edge-tts", args));
  await execa("ffmpeg", ["-y", "-v", "error", "-i", mp3, "-ar", "44100", "-ac", "1", "-c:a", "pcm_s16le", req.outPath]);
  const { stdout } = await execa("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", req.outPath]);
  return { path: req.outPath, durationSec: Number(stdout.trim()) };
}

export const adapter: TtsAdapter & {
  synthesizeWithBoundaries(req: SynthesisRequest): Promise<{ path: string; durationSec: number; boundaries: BoundaryAlignment[] }>;
  cacheIdentityForVoice(voiceAsset: string): string;
} = {
  id: "edge",
  async synthesize(req) {
    return synthesizeEdge(req);
  },
  async synthesizeWithBoundaries(req) {
    const subtitlePath = `${req.outPath}.srt`;
    const result = await synthesizeEdge(req, subtitlePath);
    return { ...result, boundaries: mapSubtitleBoundaries(req.text, parseSubtitleBoundaries(readFileSync(subtitlePath, "utf8"))) };
  },
  cacheIdentityForVoice(voiceAsset) {
    return edgeVoiceCacheIdentity(voiceAsset);
  },
  async listVoices(lang) { return lang && lang !== "zh" ? [] : VOICES; },
  async doctor(): Promise<Check[]> {
    try { await execa("edge-tts", ["--version"]); return [{ name: "tts:edge present", ok: true, detail: "Edge neural Chinese voices (network required)" }]; }
    catch { return [notReadyCheck("tts:edge", "edge-tts not found", "Run: uv tool install edge-tts")]; }
  },
};
export default { kind: "tts", adapter } satisfies AdapterRegistration;
