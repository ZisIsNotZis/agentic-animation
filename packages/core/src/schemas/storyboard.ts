import { z } from "zod";
import { IdSchema, PointSchema, TimeRefSchema } from "./common";

/** Easing curve names for camera + beat interpolation (salvaged vocabulary). */
export const EaseSchema = z.enum(["linear", "io", "in", "out", "back"]);
export type Ease = z.infer<typeof EaseSchema>;

/** A camera keyframe on the world container: pan (x,y) + zoom (z). */
export const CameraKeySchema = z.object({
  t: TimeRefSchema,
  x: z.number().optional(),
  y: z.number().optional(),
  z: z.number().positive().optional(),
  ease: EaseSchema.optional(),
});
export type CameraKey = z.infer<typeof CameraKeySchema>;

/** Facial override applied by a beat (small dials, not new drawing). */
export const FaceOverrideSchema = z
  .object({
    smile: z.number().optional(),
    brow: z.number().optional(),
    eyeOpen: z.number().optional(),
    lipsPart: z.number().optional(),
    gaze: PointSchema.optional(),
  })
  .partial();
export type FaceOverride = z.infer<typeof FaceOverrideSchema>;

/** A motion reference: clip name plus optional speed/mirror options. */
export const MotionRefSchema = z.union([
  z.string(),
  z.object({
    clip: z.string(),
    speed: z.number().positive().optional(),
    mirror: z.boolean().optional(),
  }),
]);
export type MotionRef = z.infer<typeof MotionRefSchema>;

export const ActorSchema = z.object({
  /** Optional stage id (defaults to characterId when omitted). */
  id: IdSchema.optional(),
  characterId: IdSchema,
  /** Pinned library version (`<id>@v<version>`). */
  version: z.number().int().positive(),
  at: PointSchema,
  scale: z.number().positive().default(1),
  flip: z.boolean().optional(),
  facing: z.union([z.literal(1), z.literal(-1)]).optional(),
  emotion: z.string().optional(),
  /** Named motion clips composed onto the standard skeleton. */
  motion: z.array(MotionRefSchema).default([]),
  /** Dialogue line ids this actor speaks (drives lip-sync cue selection). */
  speakLineIds: z.array(IdSchema).default([]),
});
export type Actor = z.infer<typeof ActorSchema>;

/**
 * A timed beat. Loose by design — a beat targets an actor (pose/face/move) or
 * fires an fx. `at` is a storyboard time ref resolved against the scene.
 */
export const BeatSchema = z.object({
  at: TimeRefSchema,
  actor: IdSchema.optional(),
  pose: z.string().optional(),
  face: FaceOverrideSchema.optional(),
  move: z
    .object({
      to: PointSchema,
      gait: z.string().optional(),
      t1: TimeRefSchema.optional(),
    })
    .optional(),
  fx: z.string().optional(),
  opts: z.record(z.string(), z.unknown()).optional(),
  over: z.number().nonnegative().optional(),
});
export type Beat = z.infer<typeof BeatSchema>;

export const ShotSchema = z.object({
  id: IdSchema,
  sceneId: IdSchema,
  set: z.string().min(1),
  setOpts: z.record(z.string(), z.unknown()).optional(),
  grade: z.record(z.string(), z.unknown()).optional(),
  camera: z.array(CameraKeySchema).default([]),
  actors: z.array(ActorSchema).default([]),
  beats: z.array(BeatSchema).default([]),
});
export type Shot = z.infer<typeof ShotSchema>;

export const StoryboardSchema = z.object({
  shots: z.array(ShotSchema).min(1),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;
