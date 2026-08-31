/**
 * Generate the `_testrig` character: `library/characters/_testrig/v1`
 * (ARCHITECTURE §8.2, `nativeAttach` model). Unlike the `_placeholder` cast
 * (sharedFrame — every part a full 1024×2048 canvas), _testrig exercises the
 * NATIVE-PART model the way `anim char rig` emits it:
 *
 *   - each of the 14 standard parts is a SEPARATE, deliberately heterogeneous
 *     PNG (different pixel sizes AND aspect ratios, left ≠ right on purpose);
 *   - `pivot` is in each part's OWN image space (part-local);
 *   - `attach` is a point on the PARENT (parent's own image space) — the child's
 *     pivot is hooked there by forward kinematics;
 *   - `norm` = [targetW/nativeW, targetH/nativeH] normalizes every part to a
 *     shared target skeleton so the heterogeneous parts read as one figure;
 *   - the root (`torso`) `attach` is the design-space anchor for its pivot;
 *   - 9 mouth visemes are trimmed overlays centred on the head-own-space
 *     `mouth.at`; 3 eye overlays ride the head part.
 *
 * Fully deterministic (no randomness) — safe to re-run.
 *
 *   npm --workspace @anim/studio run gen:testrig   [-- --out <libraryDir>]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PuppetSchema, LibraryMetaSchema, VISEMES, type Puppet } from "@anim/core";

const DW = 1024;
const DH = 2048;

type Pt = [number, number];

// --- the target skeleton (design-pixel space) ------------------------------
// Design footprint each part normalizes to, plus pivot/attach fractions of the
// part's OWN image. norm scales native → target so joints line up regardless of
// the heterogeneous native sizes below.

interface PartSpec {
  parent: string | null;
  z: number;
  /** Pivot as a fraction of THIS part's own [w, h]. */
  pivotFrac: Pt;
  /** Attach on the PARENT as a fraction of the PARENT's own [w, h]. */
  attachFrac?: Pt;
  /** Normalized design footprint [w, h] this part is scaled to. */
  target: Pt;
  /** Deliberately heterogeneous native pixel size [w, h] (pre-normalization). */
  native: Pt;
  /** Fill colour + a joint tint for the proximal cap. */
  fill: string;
}

// Root design anchor: where torso's pivot sits on the 1024×2048 stage.
const TORSO_ANCHOR: Pt = [DW / 2, 620];

const SKIN = "#d9a066";
const HAIR = "#2a2320";

// Distinct per-group colours so adjacent parts read against each other in QA:
// blue torso, terracotta arms, green legs, skin head/hands.
const TORSO = "#4a6fa5";
const ARM_U = "#c25b4a";
const ARM_L = "#d67c63";
const LEG_U = "#2f7d55";
const LEG_L = "#3fa06d";
const FOOT = "#245239";

// Deliberately heterogeneous native pixel sizes (left ≠ right on purpose); norm
// normalizes each onto `target`. Shoulders/hips are set wide so hanging limbs
// sit at the silhouette edges and the two legs read apart, not as one column.
const SPEC: Record<string, PartSpec> = {
  torso: { parent: null, z: 10, pivotFrac: [0.5, 0.14], target: [340, 660], native: [220, 500], fill: TORSO },
  head: { parent: "torso", z: 40, pivotFrac: [0.5, 0.86], attachFrac: [0.5, 0.05], target: [330, 370], native: [500, 520], fill: SKIN },
  arm_u_l: { parent: "torso", z: 20, pivotFrac: [0.5, 0.12], attachFrac: [0.08, 0.14], target: [90, 300], native: [64, 300], fill: ARM_U },
  arm_l_l: { parent: "arm_u_l", z: 20, pivotFrac: [0.5, 0.1], attachFrac: [0.5, 0.9], target: [78, 260], native: [50, 240], fill: ARM_L },
  hand_l: { parent: "arm_l_l", z: 21, pivotFrac: [0.5, 0.14], attachFrac: [0.5, 0.9], target: [110, 110], native: [80, 80], fill: SKIN },
  arm_u_r: { parent: "torso", z: 20, pivotFrac: [0.5, 0.12], attachFrac: [0.92, 0.14], target: [90, 300], native: [140, 210], fill: ARM_U },
  arm_l_r: { parent: "arm_u_r", z: 20, pivotFrac: [0.5, 0.1], attachFrac: [0.5, 0.9], target: [78, 260], native: [120, 180], fill: ARM_L },
  hand_r: { parent: "arm_l_r", z: 21, pivotFrac: [0.5, 0.14], attachFrac: [0.5, 0.9], target: [110, 110], native: [160, 200], fill: SKIN },
  leg_u_l: { parent: "torso", z: 5, pivotFrac: [0.5, 0.08], attachFrac: [0.26, 0.95], target: [120, 430], native: [90, 460], fill: LEG_U },
  leg_l_l: { parent: "leg_u_l", z: 5, pivotFrac: [0.5, 0.08], attachFrac: [0.5, 0.92], target: [104, 390], native: [70, 420], fill: LEG_L },
  foot_l: { parent: "leg_l_l", z: 6, pivotFrac: [0.32, 0.35], attachFrac: [0.5, 0.9], target: [180, 96], native: [140, 70], fill: FOOT },
  leg_u_r: { parent: "torso", z: 5, pivotFrac: [0.5, 0.08], attachFrac: [0.74, 0.95], target: [120, 430], native: [200, 300], fill: LEG_U },
  leg_l_r: { parent: "leg_u_r", z: 5, pivotFrac: [0.5, 0.08], attachFrac: [0.5, 0.92], target: [104, 390], native: [180, 260], fill: LEG_L },
  foot_r: { parent: "leg_l_r", z: 6, pivotFrac: [0.68, 0.35], attachFrac: [0.5, 0.9], target: [180, 96], native: [260, 150], fill: FOOT },
};

