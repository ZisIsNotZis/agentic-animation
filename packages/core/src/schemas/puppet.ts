import { z } from "zod";
import { IdSchema, PointSchema } from "./common";
import { VISEMES } from "./cues";

/**
 * The standard part skeleton — one naming convention forever, so motion clips
 * are interchangeable across characters (ARCHITECTURE §8.2). Exotic beings add
 * extra parts (`tail`, `wings_l/r`, `heads_2..n`, `arms_3..n`); the runtime
 * treats those as just more parts. The rig stage checks all of these exist.
 */
export const STANDARD_PARTS = [
  "torso",
  "head",
  "arm_u_l",
  "arm_l_l",
  "hand_l",
  "arm_u_r",
  "arm_l_r",
  "hand_r",
  "leg_u_l",
  "leg_l_l",
  "foot_l",
  "leg_u_r",
  "leg_l_r",
  "foot_r",
] as const;
export type StandardPart = (typeof STANDARD_PARTS)[number];

/**
 * Per-part proportion normalization scale `[sx, sy]`, applied about the part's
 * pivot *in the part's own image space* before articulation (nativeAttach model
 * only — ignored by sharedFrame). Independently-generated part PNGs come at
 * arbitrary pixel sizes/aspect ratios; `char rig` calibrates a per-part `norm`
 * so every part renders at its intended anatomical proportion and the attach
 * chain stays connected regardless of native pixel dimensions. Default `[1, 1]`
 * (identity) keeps every existing rig byte-identical.
 */
export const NormSchema = z
  .tuple([z.number().positive(), z.number().positive()])
  .default([1, 1]);
export type Norm = z.infer<typeof NormSchema>;

export const PartSchema = z.object({
  id: IdSchema,
  image: z.string().min(1),
  /**
   * Rotation/scale pivot. Coordinate space depends on the puppet's `rig`:
   * - `sharedFrame`: design-pixel space (every part is a full-canvas sprite).
   * - `nativeAttach`: **the part's OWN trimmed-image pixel space** (part-local).
   * Must lie inside the part's bounds — `char rig` checks this.
   */
  pivot: PointSchema,
  /** Draw order; higher renders on top. */
  z: z.number(),
  /** Parent part id for the transform hierarchy; null for the root. */
  parent: IdSchema.nullable(),
  /**
   * Where this part hooks onto the rig. Coordinate space depends on `rig`:
   * - `sharedFrame`: unused (parts are pre-placed in the shared design frame).
   * - `nativeAttach`, child part: a point on the PARENT, in the **parent's own
   *   image pixel space** — the child's pivot is placed here (forward kinematics).
   * - `nativeAttach`, root part (`parent: null`): the **design-space** point at
   *   which the root's pivot is anchored on the stage.
   */
  attach: PointSchema.optional(),
  /** Proportion normalization scale about the pivot (nativeAttach only). */
  norm: NormSchema,
});
export type Part = z.infer<typeof PartSchema>;

/** All 9 visemes required — `{ A: "mouth/A.png", …, X: "mouth/X.png" }`. */
export const MouthShapesSchema = z.object(
  Object.fromEntries(VISEMES.map((v) => [v, z.string().min(1)])) as Record<
    (typeof VISEMES)[number],
    z.ZodString
  >,
);
export type MouthShapes = z.infer<typeof MouthShapesSchema>;

export const MouthSchema = z.object({
  /** Part the mouth overlay is anchored to (usually `head`). */
  anchor: IdSchema,
  at: PointSchema,
  shapes: MouthShapesSchema,
});
export type Mouth = z.infer<typeof MouthSchema>;

export const EyesSchema = z.object({
  /** Blink frames, open → closed order. */
  blink: z.array(z.string().min(1)).min(1),
});
export type Eyes = z.infer<typeof EyesSchema>;

/** A skin swap: partId → replacement image path. `default` is usually empty. */
export const SkinSchema = z.record(IdSchema, z.string().min(1));
export type Skin = z.infer<typeof SkinSchema>;

export const PuppetMetaSchema = z.object({
  grounding: z.string().optional(),
  notes: z.array(z.string()).default([]),
});
export type PuppetMeta = z.infer<typeof PuppetMetaSchema>;

/**
 * Which puppet-runtime model this rig uses (ARCHITECTURE §8.2). Discriminates
 * the two coordinate/compositing conventions; defaults to `sharedFrame` so
 * every pre-existing `puppet.json` (which omits the field) keeps rendering
 * identically.
 *
 * - **`sharedFrame`** — every part image is a full design-canvas sprite drawn in
 *   its anatomical place; the runtime composes local pivot transforms up the
 *   parent chain in the one shared design frame. `attach`/`norm`/native sizes are
 *   ignored. The built-in `_placeholder` cast uses this.
 * - **`nativeAttach`** — each part is an individually-trimmed PNG at its own
 *   native pixel size with a part-local `pivot`; a child is positioned by
 *   attach-based forward kinematics (its pivot lands on the parent's `attach`
 *   point, transforms compose down the chain), `norm` normalizes proportions.
 *   This is what `anim char rig` emits.
 */
export const RigModelSchema = z.enum(["sharedFrame", "nativeAttach"]).default("sharedFrame");
export type RigModel = z.infer<typeof RigModelSchema>;

/** `puppet.json` — the rig. ARCHITECTURE §8.2. */
export const PuppetSchema = z.object({
  id: IdSchema,
  version: z.number().int().positive(),
  /** Which runtime model (see RigModelSchema); default `sharedFrame`. */
  rig: RigModelSchema,
  designSize: PointSchema,
  parts: z.array(PartSchema).min(1),
  mouth: MouthSchema,
  eyes: EyesSchema.optional(),
  skins: z.record(z.string(), SkinSchema).default({ default: {} }),
  meta: PuppetMetaSchema.optional(),
});
export type Puppet = z.infer<typeof PuppetSchema>;
