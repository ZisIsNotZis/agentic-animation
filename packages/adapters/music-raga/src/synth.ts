/**
 * Deterministic raga score synthesis — pure math, no samples, no AI, no
 * licensing surface. Ported from the previous engine's `music.mjs` (the proven
 * BASE→RAGA→MOOD→SCENE hierarchy) into typed, self-contained TS.
 *
 *   BASE   tanpura drone (Karplus-Strong pa-SA-SA-sa cycle) + per-mood tala grid
 *   RAGA   pitch material only: register note pools + characteristic cadence +
 *          phrase bias (step/leap odds, ascent share, sustain, resting tone)
 *   MOOD   texture: percussion pattern/tempo/gain, melody register + pacing,
 *          drone intensity, stereo width, master-envelope target
 *   SCENE  events (bell / boom / swell / silence) from the timeline/script
 *
 * The mood vocabulary is the core `Mood` enum verbatim, so scene moods map 1:1.
 * Determinism: a single seeded LCG feeds the noise primitives; per-scene melody
 * is seeded by hash(sceneId) folded with the master seed, so re-narrating or
 * reordering scenes never reshuffles a given scene's melody. No Math.random /
 * Date.now anywhere.
 */
import { writeFileSync } from "node:fs";
import type { Mood } from "@anim/core";

const FS = 44100;

/** Equal-temperament note table (A4 = 440), incl. the raga-layer accidentals. */
const NOTE: Record<string, number> = {
  A2: 110, D2: 73.42, D3: 146.83, A3: 220, B3: 246.94, D4: 293.66, E4: 329.63,
  Fs4: 369.99, G4: 392, A4: 440, B4: 493.88, D5: 587.33,
  Bb3: 233.08, C4: 261.63, Cs4: 277.18, Eb4: 311.13, F4: 349.23, Bb4: 466.16,
  C5: 523.25, Cs5: 554.37,
};

interface RagaDef {
  pools: { low: string[]; mid: string[]; high: string[] };
  cadence: { low: string[]; high: string[] };
  phraseBias: { ascendShare: number; leapP: number; sustainMul: number; restPC: string | null };
  moodAffinity: Mood[];
}

const RAGAS: Record<string, RagaDef> = {
  yamanish: {
    pools: {
      low: ["A3", "B3", "Cs4", "D4", "E4"],
      mid: ["D4", "E4", "Fs4", "A4", "B4"],
      high: ["Fs4", "A4", "B4", "Cs5", "D5"],
    },
    cadence: { low: ["B3", "Cs4", "D4"], high: ["B4", "Cs5", "D5"] },
    phraseBias: { ascendShare: 0.62, leapP: 0.16, sustainMul: 1.0, restPC: "B" },
    moodAffinity: ["festive", "triumphant"],
  },
  bhairavish: {
    pools: {
      low: ["A3", "Bb3", "D4", "Eb4"],
      mid: ["D4", "Eb4", "F4", "A4"],
      high: ["F4", "A4", "Bb4", "D5"],
    },
    cadence: { low: ["F4", "Eb4", "D4"], high: ["F4", "Eb4", "D4"] },
    phraseBias: { ascendShare: 0.38, leapP: 0.06, sustainMul: 1.35, restPC: null },
    moodAffinity: ["somber", "mystic", "suspense", "tense"],
  },
  deshish: {
    pools: {
      low: ["A3", "B3", "C4", "D4", "E4"],
      mid: ["D4", "E4", "Fs4", "G4", "A4"],
      high: ["G4", "A4", "B4", "C5", "D5"],
    },
    cadence: { low: ["B3", "A3", "D4"], high: ["B4", "A4", "D5"] },
    phraseBias: { ascendShare: 0.52, leapP: 0.1, sustainMul: 1.1, restPC: null },
    moodAffinity: ["tender"],
  },
};

