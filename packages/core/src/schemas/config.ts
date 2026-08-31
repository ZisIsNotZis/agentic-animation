import { z } from "zod";

/**
 * `anim.config.json` — adapter selection + paths. A per-machine
 * `anim.config.local.json` is deep-merged on top (see config/loader.ts).
 * ARCHITECTURE §7. The actual committed config file is owned by the ops
 * workstream; this schema is the contract + supplies defaults.
 */
export const AdapterSelectionSchema = z.object({
  imagegen: z.string().default("comfyui"),
  tts: z.string().default("kokoro"),
  lipsync: z.string().default("rhubarb"),
  music: z.string().default("raga"),
  renderer: z.string().default("remotion"),
  corpus: z.string().default(""),
});
export type AdapterSelection = z.infer<typeof AdapterSelectionSchema>;

export const PathsSchema = z.object({
  library: z.string().default("library"),
  episodes: z.string().default("episodes"),
  vendor: z.string().default("vendor"),
  /** Path to the read-only story corpus (sibling repo). */
  corpus: z.string().default(""),
});
export type Paths = z.infer<typeof PathsSchema>;

export const VideoDefaultsSchema = z.object({
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  fps: z.number().positive().default(24),
  crf: z.number().int().min(0).max(51).default(20),
});
export type VideoDefaults = z.infer<typeof VideoDefaultsSchema>;

export const RenderLimitsSchema = z.object({
  /** Capped for the 24 GB memory budget (ARCHITECTURE §11). */
  concurrency: z.number().int().positive().default(4),
  offthreadVideoCacheSizeInBytes: z.number().int().positive().default(2 * 1024 * 1024 * 1024),
});
export type RenderLimits = z.infer<typeof RenderLimitsSchema>;

export const TtsDefaultsSchema = z.object({
  voice: z.string().default("af_heart"),
  lang: z.enum(["en", "hi", "zh"]).default("en"),
});
export type TtsDefaults = z.infer<typeof TtsDefaultsSchema>;

export const AnimConfigSchema = z.object({
  adapters: AdapterSelectionSchema.default({}),
  paths: PathsSchema.default({}),
  video: VideoDefaultsSchema.default({}),
  render: RenderLimitsSchema.default({}),
  tts: TtsDefaultsSchema.default({}),
  /** Master seed for any seeded stage that does not override it. */
  seed: z.number().int().default(1234),
  /** Allow FLUX-family models — guarded off by default per DECISIONS.md. */
  allowFluxFamily: z.boolean().default(false),
});
export type AnimConfig = z.infer<typeof AnimConfigSchema>;
