import { z } from "zod";
import { STANDARD_PARTS, type StandardPart } from "@anim/core";

/**
 * House style + rig defaults for the character pipeline (workstream B). These
 * are the *starting* templates the agent/human refines; nothing here is frozen
 * contract. House-style.json is written by `char new` (marked draft) and read
 * by `char gen` for prompt fragments + the model/license that ends up in
 * meta.json.
 */

export const HouseStyleSchema = z.object({
  status: z.literal("draft").or(z.literal("approved")).default("draft"),
  version: z.number().int().positive().default(1),
  /** The generating model + license — copied into every asset's meta.json. */
  model: z.object({ name: z.string().min(1), license: z.string().min(1) }),
  style: z.string().min(1),
  /** Prompt fragments prepended to every prompt, by role. */
  promptFragments: z.object({
    global: z.string(),
    portrait: z.string(),
    partSheet: z.string(),
    mouth: z.string(),
  }),
  negativePrompts: z.array(z.string()),
  /** Named palette, hex values — guidance for the agent + reference. */
  palette: z.record(z.string(), z.string()),
});
export type HouseStyle = z.infer<typeof HouseStyleSchema>;

/** Starter Hindu-miniature-painting-inspired house style (draft). */
export const STARTER_HOUSE_STYLE: HouseStyle = {
  status: "draft",
  version: 1,
  model: { name: "Qwen-Image-Edit-Q4_K_M.gguf", license: "Apache-2.0" },
  style:
    "Hindu miniature painting inspired: Pahari/Kangra-school flat 2D illustration, " +
    "fine ink outlines, jewel-tone flat color fills, gold-leaf ornament accents, " +
    "stylised almond eyes, serene expression, front-facing devotional icon framing.",
  promptFragments: {
    global:
      "traditional Indian miniature painting, Kangra school, flat 2D illustration, " +
      "clean ink linework, jewel-tone flat fills, gold ornament, no photorealism",
    portrait: "single figure, front-facing, full body, neutral pose, plain background",
    partSheet:
      "isolated body part, complete overlapping edges (art continues under adjacent parts), " +
      "flat magenta chroma background, no shadow, no cropping at joints",
    mouth: "mouth region only, flat magenta chroma background, consistent lip color, no teeth artifacts",
  },
  negativePrompts: [
    "photorealistic",
    "3d render",
    "harsh drop shadow",
    "cropped joints",
    "extra limbs",
    "watermark",
    "text",
    "signature",
  ],
  palette: {
    krishnaBlue: "#2E4A8B",
    saffron: "#F4A300",
    vermilion: "#E34234",
    leafGreen: "#1E6E3C",
    gold: "#C9A227",
    ivory: "#F6EFE0",
    ink: "#2A2118",
  },
};

/** Per-part rig layout: parent, draw order, and fractional joint anchors. */
export interface PartLayout {
  parent: StandardPart | null;
  z: number;
  /** Rotation pivot as a fraction of THIS part's [width, height]. */
  pivotFrac: [number, number];
  /** Where this part attaches on its PARENT, as a fraction of the parent's [w,h]. */
  attachFrac?: [number, number];
}

/** Design canvas `char rig` targets (matches ARCHITECTURE §9 designSize). */
export const RIG_DESIGN_SIZE: [number, number] = [1024, 2048];

/**
 * Where the ROOT part's (torso) pivot is anchored on the design stage
 * (nativeAttach model). Everything else hangs off it through the attach chain.
 */
export const RIG_ROOT_ANCHOR: [number, number] = [512, 620];

/**
 * Proportion targets for the `nativeAttach` normalization step (ARCHITECTURE
 * §8.2). Each part's `norm` = [TARGET_SIZE.w / nativeW, TARGET_SIZE.h / nativeH]
 * scales its independently-generated PNG (arbitrary pixel size) to this shared
 * design footprint, so heterogeneous parts read as one coherently-proportioned
 * figure and the attach chain lines up regardless of raw pixel dimensions.
 * A humanoid on the 1024×2048 canvas; the pivot-editor refines per character.
 */
export const TARGET_SIZE: Record<StandardPart, [number, number]> = {
  torso: [300, 680],
  head: [320, 360],
  arm_u_l: [110, 300],
  arm_l_l: [96, 260],
  hand_l: [120, 130],
  arm_u_r: [110, 300],
  arm_l_r: [96, 260],
  hand_r: [120, 130],
  leg_u_l: [150, 430],
  leg_l_l: [130, 390],
  foot_l: [200, 100],
  leg_u_r: [150, 430],
  leg_l_r: [130, 390],
  foot_r: [200, 100],
};

/**
 * Default humanoid layout over the standard skeleton. Fractions keep every
 * pivot inside its part's bounds regardless of the cut image size; the
 * pivot-editor refines them. Legs draw behind torso; arms and head in front.
 */