const RAGA_FOR_MOOD: Partial<Record<Mood, string>> = {};
for (const [name, r] of Object.entries(RAGAS)) {
  for (const m of r.moodAffinity) RAGA_FOR_MOOD[m] = name;
}

interface MoodDef {
  perc: { on: false } | { on: true; bps: number; gain: number; sparse: boolean };
  register: "low" | "mid" | "high";
  nps: number;
  sustainMul: number;
  drone: number;
  width: number;
  env: number;
}

const DEFAULT_MOOD: Mood = "tender";
const MOOD: Record<Mood, MoodDef> = {
  mystic:     { perc: { on: false },                                      register: "low",  nps: 0.42, sustainMul: 2.28, drone: 0.95, width: 0.65, env: 0.5 },
  festive:    { perc: { on: true, bps: 1.45, gain: 0.55, sparse: false }, register: "high", nps: 1.25, sustainMul: 0.96, drone: 0.85, width: 1.2, env: 0.85 },
  tense:      { perc: { on: true, bps: 1.62, gain: 0.38, sparse: true },  register: "low",  nps: 0.5,  sustainMul: 0.66, drone: 0.5, width: 0.55, env: 0.38 },
  tender:     { perc: { on: false },                                      register: "mid",  nps: 0.5,  sustainMul: 1.92, drone: 0.7, width: 0.85, env: 0.55 },
  triumphant: { perc: { on: true, bps: 1.49, gain: 0.72, sparse: false }, register: "high", nps: 1.15, sustainMul: 1.2, drone: 1.0, width: 1.25, env: 0.95 },
  somber:     { perc: { on: false },                                      register: "low",  nps: 0.38, sustainMul: 2.4, drone: 0.6, width: 0.55, env: 0.36 },
  suspense:   { perc: { on: true, bps: 0.94, gain: 0.32, sparse: true },  register: "low",  nps: 0.42, sustainMul: 0.72, drone: 0.42, width: 0.5, env: 0.3 },
};

const pitchClass = (n: string): string => n.replace(/\d+$/, "");
const ragaFullPool = (raga: RagaDef): string[] =>
  [...new Set([...raga.pools.low, ...raga.pools.mid, ...raga.pools.high])];

