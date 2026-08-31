import type { Lang } from "../schemas/common";
import type { MouthCue } from "../schemas/cues";
import type {
  Check,
  CorpusDoc,
  CorpusHit,
  Doctorable,
  HealthReport,
  RenderReport,
  VoiceInfo,
} from "./types";

/** Text-to-speech. ARCHITECTURE §7. */
export interface TtsAdapter extends Doctorable {
  synthesize(req: {
    text: string;
    voice: string;
    lang: Lang;
    outPath: string;
  }): Promise<{ path: string; durationSec: number }>;
  listVoices(lang: string): Promise<VoiceInfo[]>;
}

/** Lip-sync analysis. Optional adapter; not part of the YAML compiler path. */
export interface LipsyncAdapter extends Doctorable {
  analyze(req: { audioPath: string; dialogText?: string }): Promise<MouthCue[]>;
}

/** Still-image generation (assets only — never video). ARCHITECTURE §7. */
export interface ImageGenAdapter extends Doctorable {
  generate(req: {
    workflowId: string;
    inputs: Record<string, unknown>;
    seed: number;
    outDir: string;
  }): Promise<{ images: string[] }>;
  health(): Promise<HealthReport>;
}

/** Deterministic MP4 render + stills. ARCHITECTURE §7. */
export interface RendererAdapter extends Doctorable {
  /** Render a renderer-neutral performance manifest without the legacy build. */
  renderManifest(req: {
    manifestPath: string;
    outPath: string;
    fps: number;
    crf: number;
    threads: number;
    duration?: number;
    scale?: number;
    force?: boolean;
  }): Promise<RenderReport>;
}

/** Deterministic seeded music composition. Optional adapter. */
export interface MusicAdapter extends Doctorable {
  compose(req: {
    timelinePath: string;
    scriptPath: string;
    outPath: string;
    seed: number;
  }): Promise<{ path: string }>;
}

/** Read-only story corpus. ARCHITECTURE §7. */
export interface CorpusAdapter extends Doctorable {
  search(query: string): Promise<CorpusHit[]>;
  read(ref: string): Promise<CorpusDoc>;
}

export type AnyAdapter =
  | TtsAdapter
  | LipsyncAdapter
  | ImageGenAdapter
  | RendererAdapter
  | CorpusAdapter
  | MusicAdapter;

/**
 * The single shape every adapter package default-exports so the CLI registry
 * can bucket it by kind without knowing the concrete class. Discriminated on
 * `kind` (matches `anim.config.json`). registry.ts is the ONLY place these are
 * imported (ARCHITECTURE §14 — do not add adapter imports elsewhere).
 */
export type AdapterRegistration =
  | { kind: "tts"; adapter: TtsAdapter }
  | { kind: "lipsync"; adapter: LipsyncAdapter }
  | { kind: "imagegen"; adapter: ImageGenAdapter }
  | { kind: "renderer"; adapter: RendererAdapter }
  | { kind: "corpus"; adapter: CorpusAdapter }
  | { kind: "music"; adapter: MusicAdapter };

/** Convenience: a not-ready check an unimplemented adapter's doctor can emit. */
export function notReadyCheck(id: string, detail: string, fix?: string): Check {
  return { name: `${id}: not ready`, ok: false, detail, ...(fix ? { fix } : {}) };
}
