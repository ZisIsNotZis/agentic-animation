import { z } from "zod";

/**
 * The 7 closed moods, shared between `script.json` and the music adapter.
 * Salvaged verbatim from the previous engine's CONTRACTS.md so ported raga
 * mood tables map 1:1.
 */
export const MOODS = [
  "mystic",
  "festive",
  "tense",
  "tender",
  "triumphant",
  "somber",
  "suspense",
] as const;
export const MoodSchema = z.enum(MOODS);
export type Mood = z.infer<typeof MoodSchema>;

/** Supported narration languages (Kokoro ships en + hi). */
export const LangSchema = z.enum(["en", "hi", "zh"]);
export type Lang = z.infer<typeof LangSchema>;

/**
 * A time reference in the storyboard vocabulary. Resolved to absolute seconds
 * against a scene's timeline entry by `resolveTimeRef` (see time/resolve.ts):
 *   - `number`   — seconds from scene start
 *   - `"NN%"`    — percent of scene duration
 *   - `"narr+X"` / `"narr-X"` — X seconds after/before narration start
 */
export const TimeRefSchema = z.union([
  z.number(),
  z.string().regex(
    /^(\d+(\.\d+)?%|narr[+-]\d+(\.\d+)?)$/,
    'time ref must be a number, "NN%", or "narr+X"/"narr-X"',
  ),
]);
export type TimeRef = z.infer<typeof TimeRefSchema>;

/** A [x, y] point in a puppet's design-pixel space. */
export const PointSchema = z.tuple([z.number(), z.number()]);
export type Point = z.infer<typeof PointSchema>;

/** Slug: lowercase, digits, dashes; the id form used for episodes + assets. */
export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "slug must be lowercase alphanumeric with dashes");

/** Character/part/asset ids allow a leading underscore (e.g. `_placeholder`). */
export const IdSchema = z
  .string()
  .regex(/^_?[a-z0-9][a-z0-9_-]*$/, "id must be lowercase alphanumeric with _ or -");

/**
 * Header stamped onto every *generated* manifest so a hand edit is obvious and
 * staleness can be detected. Written by the artifact store, never by hand.
 */
export const GeneratedBySchema = z.object({
  stage: z.string(),
  tool: z.string(),
  /** ISO-8601. Provided by the caller — render-path code must pass a fixed clock. */
  at: z.string(),
  /** Content hash of the stage inputs; lets a downstream stage detect staleness. */
  inputHash: z.string().optional(),
});
export type GeneratedBy = z.infer<typeof GeneratedBySchema>;