export const DEFAULT_LAYOUT: Record<StandardPart, PartLayout> = {
  torso: { parent: null, z: 10, pivotFrac: [0.5, 0.15] },
  head: { parent: "torso", z: 40, pivotFrac: [0.5, 0.9], attachFrac: [0.5, 0.1] },
  arm_u_l: { parent: "torso", z: 20, pivotFrac: [0.5, 0.1], attachFrac: [0.18, 0.16] },
  arm_l_l: { parent: "arm_u_l", z: 20, pivotFrac: [0.5, 0.1], attachFrac: [0.5, 0.9] },
  hand_l: { parent: "arm_l_l", z: 21, pivotFrac: [0.5, 0.1], attachFrac: [0.5, 0.9] },
  arm_u_r: { parent: "torso", z: 20, pivotFrac: [0.5, 0.1], attachFrac: [0.82, 0.16] },
  arm_l_r: { parent: "arm_u_r", z: 20, pivotFrac: [0.5, 0.1], attachFrac: [0.5, 0.9] },
  hand_r: { parent: "arm_l_r", z: 21, pivotFrac: [0.5, 0.1], attachFrac: [0.5, 0.9] },
  leg_u_l: { parent: "torso", z: 5, pivotFrac: [0.5, 0.1], attachFrac: [0.38, 0.92] },
  leg_l_l: { parent: "leg_u_l", z: 5, pivotFrac: [0.5, 0.1], attachFrac: [0.5, 0.9] },
  foot_l: { parent: "leg_l_l", z: 6, pivotFrac: [0.35, 0.3], attachFrac: [0.5, 0.9] },
  leg_u_r: { parent: "torso", z: 5, pivotFrac: [0.5, 0.1], attachFrac: [0.62, 0.92] },
  leg_l_r: { parent: "leg_u_r", z: 5, pivotFrac: [0.5, 0.1], attachFrac: [0.5, 0.9] },
  foot_r: { parent: "leg_l_r", z: 6, pivotFrac: [0.35, 0.3], attachFrac: [0.5, 0.9] },
};

/** Per-part positive prompt hints appended after the house-style partSheet fragment. */
export const PART_PROMPTS: Record<StandardPart, string> = {
  torso: "the character's torso and chest, including shoulders and hips",
  head: "the character's head and face, front-facing, neck stub included",
  arm_u_l: "the character's left upper arm (shoulder to elbow)",
  arm_l_l: "the character's left forearm (elbow to wrist)",
  hand_l: "the character's left hand, relaxed open pose",
  arm_u_r: "the character's right upper arm (shoulder to elbow)",
  arm_l_r: "the character's right forearm (elbow to wrist)",
  hand_r: "the character's right hand, relaxed open pose",
  leg_u_l: "the character's left thigh (hip to knee)",
  leg_l_l: "the character's left shin (knee to ankle)",
  foot_l: "the character's left foot",
  leg_u_r: "the character's right thigh (hip to knee)",
  leg_l_r: "the character's right shin (knee to ankle)",
  foot_r: "the character's right foot",
};

export const ORDERED_PARTS: readonly StandardPart[] = STANDARD_PARTS;

/** Rhubarb viseme → lip-shape prompt hint for the mouth-shapes workflow. */
export const VISEME_PROMPTS: Record<string, string> = {
  A: "lips gently closed, resting",
  B: "lips slightly parted, small opening (M, B, P sounds relaxed)",
  C: "mouth open medium, rounded (E, EH sounds)",
  D: "mouth open wide (A, AH sounds)",
  E: "mouth slightly rounded and open (O sounds)",
  F: "lips puckered forward, small round (OO, W, U sounds)",
  G: "upper teeth on lower lip (F, V sounds)",
  H: "tongue visible, mouth open (L sounds)",
  X: "mouth closed, neutral rest pose",
};

/** brief.md template. `{{...}}` placeholders are filled by the make-character agent. */
export function briefTemplate(id: string, styleSummary: string): string {
  return `# Character brief — ${id}

> Draft. The make-character skill fills the grounding + iconography sections
> from the corpus adapter, then runs \`anim char gen ${id}\`.

## Identity
- **id**: ${id}
- **display name**: {{Display Name}}
- **epithets**: {{epithet, epithet}}

## Corpus grounding (citations)
- {{path/in/the-Hindu-timeline — e.g. 04-deep-dives/....md}}
- {{events.jsonl ids or catalog refs}}

## Iconography (drives the prompts)
- **skin tone**: {{}}
- **ornaments / jewellery**: {{}}
- **garments**: {{}}
- **weapons / attributes**: {{}}
- **vāhana / companions**: {{}}
- **known limitations / cautions**: {{}}

## House style (locked — from library/style/house-style.json)
${styleSummary}

## Generation notes
- Anchor first (front-facing devotional icon); human approves before parts.
- Parts on flat magenta chroma; mouth shapes are head-space overlays (A–H, X).
- Seeds recorded in draft/gen-meta.json; frozen into v<N>/meta.json on approve.
`;
}