const ORDER = [
  "torso", "head",
  "arm_u_l", "arm_l_l", "hand_l", "arm_u_r", "arm_l_r", "hand_r",
  "leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r",
];

function svg(w: number, h: number, inner: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${inner}</svg>`,
  );
}

/**
 * Draw one part inside its OWN native image. A limb is a capsule spanning from
 * the pivot (proximal, near top) to the distal end (near bottom) with rounded
 * caps so adjacent parts overlap at joints; a small darker disc marks the pivot
 * so joint continuity is visible in QA stills.
 */
function drawPart(id: string, spec: PartSpec): string {
  const [w, h] = spec.native;
  const [pfx, pfy] = spec.pivotFrac;
  const px = w * pfx;
  const py = h * pfy;

  if (id === "torso") {
    return (
      `<rect x="${w * 0.06}" y="${h * 0.02}" width="${w * 0.88}" height="${h * 0.96}" rx="${w * 0.28}" fill="${spec.fill}"/>` +
      `<rect x="${w * 0.06}" y="${h * 0.02}" width="${w * 0.88}" height="${h * 0.12}" rx="${w * 0.2}" fill="#3d5c8a"/>` +
      pivotDot(px, py)
    );
  }
  if (id === "head") {
    // Face disc centred in the upper part; neck stub down to the pivot (bottom).
    const cx = w * 0.5;
    const cy = h * 0.42;
    const r = Math.min(w, h) * 0.4;
    return (
      `<rect x="${cx - w * 0.06}" y="${cy}" width="${w * 0.12}" height="${py - cy}" fill="${SKIN}"/>` +
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SKIN}"/>` +
      `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} L ${cx + r} ${cy - r * 0.5} A ${r} ${r} 0 0 0 ${cx - r} ${cy - r * 0.5} Z" fill="${HAIR}"/>` +
      pivotDot(px, py)
    );
  }
  if (id.startsWith("foot")) {
    // A wide sole; pivot at the ankle (top).
    return (
      `<ellipse cx="${w * 0.5}" cy="${h * 0.6}" rx="${w * 0.46}" ry="${h * 0.36}" fill="${spec.fill}"/>` +
      pivotDot(px, py)
    );
  }
  if (id.startsWith("hand")) {
    return `<circle cx="${w * 0.5}" cy="${h * 0.5}" r="${Math.min(w, h) * 0.44}" fill="${spec.fill}"/>` + pivotDot(px, py);
  }
  // Generic limb capsule from pivot (top) to distal (bottom).
  const capW = w * 0.72;
  const x = (w - capW) / 2;
  const top = h * 0.04;
  const bot = h * 0.96;
  return (
    `<rect x="${x}" y="${top}" width="${capW}" height="${bot - top}" rx="${capW / 2}" fill="${spec.fill}"/>` +
    pivotDot(px, py)
  );
}

function pivotDot(x: number, y: number): string {
  return `<circle cx="${x}" cy="${y}" r="5" fill="#12181f" fill-opacity="0.35"/>`;
}

// --- mouth + eyes (nativeAttach overlays) ----------------------------------

const MOUTH_W = 180;
const MOUTH_H = 120;
const MOUTH = "#7a2e2e";
function mouthShape(v: string): string {
  const open: Record<string, number> = { A: 0.05, B: 0.15, C: 0.55, D: 0.85, E: 0.4, F: 0.25, G: 0.35, H: 0.6, X: 0 };
  const o = open[v] ?? 0;
  const cx = MOUTH_W / 2;
  const cy = MOUTH_H / 2;
  const ry = 8 + o * 46;
  const rx = 70 - o * 12;
  return o <= 0.06
    ? `<line x1="${cx - rx}" y1="${cy}" x2="${cx + rx}" y2="${cy}" stroke="${MOUTH}" stroke-width="12" stroke-linecap="round"/>`
    : `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${MOUTH}"/>`;
}