/** FNV-1a-ish string hash → stable per-scene seed. */
function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) || 1;
}
function makeRng(seed: number): () => number {
  let s = seed % 0x7fffffff || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export interface TimelineLike {
  total: number;
  scenes: { id: string; start: number; end: number; mood?: Mood }[];
}
export interface SceneEvent {
  at?: number;
  type: "bell" | "boom" | "swell" | "silence";
  freq?: number;
  gain?: number;
  dur?: number;
}
export interface ComposeOptions {
  /** Master seed; folds into per-scene melody seeds and the noise stream. */
  seed?: number;
  /** Per-scene raga overrides (script.json `scene.raga`). */
  sceneRagas?: Record<string, string>;
  /** Per-scene SCENE events (bell/boom/swell/silence). */
  sceneEvents?: Record<string, SceneEvent[]>;
  /** Film-wide raga override. */
  filmRaga?: string;
  warn?: (msg: string) => void;
}

interface ResolvedScene {
  id: string;
  start: number;
  end: number;
  moodName: Mood;
  mood: MoodDef;
  ragaName: string;
  raga: RagaDef;
}

/**
 * The synthesis buffers + primitives for one score. A fresh instance per
 * compose keeps state re-entrant (unlike the original module-global engine).
 */
class Engine {
  readonly dur: number;
  readonly n: number;
  private readonly l: Float64Array;
  private readonly r: Float64Array;
  private s: number;
  private lastFlute: number | null = null;
  private envPts: [number, number][] = [];

  constructor(seconds: number, seed: number) {
    this.dur = Math.ceil(seconds);
    this.n = FS * this.dur;
    this.l = new Float64Array(this.n);
    this.r = new Float64Array(this.n);
    this.s = (seed >>> 0) || 1234567;
    this.envPts = [[0, 0], [this.dur, 0]];
  }

  /** Shared seeded LCG feeding all noise-driven primitives. */
  private rnd(): number {
    this.s = (this.s * 1103515245 + 12345) & 0x7fffffff;
    return this.s / 0x7fffffff;
  }

  private addStereo(i: number, v: number, pan: number): void {
    if (i < 0 || i >= this.n) return;
    const g = 0.5 * (1 - pan);
    const h = 0.5 * (1 + pan);
    this.l[i]! += v * (0.5 + g);
    this.r[i]! += v * (0.5 + h);
  }

  pluck(t0: number, freq: number, gain: number, decayS: number, pan: number): void {
    const start = Math.floor(t0 * FS);
    const period = Math.max(2, Math.round(FS / freq));
    const buf = new Float64Array(period);
    for (let i = 0; i < period; i++) buf[i] = this.rnd() * 2 - 1;
    const total = Math.min(this.n - start, Math.floor(decayS * FS));
    const damp = 0.996;
    let idx = 0;
    for (let i = 0; i < total; i++) {
      const j = idx % period;
      const k = (idx + 1) % period;
      const v = buf[j]!;
      buf[j] = (buf[j]! + buf[k]!) * 0.5 * damp;
      idx++;
      const env = 1 - i / total;
      this.addStereo(start + i, v * gain * env * env, pan);
    }
  }

  flute(t0: number, name: string, dur: number, gain: number): void {
    const f1 = NOTE[name]!;
    const f0 = this.lastFlute ?? f1;
    this.lastFlute = f1;
    const start = Math.floor(t0 * FS);
    const total = Math.min(this.n - start, Math.floor((dur + 0.4) * FS));
    let ph = 0;
    let lpNoise = 0;
    for (let i = 0; i < total; i++) {
      const t = i / FS;
      const env = Math.min(t / 0.18, 1) * Math.min((dur + 0.4 - t) / 0.45, 1);
      if (env <= 0) continue;
      const glide = Math.min(t / 0.22, 1);
      const vib = 1 + Math.sin(2 * Math.PI * 5.2 * t) * 0.004 * Math.min(Math.max(t - 0.35, 0), 1);
      const f = (f0 + (f1 - f0) * glide) * vib;
      ph += (2 * Math.PI * f) / FS;
      const tone = Math.sin(ph) + 0.32 * Math.sin(2 * ph) + 0.1 * Math.sin(3 * ph);
      const nz = this.rnd() * 2 - 1;
      lpNoise += 0.12 * (nz - lpNoise);
      const v = (tone * 0.9 + lpNoise * 0.5) * env * env * gain;
      this.addStereo(start + i, v, 0.22);
    }
  }

  bell(t0: number, base: number, gain: number): void {
    const start = Math.floor(t0 * FS);
    const parts: [number, number][] = [[1, 1], [2.74, 0.55], [5.4, 0.24]];
    const total = Math.min(this.n - start, Math.floor(2.8 * FS));
    for (let i = 0; i < total; i++) {
      const t = i / FS;
      let v = 0;
      for (const [m, a] of parts) v += a * Math.sin(2 * Math.PI * base * m * t) * Math.exp(-t * (2.2 + m));
      this.addStereo(start + i, v * gain, 0.4);
    }
  }

  ge(t0: number, gain: number): void {
    const start = Math.floor(t0 * FS);
    const total = Math.min(this.n - start, Math.floor(0.32 * FS));
    let ph = 0;
    for (let i = 0; i < total; i++) {
      const t = i / FS;
      const f = 82 - 30 * Math.min(t / 0.16, 1);
      ph += (2 * Math.PI * f) / FS;
      this.addStereo(start + i, Math.sin(ph) * Math.exp(-t * 12) * gain, -0.08);
    }
  }

  na(t0: number, gain: number): void {
    const start = Math.floor(t0 * FS);
    const total = Math.min(this.n - start, Math.floor(0.09 * FS));
    for (let i = 0; i < total; i++) {
      const t = i / FS;
      const v = (this.rnd() * 2 - 1) * Math.sin(2 * Math.PI * 1650 * t) * Math.exp(-t * 60);
      this.addStereo(start + i, v * gain, 0.05);
    }
  }

  boom(t0: number, gain: number): void {
    const start = Math.floor(t0 * FS);
    const total = Math.min(this.n - start, Math.floor(1.6 * FS));
    let ph = 0;
    let lp = 0;
    for (let i = 0; i < total; i++) {
      const t = i / FS;
      const f = 58 - 18 * Math.min(t / 0.4, 1);
      ph += (2 * Math.PI * f) / FS;
      const nz = this.rnd() * 2 - 1;
      lp += 0.04 * (nz - lp);
      this.addStereo(start + i, (Math.sin(ph) * 0.9 + lp * 1.2) * Math.exp(-t * 3.4) * gain, 0);
    }
  }

  setEnv(pts: [number, number][]): void {
    this.envPts = pts;
  }
  private envAt(t: number): number {
    const pts = this.envPts;
    for (let i = 1; i < pts.length; i++) {
      if (t <= pts[i]![0]) {
        const [t0, v0] = pts[i - 1]!;
        const [t1, v1] = pts[i]!;
        return v0 + (v1 - v0) * ((t - t0) / Math.max(t1 - t0, 1e-6));
      }
    }
    return 0;
  }

  applyStereoWidth(scenes: ResolvedScene[]): void {
    for (const sc of scenes) {
      const w = sc.mood.width;
      if (Math.abs(w - 1) < 1e-6) continue;
      const i0 = Math.max(0, Math.floor(sc.start * FS));
      const i1 = Math.min(this.n, Math.ceil(sc.end * FS));
      for (let i = i0; i < i1; i++) {
        const mid = (this.l[i]! + this.r[i]!) * 0.5;
        const side = (this.l[i]! - this.r[i]!) * 0.5;
        this.l[i] = mid + side * w;
        this.r[i] = mid - side * w;
      }
    }
  }

  /** Apply the master envelope, peak-normalize, write a 16-bit stereo WAV. */
  writeWav(path: string): { dur: number; peak: number; norm: number } {
    const out = Buffer.alloc(44 + this.n * 4);
    out.write("RIFF", 0);
    out.writeUInt32LE(36 + this.n * 4, 4);
    out.write("WAVE", 8);
    out.write("fmt ", 12);
    out.writeUInt32LE(16, 16);
    out.writeUInt16LE(1, 20);
    out.writeUInt16LE(2, 22);
    out.writeUInt32LE(FS, 24);
    out.writeUInt32LE(FS * 4, 28);
    out.writeUInt16LE(4, 32);
    out.writeUInt16LE(16, 34);
    out.write("data", 36);
    out.writeUInt32LE(this.n * 4, 40);
    let peak = 0;
    for (let i = 0; i < this.n; i++) {
      const e = this.envAt(i / FS);
      peak = Math.max(peak, Math.abs(this.l[i]! * e), Math.abs(this.r[i]! * e));
    }
    const norm = peak > 0 ? 0.86 / peak : 1;
    for (let i = 0; i < this.n; i++) {
      const e = this.envAt(i / FS) * norm;
      const l = Math.max(-1, Math.min(1, this.l[i]! * e));
      const r = Math.max(-1, Math.min(1, this.r[i]! * e));
      out.writeInt16LE((l * 32767) | 0, 44 + i * 4);
      out.writeInt16LE((r * 32767) | 0, 46 + i * 4);
    }
    writeFileSync(path, out);
    return { dur: this.dur, peak, norm };
  }
}

function finalizePts(pts: [number, number][]): [number, number][] {
  pts.sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [pts[0]!];
  for (let i = 1; i < pts.length; i++) {
    let [t] = pts[i]!;
    const v = pts[i]![1];
    if (t <= out[out.length - 1]![0]) t = out[out.length - 1]![0] + 0.001;
    out.push([t, v]);
  }
  return out;
}

/**
 * Compose a full score for `timeline` and write it to `outPath`. Deterministic
 * for a fixed (timeline, options). Returns synthesis stats for logging.
 */
export function composeToWav(
  timeline: TimelineLike,
  outPath: string,
  opts: ComposeOptions = {},
): { dur: number; peak: number; norm: number; scenes: ResolvedScene[] } {
  const warn = opts.warn ?? (() => {});
  const seed = opts.seed ?? 1234567;
  const eng = new Engine(timeline.total + 1.0, seed);

  let filmRaga = opts.filmRaga ?? null;
  if (filmRaga && !RAGAS[filmRaga]) {
    warn(`unknown raga "${filmRaga}" (know: ${Object.keys(RAGAS).join(", ")}) — falling back to mood affinity`);
    filmRaga = null;
  }

  const scenes: ResolvedScene[] = timeline.scenes.map((sc) => {
    const moodName: Mood = sc.mood && MOOD[sc.mood] ? sc.mood : DEFAULT_MOOD;
    if (!sc.mood || !MOOD[sc.mood]) {
      warn(`scene "${sc.id}": unknown/missing mood — defaulting to "${DEFAULT_MOOD}"`);
    }
    let ragaName: string;
    const perScene = opts.sceneRagas?.[sc.id];
    if (perScene && RAGAS[perScene]) ragaName = perScene;
    else {
      if (perScene) warn(`scene "${sc.id}": unknown raga "${perScene}" — ignoring`);
      ragaName = filmRaga ?? RAGA_FOR_MOOD[moodName] ?? "deshish";
    }
    return { id: sc.id, start: sc.start, end: sc.end, moodName, mood: MOOD[moodName], ragaName, raga: RAGAS[ragaName]! };
  });

  // SCENE events → immediate hits (bell/boom) + deferred envelope shaping.
  const ducks: { start: number; end: number; level: number }[] = [];
  const swells: { at: number; level: number }[] = [];
  for (const sc of scenes) {
    for (const e of opts.sceneEvents?.[sc.id] ?? []) {
      const atAbs = sc.start + (e.at ?? 0);
      if (atAbs < sc.start || atAbs > sc.end) {
        warn(`scene "${sc.id}": event at=${e.at} is outside the scene — skipping`);
        continue;
      }
      if (e.type === "bell") eng.bell(atAbs, e.freq ?? 1174.7, e.gain ?? 0.3);
      else if (e.type === "boom") eng.boom(atAbs, e.gain ?? 0.8);
      else if (e.type === "swell") swells.push({ at: atAbs, level: sc.mood.env });
      else if (e.type === "silence") ducks.push({ start: atAbs, end: atAbs + (e.dur ?? 2.0), level: sc.mood.env });
    }
  }
  const inDuck = (t: number): boolean => ducks.some((d) => t >= d.start && t < d.end);

  composeDrone(eng, timeline, scenes, inDuck);
  for (const sc of scenes) {
    scheduleScenePercussion(eng, sc, inDuck);
    scheduleSceneMelody(eng, sc, inDuck, seed, warn);
  }
  eng.setEnv(buildEnvelope(timeline, scenes, swells, ducks, eng.dur));
  eng.applyStereoWidth(scenes);

  const stats = eng.writeWav(outPath);
  return { ...stats, scenes };
}

function composeDrone(
  eng: Engine,
  tl: TimelineLike,
  scenes: ResolvedScene[],
  inDuck: (t: number) => boolean,
): void {
  const cycle = [NOTE.A2!, NOTE.D3!, NOTE.D3!, NOTE.D2!];
  let t = 0.2;
  let k = 0;
  const sceneAt = (time: number): ResolvedScene => {
    for (const sc of scenes) if (time >= sc.start && time < sc.end) return sc;
    return scenes[scenes.length - 1]!;
  };
  while (t < tl.total - 1.0) {
    if (!inDuck(t)) {
      const sc = sceneAt(t);
      eng.pluck(t, cycle[k % 4]!, 0.16 * sc.mood.drone, 3.6, -0.25);
    }
    t += 0.78;
    k++;
  }
}

function scheduleScenePercussion(eng: Engine, sc: ResolvedScene, inDuck: (t: number) => boolean): void {
  const p = sc.mood.perc;
  if (!p.on) return;
  const a = sc.start + 0.3;
  const b = sc.end - 0.2;
  let beat = 0;
  for (let t = a; t < b; t += 1 / p.bps, beat++) {
    if (inDuck(t)) continue;
    const m = beat % 8;
    if (m === 0 || m === 3 || m === 6) eng.ge(t, p.gain);
    else if (!p.sparse || m === 4) eng.na(t, p.gain * 0.8);
    if (!p.sparse && (m === 2 || m === 5)) eng.na(t + 0.5 / p.bps, p.gain * 0.45);
  }
}

function scheduleSceneMelody(
  eng: Engine,
  sc: ResolvedScene,
  inDuck: (t: number) => boolean,
  seed: number,
  warn: (m: string) => void,
): void {
  const mood = sc.mood;
  const raga = sc.raga;
  const bias = raga.phraseBias;
  let pool = raga.pools[mood.register];
  if (!pool || !pool.length) {
    pool = ragaFullPool(raga);
    warn(`scene "${sc.id}": raga "${sc.ragaName}" has no "${mood.register}" register — using full pool`);
  }
  const rng = makeRng(hashSeed(sc.id) ^ (seed >>> 0));
  const windowStart = sc.start + 0.8;
  const windowEnd = sc.end - 0.3;

  const cad = raga.cadence[mood.register === "high" || mood.env > 0.6 ? "high" : "low"];
  let cadGap = Math.max(0.55, (1 / mood.nps) * 0.7);
  let cadDur = Math.min(3.0, Math.max(0.5, cadGap * mood.sustainMul * bias.sustainMul));
  let cadSpan = cadGap * (cad.length - 1) + cadDur + 0.3;
  const maxCadSpan = (windowEnd - windowStart) * 0.45;
  if (cadSpan > maxCadSpan) {
    const k = maxCadSpan / cadSpan;
    cadGap = Math.max(0.45, cadGap * k);
    cadDur = Math.max(0.5, cadDur * k);
    cadSpan = cadGap * (cad.length - 1) + cadDur + 0.3;
  }
  if (windowEnd - windowStart < cadSpan + 1.2) return;
  const melodyEnd = windowEnd - cadSpan;

  const totalAvail = windowEnd - windowStart;
  const gapFraction = 0.3 + rng() * 0.2;
  const activeBudget = totalAvail * (1 - gapFraction);
  const baseGain = 0.22 + mood.env * 0.14;

  let idx = Math.floor(rng() * pool.length);
  let t = windowStart;
  let active = 0;
  let guard = 0;
  const notesOut: [number, string, number, number][] = [];
  while (t < melodyEnd - 0.4 && active < activeBudget && guard < 60) {
    guard++;
    const phraseLen = 2 + Math.floor(rng() * 4);
    const phraseIdx: number[] = [];
    for (let k = 0; k < phraseLen; k++) {
      if (k > 0) {
        const r = rng();
        let step: number;
        if (r < bias.leapP) step = (rng() < bias.ascendShare ? 1 : -1) * (2 + Math.floor(rng() * 2));
        else if (r < bias.leapP + 0.12) step = 0;
        else step = rng() < bias.ascendShare ? 1 : -1;
        idx = Math.max(0, Math.min(pool.length - 1, idx + step));
      }
      phraseIdx.push(idx);
    }
    let restBoost = 1;
    if (bias.restPC) {
      const restIdx = pool.findIndex((n) => pitchClass(n) === bias.restPC);
      if (restIdx >= 0 && rng() < 0.35) phraseIdx[phraseIdx.length - 1] = restIdx;
      if (pitchClass(pool[phraseIdx[phraseIdx.length - 1]!]!) === bias.restPC) restBoost = 1.35;
    }
    const onsetGap = (1 / mood.nps) * (0.85 + rng() * 0.3);
    const noteDur = Math.min(3.5, Math.max(0.35, onsetGap * mood.sustainMul * bias.sustainMul));
    const phraseSpan = onsetGap * (phraseLen - 1) + noteDur * restBoost + 0.4;
    if (t + phraseSpan > melodyEnd) {
      if (notesOut.length === 0 && phraseLen > 2) continue;
      break;
    }
    for (let k = 0; k < phraseLen; k++) {
      const nt = t + k * onsetGap;
      const nd = k === phraseLen - 1 ? noteDur * restBoost : noteDur;
      if (!inDuck(nt)) notesOut.push([nt, pool[phraseIdx[k]!]!, nd, baseGain * (0.9 + rng() * 0.2)]);
    }
    active += phraseSpan;
    t += phraseSpan + Math.max(0.6, ((totalAvail * gapFraction) / 4) * (0.6 + rng() * 0.8));
  }
  if (!notesOut.length) {
    const nd = Math.min(3.5, Math.max(1.2, melodyEnd - windowStart - 0.2));
    if (!inDuck(windowStart)) notesOut.push([windowStart, pool[Math.floor(pool.length / 2)]!, nd, baseGain * 0.9]);
  }
  for (let k = 0; k < cad.length; k++) {
    const nt = melodyEnd + 0.3 + k * cadGap;
    const isLast = k === cad.length - 1;
    if (!inDuck(nt)) notesOut.push([nt, cad[k]!, isLast ? cadDur : cadDur * 0.85, baseGain * (isLast ? 1.1 : 0.95)]);
  }
  notesOut.sort((a, b) => a[0] - b[0]);
  for (const [nt, nm, nd, ng] of notesOut) eng.flute(nt, nm, nd, ng);
}

function buildEnvelope(
  tl: TimelineLike,
  scenes: ResolvedScene[],
  swells: { at: number; level: number }[],
  ducks: { start: number; end: number; level: number }[],
  dur: number,
): [number, number][] {
  const pts: [number, number][] = [];
  const half = 0.75;
  const first = scenes[0]!;
  pts.push([first.start, 0]);
  pts.push([first.start + 1.5, first.mood.env]);
  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i]!;
    const isLast = i === scenes.length - 1;
    const lvl = sc.mood.env;
    const holdEnd = isLast
      ? Math.max(tl.total - 2.5, pts[pts.length - 1]![0] + 0.01)
      : Math.max(sc.end - half, pts[pts.length - 1]![0] + 0.01);
    pts.push([holdEnd, lvl]);
    if (!isLast) {
      const next = scenes[i + 1]!;
      const rampTo = Math.min(next.start + half, next.end - 0.1);
      pts.push([Math.max(rampTo, holdEnd + 0.01), next.mood.env]);
    }
  }
  pts.push([Math.max(tl.total - 0.2, pts[pts.length - 1]![0] + 0.01), 0.05]);
  pts.push([Math.max(dur, pts[pts.length - 1]![0] + 0.01), 0]);
  for (const sw of swells) {
    pts.push([sw.at - 0.35, sw.level]);
    pts.push([sw.at, Math.min(1.05, sw.level + 0.28)]);
    pts.push([sw.at + 1.0, sw.level]);
  }
  for (const d of ducks) {
    pts.push([d.start - 0.05, d.level]);
    pts.push([d.start + 0.05, d.level * 0.2]);
    pts.push([d.end - 0.05, d.level * 0.2]);
    pts.push([d.end + 0.3, d.level]);
  }
  return finalizePts(pts);
}
