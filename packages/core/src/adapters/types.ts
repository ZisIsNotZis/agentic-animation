/**
 * One preflight check result. `anim doctor` aggregates these from the system
 * probe and every registered adapter. `fix` is a copy-pasteable remedy shown
 * when `ok` is false.
 */
export interface Check {
  name: string;
  ok: boolean;
  detail: string;
  fix?: string;
}

/** Every adapter contributes executable checks to `anim doctor`. */
export interface Doctorable {
  /** Stable adapter id (matches the value selected in `anim.config.json`). */
  id: string;
  doctor(): Promise<Check[]>;
}

export interface VoiceInfo {
  id: string;
  name: string;
  lang: string;
  gender?: string;
}

export interface HealthReport {
  ok: boolean;
  detail: string;
  /** Optional free-form diagnostics (e.g. ComfyUI `/system_stats`). */
  info?: Record<string, unknown>;
}

export interface RenderReport {
  outPath: string;
  frames: number;
  durationSec: number;
}

export interface CorpusHit {
  ref: string;
  title: string;
  snippet: string;
  citation: string;
  score?: number;
}

export interface CorpusDoc {
  ref: string;
  text: string;
  citation: string;
}

/** The kinds of adapter the registry buckets. Matches `anim.config.json`. */
export type AdapterKind = "tts" | "lipsync" | "imagegen" | "renderer" | "corpus" | "music";