// Eye overlays span the head's native image so they ride world(head) directly.
const EYE = "#20242c";
const HEAD_NATIVE = SPEC.head!.native;
function eyeShape(state: "open" | "half" | "closed"): string {
  const [w, h] = HEAD_NATIVE;
  const cy = h * 0.34;
  const lx = w * 0.5 - w * 0.15;
  const rx = w * 0.5 + w * 0.15;
  if (state === "closed") {
    return (
      `<line x1="${lx - 34}" y1="${cy}" x2="${lx + 34}" y2="${cy}" stroke="${EYE}" stroke-width="10" stroke-linecap="round"/>` +
      `<line x1="${rx - 34}" y1="${cy}" x2="${rx + 34}" y2="${cy}" stroke="${EYE}" stroke-width="10" stroke-linecap="round"/>`
    );
  }
  const ry = state === "half" ? 12 : 26;
  return `<ellipse cx="${lx}" cy="${cy}" rx="28" ry="${ry}" fill="${EYE}"/><ellipse cx="${rx}" cy="${cy}" rx="28" ry="${ry}" fill="${EYE}"/>`;
}

function round2(n: number): number {
  return Math.round(n * 10000) / 10000;
}

async function main(): Promise<void> {
  const outArgIdx = process.argv.indexOf("--out");
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const libraryDir = outArgIdx >= 0 ? process.argv[outArgIdx + 1]! : join(repoRoot, "library");
  const root = join(libraryDir, "characters", "_testrig", "v1");
  mkdirSync(join(root, "parts"), { recursive: true });
  mkdirSync(join(root, "mouth"), { recursive: true });
  mkdirSync(join(root, "eyes"), { recursive: true });

  // Parts — each drawn at its own heterogeneous native pixel size.
  for (const id of ORDER) {
    const spec = SPEC[id]!;
    const [w, h] = spec.native;
    await sharp(svg(w, h, drawPart(id, spec))).png().toFile(join(root, "parts", `${id}.png`));
  }
  for (const v of VISEMES) {
    await sharp(svg(MOUTH_W, MOUTH_H, mouthShape(v))).png().toFile(join(root, "mouth", `${v}.png`));
  }
  for (const s of ["open", "half", "closed"] as const) {
    await sharp(svg(HEAD_NATIVE[0], HEAD_NATIVE[1], eyeShape(s))).png().toFile(join(root, "eyes", `${s}.png`));
  }

  // Rig — pivots part-local, attach on the parent (root: design anchor), norm =
  // target/native so the heterogeneous parts normalize onto the shared skeleton.
  const parts = ORDER.map((id) => {
    const spec = SPEC[id]!;
    const [nw, nh] = spec.native;
    const pivot: Pt = [Math.round(nw * spec.pivotFrac[0]), Math.round(nh * spec.pivotFrac[1])];
    const norm: Pt = [round2(spec.target[0] / nw), round2(spec.target[1] / nh)];
    const part: Record<string, unknown> = {
      id,
      image: `parts/${id}.png`,
      pivot,
      z: spec.z,
      parent: spec.parent,
      norm,
    };
    if (spec.parent === null) {
      part.attach = TORSO_ANCHOR; // root: design-space anchor for the pivot
    } else {
      const p = SPEC[spec.parent]!;
      const [pw, ph] = p.native;
      part.attach = [Math.round(pw * spec.attachFrac![0]), Math.round(ph * spec.attachFrac![1])];
    }
    return part;
  });

  const head = SPEC.head!.native;
  const puppet: Puppet = PuppetSchema.parse({
    id: "_testrig",
    version: 1,
    rig: "nativeAttach",
    designSize: [DW, DH],
    parts,
    mouth: {
      anchor: "head",
      at: [Math.round(head[0] * 0.5), Math.round(head[1] * 0.44)],
      shapes: Object.fromEntries(VISEMES.map((v) => [v, `mouth/${v}.png`])),
    },
    eyes: { blink: ["eyes/open.png", "eyes/half.png", "eyes/closed.png"] },
    skins: { default: {} },
    meta: {
      grounding: "",
      notes: ["Programmatic nativeAttach test rig — heterogeneous native part sizes, not for publication."],
    },
  });
  writeFileSync(join(root, "puppet.json"), JSON.stringify(puppet, null, 2) + "\n");

  const meta = LibraryMetaSchema.parse({
    id: "_testrig",
    version: 1,
    kind: "character",
    model: { name: "procedural-testrig", license: "ours" },
    seeds: {},
    prompts: {},
    date: "2026-07-08",
    approver: "studio/generate-testrig",
    grounding: [],
    notes: ["Generated by packages/studio/src/generate-testrig.ts. Deterministic; re-runnable. Exercises the nativeAttach puppet model."],
  });
  writeFileSync(join(root, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  process.stdout.write(`testrig cast written to ${root} (${ORDER.length} parts, ${VISEMES.length} visemes, 3 eyes, nativeAttach)\n`);
}

main().catch((err) => {
  process.stderr.write(`generate-testrig failed: ${(err as Error).message}\n`);
  process.exit(1);
});
