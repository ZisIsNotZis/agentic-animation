#!/usr/bin/env node
/** Generate the small, deterministic cue library used by the renderer QA path. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const audioDir = join(root, "library", "audio");
const sampleRate = 48_000;

const cues = {
  "sip": ["sfx", 0.30, 520],
  "paper-unroll": ["sfx", 0.70, 180],
  "reveal-chime": ["sfx", 0.30, 880],
  "paper-rattle": ["sfx", 0.35, 240],
  "push-thump": ["sfx", 0.18, 90],
  "desk-slam": ["sfx", 0.20, 70],
  "laugh": ["sfx", 0.50, 420],
  "flashlight-click": ["sfx", 0.12, 1_200],
  "keyboard-taps": ["sfx", 0.75, 740],
  "shiver-rattle": ["sfx", 0.30, 330],
  "object-whoosh": ["sfx", 0.22, 260],
  "pen-scratch": ["sfx", 0.65, 190],
  "close-click": ["sfx", 0.12, 1_000],
  "error-chime": ["sfx", 0.35, 310],
  "digital-glitch": ["sfx", 0.55, 680],
  "power-down": ["sfx", 0.25, 150],
  "power-up": ["sfx", 0.22, 260],
  "error-burst": ["sfx", 0.45, 180],
  "paper-snap": ["sfx", 0.30, 420],
  "static-buzz": ["sfx", 0.60, 110],
  "light-switch": ["sfx", 0.18, 720],
  "ending-cadence": ["music", 2.80, 220],
};

function wav(kind, duration, frequency) {
  const count = Math.max(1, Math.round(duration * sampleRate));
  const data = Buffer.alloc(count * 2);
  let state = 0x9e3779b9;
  for (let i = 0; i < count; i++) {
    state = (1664525 * state + 1013904223) >>> 0;
    const noise = ((state >>> 8) / 0x00ffffff) * 2 - 1;
    const t = i / sampleRate;
    const attack = Math.min(1, t / 0.012);
    const release = Math.min(1, Math.max(0, (duration - t) / 0.08));
    const envelope = attack * release;
    const tone = Math.sin(2 * Math.PI * frequency * t) * (kind === "music" ? 0.38 : 0.24);
    const harmonic = Math.sin(2 * Math.PI * frequency * 1.5 * t) * (kind === "music" ? 0.18 : 0.08);
    const sample = (tone + harmonic + noise * (kind === "music" ? 0.015 : 0.16)) * envelope * 0.72;
    data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(sample * 32767))), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22); header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

mkdirSync(join(audioDir, "sfx"), { recursive: true });
mkdirSync(join(audioDir, "music"), { recursive: true });
const catalog = { version: 1, generatedBy: "tools/audio-qa/generate-cues.mjs", cues: {} };
for (const [cue, [kind, duration, frequency]] of Object.entries(cues)) {
  const folder = kind === "music" ? "music" : "sfx";
  const path = join(folder, `${cue}.wav`);
  writeFileSync(join(audioDir, path), wav(kind, duration, frequency));
  catalog.cues[cue] = { kind, path };
}
writeFileSync(join(audioDir, "catalog.json"), `${JSON.stringify(catalog, null, 2)}\n`);
