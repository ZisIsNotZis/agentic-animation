import { z } from "zod";
import { IdSchema, PointSchema } from "./common";
import { EaseSchema } from "./storyboard";

/**
 * A single keyframe on a standard part name. `t` is seconds from clip start.
 * Fields are deltas the runtime applies around the part's pivot.
 * ARCHITECTURE §8.3.
 */
export const MotionKeyframeSchema = z.object({
  part: IdSchema,
  t: z.number().min(0),
  /** Rotation in degrees. */
  rot: z.number().optional(),
  /** Positional offset in design-pixel space. */
  pos: PointSchema.optional(),
  scale: z.number().positive().optional(),
  ease: EaseSchema.optional(),
});
export type MotionKeyframe = z.infer<typeof MotionKeyframeSchema>;

/** Seeded procedural layers composed on top of keyframes. */
export const ProceduralLayerSchema = z
  .object({
    breathe: z.number().nonnegative().optional(),
    sway: z.number().nonnegative().optional(),
    /** Mean seconds between blinks (scheduled by the seeded PRNG). */
    blinkEvery: z.number().positive().optional(),
  })
  .partial();
export type ProceduralLayer = z.infer<typeof ProceduralLayerSchema>;

/** `library/motions/<name>.json` — a named keyframe clip. */
export const MotionClipSchema = z.object({
  name: IdSchema,
  /** Total clip length in seconds; keyframes must fall within [0, duration]. */
  duration: z.number().positive(),
  loop: z.boolean().default(false),
  keys: z.array(MotionKeyframeSchema).default([]),
  procedural: ProceduralLayerSchema.optional(),
});
export type MotionClip = z.infer<typeof MotionClipSchema>;
