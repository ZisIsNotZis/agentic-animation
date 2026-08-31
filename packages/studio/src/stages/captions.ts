/**
 * `anim captions` — derive `dist/captions.srt` from `timeline.json` display
 * text. Ported from the previous engine's captions.mjs: split each scene's
 * display text into ~88-char chunks and distribute each chunk's on-screen time
 * proportionally to its length across the scene's narration window. `render`
 * muxes this as a soft `mov_text` track when present.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readJson, ScriptSchema, TimelineSchema, type Logger } from "@anim/core";

const MAX_CHUNK = 88;

/** Split display text into caption chunks at sentence enders, capped at 88 chars. */
export function subChunks(text: string): string[] {
  const parts = text.match(/[^.!?—]+[.!?…]*(\s*—\s*)?/g) ?? [text];
  const chunks: string[] = [];
  let cur = "";
  for (const p of parts) {
    if ((cur + p).length > MAX_CHUNK && cur) {
      chunks.push(cur.trim());
      cur = p;
    } else {
      cur += p;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

/** SRT timestamp `HH:MM:SS,mmm`. */
export function srtStamp(t: number): string {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor(ms / 60000) % 60;
  const s = Math.floor(ms / 1000) % 60;
  const r = ms % 1000;
  const p = (n: number, w = 2): string => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
}

export interface CaptionsOptions {
  /** Absolute path to `episodes/<slug>/`. */
  episodeDir: string;
  log?: Logger;
}

export interface CaptionsResult {
  srtPath: string;
  cues: number;
}

export function captions(opts: CaptionsOptions): CaptionsResult {
  const timeline = readJson(join(opts.episodeDir, "timeline.json"), TimelineSchema);
  const script = readJson(join(opts.episodeDir, "script.json"), ScriptSchema);
  const blocks: string[] = [];
  let n = 0;

  for (const sc of timeline.scenes) {
    const sceneScript = script.scenes.find((s) => s.id === sc.id);
    const lines = sceneScript?.dialogue ?? [];
    const text = lines.length ? "" : (sc.display ?? sc.name ?? "");
    if (lines.length) {
      const dialogue = sc.dialogue ?? [];
      if (dialogue.length) {
        for (const line of lines) {
          const timed = dialogue.find((d) => d.id === line.id);
          if (!timed || timed.dur <= 0) continue;
          const chunks = subChunks(line.tts);
          const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0) || 1;
          let at = timed.start;
          for (const chunk of chunks) {
            const dur = timed.dur * (chunk.length / totalChars);
            blocks.push(`${++n}\n${srtStamp(at)} --> ${srtStamp(at + dur)}\n${chunk}\n`);
            at += dur;
          }
        }
      } else {
        const totalChars = lines.reduce((n, l) => n + l.tts.length, 0) || 1;
        let at = sc.narrAt;
        for (const line of lines) {
          const d = sc.narrDur * (line.tts.length / totalChars);
          blocks.push(`${++n}\n${srtStamp(at)} --> ${srtStamp(at + d)}\n${line.tts}\n`);
          at += d;
        }
      }
      continue;
    }
    if (!text.trim() || sc.narrDur <= 0) continue;
    const chunks = subChunks(text);
    const totalChars = chunks.reduce((a, c) => a + c.length, 0) || 1;
    let at = sc.narrAt;
    for (const c of chunks) {
      const d = sc.narrDur * (c.length / totalChars);
      blocks.push(`${++n}\n${srtStamp(at)} --> ${srtStamp(at + d)}\n${c}\n`);
      at += d;
    }
  }

  const distDir = join(opts.episodeDir, "dist");
  mkdirSync(distDir, { recursive: true });
  const srtPath = join(distDir, "captions.srt");
  writeFileSync(srtPath, blocks.join("\n"));
  opts.log?.info(`captions: wrote ${n} cue(s) to ${srtPath}.`);
  return { srtPath, cues: n };
}
