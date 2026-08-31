import { z } from "zod";
import { GeneratedBySchema, IdSchema, PointSchema, SlugSchema } from "./common";
import { MouthCueSchema } from "./cues";
import { EaseSchema } from "./storyboard";

/**
 * `episode.build.json` — legacy generated compatibility output. Everything resolved:
 * absolute asset paths, pinned library versions, flattened tracks. This is the
 * ONLY input the renderer reads. It embeds a content hash of every input so
 * `render` can detect staleness. ARCHITECTURE §6.
 *
 * Times are absolute seconds from film start unless noted.
 */
export const VideoSpecSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
});
export type VideoSpec = z.infer<typeof VideoSpecSchema>;

/** A resolved transform keyframe (absolute seconds). */
export const ResolvedKeySchema = z.object({
  t: z.number().min(0),
  rot: z.number().optional(),
  pos: PointSchema.optional(),
  scale: z.number().positive().optional(),
  ease: EaseSchema.optional(),
});
export type ResolvedKey = z.infer<typeof ResolvedKeySchema>;

export const ResolvedFaceSchema = z.object({
  t: z.number().min(0),
  smile: z.number().optional(),
  brow: z.number().optional(),
  eyeOpen: z.number().optional(),
  lipsPart: z.number().optional(),
  gaze: PointSchema.optional(),
});
export type ResolvedFace = z.infer<typeof ResolvedFaceSchema>;

export const ResolvedMoveSchema = z.object({
  t: z.number().min(0),
  to: PointSchema,
  t1: z.number().min(0).optional(),
});
export type ResolvedMove = z.infer<typeof ResolvedMoveSchema>;

export const PartTrackSchema = z.object({
  part: IdSchema,
  keys: z.array(ResolvedKeySchema),
});
export type PartTrack = z.infer<typeof PartTrackSchema>;

export const ResolvedActorSchema = z.object({
  id: IdSchema,
  characterId: IdSchema,
  version: z.number().int().positive(),
  /** Absolute path to the pinned `puppet.json`. */
  puppetPath: z.string().min(1),
  at: PointSchema,
  scale: z.number().positive(),
  flip: z.boolean().default(false),
  facing: z.union([z.literal(1), z.literal(-1)]).default(1),
  emotion: z.string().default("neutral"),
  skin: z.string().default("default"),
  partTracks: z.array(PartTrackSchema).default([]),
  /** Resolved mouth cues (absolute seconds) for this actor's spoken lines. */
  mouthTrack: z.array(MouthCueSchema).default([]),
  /** Absolute times of blink starts, produced by the seeded PRNG. */
  blinkTrack: z.array(z.number().min(0)).default([]),
  faceTrack: z.array(ResolvedFaceSchema).default([]),
  moveTrack: z.array(ResolvedMoveSchema).default([]),
});
export type ResolvedActor = z.infer<typeof ResolvedActorSchema>;

export const ResolvedCameraKeySchema = z.object({
  t: z.number().min(0),
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().positive().optional(),
  ease: EaseSchema.optional(),
});
export type ResolvedCameraKey = z.infer<typeof ResolvedCameraKeySchema>;

export const ResolvedFxSchema = z.object({
  t: z.number().min(0),
  fx: z.string().min(1),
  opts: z.record(z.string(), z.unknown()).optional(),
});
export type ResolvedFx = z.infer<typeof ResolvedFxSchema>;

export const ResolvedCaptionSchema = z.object({
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string().min(1),
});
export type ResolvedCaption = z.infer<typeof ResolvedCaptionSchema>;

export const ResolvedShotSchema = z.object({
  id: IdSchema,
  sceneId: IdSchema,
  start: z.number().min(0),
  end: z.number().min(0),
  set: z.string().min(1),
  setOpts: z.record(z.string(), z.unknown()).optional(),
  grade: z.record(z.string(), z.unknown()).optional(),
  camera: z.array(ResolvedCameraKeySchema).default([]),
  actors: z.array(ResolvedActorSchema).default([]),
  fx: z.array(ResolvedFxSchema).default([]),
  captions: z.array(ResolvedCaptionSchema).default([]),
});
export type ResolvedShot = z.infer<typeof ResolvedShotSchema>;

export const EpisodeBuildSchema = z.object({
  generatedBy: GeneratedBySchema.optional(),
  slug: SlugSchema,
  title: z.string().min(1),
  video: VideoSpecSchema,
  /** Total film duration; render passes this as an explicit ffmpeg `-t`. */
  total: z.number().positive(),
  /** Master seed recorded for deterministic render. */
  seed: z.number().int(),
  /** Absolute path to the pre-mixed audio. */
  audioPath: z.string().min(1),
  /** Absolute path to the captions track (mov_text source), if any. */
  captionsPath: z.string().optional(),
  /** inputName → content hash, for staleness detection at render time. */
  inputs: z.record(z.string(), z.string()).default({}),
  shots: z.array(ResolvedShotSchema).min(1),
});
export type EpisodeBuild = z.infer<typeof EpisodeBuildSchema>;
