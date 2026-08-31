/**
 * Generate the built-in placeholder cast: `library/characters/_placeholder/v1`
 * (ARCHITECTURE §9). Simple flat-shape parts for ALL 14 standard parts + 9
 * mouth visemes + 3 eye states + a valid `puppet.json`, so the entire pipeline
 * is testable before any generated art exists.
 *
 * Each part is a FULL design-canvas (1024×2048) transparent PNG with the part
 * drawn in its anatomical place; the puppet runtime places every sprite by a
 * single matrix (parts share one coordinate frame). Fully deterministic — no
 * randomness, safe to re-run.
 *
 *   npm --workspace @anim/studio run gen:placeholder   [-- --out <libraryDir>]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { PuppetSchema, LibraryMetaSchema, VISEMES, type Puppet } from "@anim/core";

const W = 1024;
const H = 2048;
const CX = W / 2;

// Flat ink-and-fill palette. The placeholder is still procedural, but each
// staged role gets a deliberate silhouette, costume, hair and prop language.
const SKIN = "#d9a066";
const MOUTH = "#7a2e2e";
const EYE = "#20242c";
const INK = "#272331";

type Role = "lin" | "senior" | "elder";
const ROLE = {
  lin: { robe: "#287f8f", dark: "#174b62", accent: "#f2c14e", hair: "#242334", leg: "#294052", shoe: "#d96a45" },
  senior: { robe: "#a43f4f", dark: "#57243d", accent: "#f0c35a", hair: "#171c2f", leg: "#25283c", shoe: "#5d3b4c" },
  elder: { robe: "#6b4c91", dark: "#352b61", accent: "#f3d57a", hair: "#d9d4ce", leg: "#3e3555", shoe: "#4a3857" },
} as const;

type Pt = [number, number];

// Joints (design space).
const J = {
  neck: [CX, 560] as Pt,
  shoulderL: [392, 600] as Pt,
  shoulderR: [632, 600] as Pt,
  elbowL: [350, 820] as Pt,
  elbowR: [674, 820] as Pt,
  wristL: [332, 1010] as Pt,
  wristR: [692, 1010] as Pt,
  hipL: [452, 1120] as Pt,
  hipR: [572, 1120] as Pt,
  kneeL: [448, 1470] as Pt,
  kneeR: [576, 1470] as Pt,
  ankleL: [448, 1780] as Pt,
  ankleR: [576, 1780] as Pt,
};

function svg(inner: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`,
  );
}

function limb(a: Pt, b: Pt, color: string, width: number): string {
  return `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
}
function circle(c: Pt, r: number, color: string, stroke = ""): string {
  return `<circle cx="${c[0]}" cy="${c[1]}" r="${r}" fill="${color}"${stroke ? ` stroke="${stroke}" stroke-width="12"` : ""}/>`;
}
function ellipse(c: Pt, rx: number, ry: number, color: string, stroke = ""): string {
  return `<ellipse cx="${c[0]}" cy="${c[1]}" rx="${rx}" ry="${ry}" fill="${color}"${stroke ? ` stroke="${stroke}" stroke-width="12"` : ""}/>`;
}

// --- part drawings ---------------------------------------------------------

function outlined(inner: string): string {
  return inner;
}

function head(role: Role): string {
  const c = ROLE[role];
  const hair = role === "elder"
    ? `<path d="M366 380 Q370 245 512 240 Q654 245 658 380 L620 350 L590 300 L560 340 L520 292 L480 340 L435 300 L405 350Z" fill="${c.hair}" stroke="${INK}" stroke-width="14"/>` +
      `<path d="M390 410 Q405 520 512 545 Q619 520 634 410 Q605 455 570 448 L512 480 L454 448 Q419 455 390 410Z" fill="${c.hair}" stroke="${INK}" stroke-width="12"/>` +
      `<path d="M430 280 L512 205 L594 280 L576 310 L448 310Z" fill="${c.robe}" stroke="${INK}" stroke-width="14"/>` +
      `<path d="M474 238 L512 184 L550 238" fill="none" stroke="${c.accent}" stroke-width="16"/>`
    : role === "senior"
      ? `<path d="M360 410 Q365 220 512 225 Q659 220 664 410 L625 365 L605 295 L570 335 L535 278 L495 332 L452 278 L418 340Z" fill="${c.hair}" stroke="${INK}" stroke-width="14"/>` +
        `<path d="M402 260 Q512 160 622 260" fill="none" stroke="${c.accent}" stroke-width="22"/>` +
        `<circle cx="512" cy="178" r="28" fill="${c.accent}" stroke="${INK}" stroke-width="12"/>`
      : `<path d="M355 405 Q370 225 512 235 Q654 225 669 405 L630 350 L598 302 L568 345 L528 286 L486 340 L445 292 L405 350Z" fill="${c.hair}" stroke="${INK}" stroke-width="14"/>` +
        `<path d="M610 270 Q700 310 668 420" fill="none" stroke="${c.hair}" stroke-width="32" stroke-linecap="round"/>`;
  return `<rect x="490" y="520" width="44" height="82" rx="18" fill="${SKIN}" stroke="${INK}" stroke-width="12"/>` +
    circle([CX, 400], 150, SKIN) +
    `<circle cx="372" cy="420" r="26" fill="${SKIN}" stroke="${INK}" stroke-width="12"/><circle cx="652" cy="420" r="26" fill="${SKIN}" stroke="${INK}" stroke-width="12"/>` + hair +
    (role === "elder" ? `<path d="M432 454 Q512 500 592 454 L570 510 Q512 548 454 510Z" fill="${c.hair}" stroke="${INK}" stroke-width="10"/>` : "");
}

function torso(role: Role): string {
  const c = ROLE[role];
  const prop = role === "senior"
    ? `<path d="M650 680 L735 595 L760 610 L680 730Z" fill="#d8dde8" stroke="${INK}" stroke-width="14"/><path d="M728 592 L770 560" stroke="${c.accent}" stroke-width="18" stroke-linecap="round"/>`
    : role === "elder"
      ? `<path d="M690 630 L760 1110" stroke="#6d4429" stroke-width="24"/><circle cx="690" cy="620" r="30" fill="${c.accent}" stroke="${INK}" stroke-width="12"/>`
      : `<path d="M374 606 L650 606" stroke="#6a3f2f" stroke-width="24" stroke-linecap="square"/>` +
        `<path d="M386 622 Q430 650 474 622 Q512 650 550 622 Q594 650 638 622 L638 1065 Q596 1100 554 1065 Q512 1100 470 1065 Q428 1100 386 1065Z" fill="#e9c978" stroke="${INK}" stroke-width="14"/>` +
        `<path d="M410 650 L410 1048 M458 650 L458 1070 M506 650 L506 1050 M554 650 L554 1070 M602 650 L602 1048" stroke="#b4574c" stroke-width="20"/>` +
        `<path d="M430 650 L430 1048 M482 650 L482 1065 M530 650 L530 1050 M578 650 L578 1065" stroke="#f8e4a5" stroke-width="12"/>` +
        `<circle cx="408" cy="606" r="22" fill="#f4d27b" stroke="${INK}" stroke-width="10"/><circle cx="456" cy="606" r="22" fill="#f4d27b" stroke="${INK}" stroke-width="10"/><circle cx="568" cy="606" r="22" fill="#f4d27b" stroke="${INK}" stroke-width="10"/><circle cx="616" cy="606" r="22" fill="#f4d27b" stroke="${INK}" stroke-width="10"/>` +
        `<path d="M386 650 Q420 720 410 800 T430 1045 M474 650 Q500 740 482 835 T500 1055 M562 650 Q540 740 554 835 T570 1055 M638 650 Q604 720 602 800 T590 1045" fill="none" stroke="#7d4b52" stroke-width="12"/>` +
        `<path d="M420 905 Q512 950 604 905" fill="none" stroke="${c.accent}" stroke-width="28"/><rect x="480" y="930" width="64" height="70" rx="12" fill="${c.accent}" stroke="${INK}" stroke-width="12"/><path d="M452 700 L512 770 L572 700" fill="none" stroke="#d8fbf2" stroke-width="16"/>`;
  return `<path d="M390 580 Q512 535 634 580 L670 1110 Q512 1170 354 1110Z" fill="${c.robe}" stroke="${INK}" stroke-width="16"/>` +
    `<path d="M430 590 L512 700 L594 590" fill="${c.dark}" stroke="${INK}" stroke-width="14"/>` +
    `<path d="M405 1080 Q512 1120 619 1080" fill="none" stroke="${c.accent}" stroke-width="18"/>` + prop;
}

function makeParts(role: Role): { id: string; inner: string }[] {
  const c = ROLE[role];
  return [
    { id: "torso", inner: torso(role) },
    { id: "head", inner: head(role) },
    { id: "arm_u_l", inner: limb(J.shoulderL, J.elbowL, c.dark, 86) + limb(J.shoulderL, J.elbowL, c.robe, 62) },
    { id: "arm_l_l", inner: limb(J.elbowL, J.wristL, c.robe, 72) + circle(J.elbowL, 38, c.accent) },
    { id: "hand_l", inner: circle(J.wristL, 42, SKIN, INK) },
    { id: "arm_u_r", inner: limb(J.shoulderR, J.elbowR, c.dark, 86) + limb(J.shoulderR, J.elbowR, c.robe, 62) },
    { id: "arm_l_r", inner: limb(J.elbowR, J.wristR, c.robe, 72) + circle(J.elbowR, 38, c.accent) },
    { id: "hand_r", inner: circle(J.wristR, 42, SKIN, INK) },
    { id: "leg_u_l", inner: limb(J.hipL, J.kneeL, c.leg, 98) + limb(J.hipL, J.kneeL, c.dark, 72) },
    { id: "leg_l_l", inner: limb(J.kneeL, J.ankleL, c.leg, 88) },
    { id: "foot_l", inner: ellipse([J.ankleL[0] - 14, J.ankleL[1] + 30], 72, 34, c.shoe, INK) },
    { id: "leg_u_r", inner: limb(J.hipR, J.kneeR, c.leg, 98) + limb(J.hipR, J.kneeR, c.dark, 72) },
    { id: "leg_l_r", inner: limb(J.kneeR, J.ankleR, c.leg, 88) },
    { id: "foot_r", inner: ellipse([J.ankleR[0] + 14, J.ankleR[1] + 30], 72, 34, c.shoe, INK) },
  ];
}

const PARTS = makeParts("lin");
const ROLES: Role[] = ["lin", "senior", "elder"];

// Rig metadata: pivot / z / parent / attach for each part (design space).
const RIG: Record<string, { pivot: Pt; z: number; parent: string | null; attach?: Pt }> = {
  torso: { pivot: [CX, 600], z: 40, parent: null },
  head: { pivot: J.neck, z: 60, parent: "torso", attach: [CX, 400] },
  arm_u_l: { pivot: J.shoulderL, z: 50, parent: "torso", attach: J.shoulderL },
  arm_l_l: { pivot: J.elbowL, z: 50, parent: "arm_u_l", attach: J.elbowL },
  hand_l: { pivot: J.wristL, z: 52, parent: "arm_l_l", attach: J.wristL },
  arm_u_r: { pivot: J.shoulderR, z: 50, parent: "torso", attach: J.shoulderR },
  arm_l_r: { pivot: J.elbowR, z: 50, parent: "arm_u_r", attach: J.elbowR },
  hand_r: { pivot: J.wristR, z: 52, parent: "arm_l_r", attach: J.wristR },
  leg_u_l: { pivot: J.hipL, z: 30, parent: "torso", attach: J.hipL },
  leg_l_l: { pivot: J.kneeL, z: 30, parent: "leg_u_l", attach: J.kneeL },
  foot_l: { pivot: J.ankleL, z: 31, parent: "leg_l_l", attach: J.ankleL },
  leg_u_r: { pivot: J.hipR, z: 30, parent: "torso", attach: J.hipR },
  leg_l_r: { pivot: J.kneeR, z: 30, parent: "leg_u_r", attach: J.kneeR },
  foot_r: { pivot: J.ankleR, z: 31, parent: "leg_l_r", attach: J.ankleR },
};

// Mouth visemes: a face-space mouth of varying openness at [512, 470].
const MOUTH_AT: Pt = [CX, 470];
function mouthShape(v: string): string {
  // Openness 0..1 per viseme (rest X closed).
  const open: Record<string, number> = { A: 0.05, B: 0.15, C: 0.55, D: 0.8, E: 0.4, F: 0.25, G: 0.35, H: 0.6, X: 0 };
  const o = open[v] ?? 0;
  const ry = 6 + o * 34;
  const rx = 46 - o * 8;
  return o <= 0.06
    ? `<line x1="${MOUTH_AT[0] - rx}" y1="${MOUTH_AT[1]}" x2="${MOUTH_AT[0] + rx}" y2="${MOUTH_AT[1]}" stroke="${MOUTH}" stroke-width="10" stroke-linecap="round"/>`
    : ellipse(MOUTH_AT, rx, ry, MOUTH);
}

// Eyes: open / half / closed at [512, 380].
const EYE_L: Pt = [CX - 58, 380];
const EYE_R: Pt = [CX + 58, 380];
function eyeShape(state: "open" | "half" | "closed"): string {
  if (state === "closed") {
    return (
      `<line x1="${EYE_L[0] - 26}" y1="${EYE_L[1]}" x2="${EYE_L[0] + 26}" y2="${EYE_L[1]}" stroke="${EYE}" stroke-width="8" stroke-linecap="round"/>` +
      `<line x1="${EYE_R[0] - 26}" y1="${EYE_R[1]}" x2="${EYE_R[0] + 26}" y2="${EYE_R[1]}" stroke="${EYE}" stroke-width="8" stroke-linecap="round"/>`
    );
  }
  const ry = state === "half" ? 10 : 20;
  return ellipse(EYE_L, 22, ry, EYE) + ellipse(EYE_R, 22, ry, EYE);
}

async function main(): Promise<void> {
  const outArgIdx = process.argv.indexOf("--out");
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
  const libraryDir = outArgIdx >= 0 ? process.argv[outArgIdx + 1]! : join(repoRoot, "library");
  const root = join(libraryDir, "characters", "_placeholder", "v1");
  mkdirSync(join(root, "parts"), { recursive: true });
  mkdirSync(join(root, "mouth"), { recursive: true });
  mkdirSync(join(root, "eyes"), { recursive: true });
  for (const role of ROLES) mkdirSync(join(root, "skins", role), { recursive: true });

  for (const p of PARTS) {
    await sharp(svg(p.inner)).png().toFile(join(root, "parts", `${p.id}.png`));
  }
  // Role skins keep one compatible rig while giving the cast different
  // silhouettes and visual identities at assemble time.
  for (const role of ROLES) {
    for (const p of makeParts(role)) {
      await sharp(svg(p.inner)).png().toFile(join(root, "skins", role, `${p.id}.png`));
    }
  }
  for (const v of VISEMES) {
    await sharp(svg(mouthShape(v))).png().toFile(join(root, "mouth", `${v}.png`));
  }
  for (const s of ["open", "half", "closed"] as const) {
    await sharp(svg(eyeShape(s))).png().toFile(join(root, "eyes", `${s}.png`));
  }

  const puppet: Puppet = PuppetSchema.parse({
    id: "_placeholder",
    version: 1,
    designSize: [W, H],
    parts: PARTS.map((p) => {
      const r = RIG[p.id]!;
      return {
        id: p.id,
        image: `parts/${p.id}.png`,
        pivot: r.pivot,
        z: r.z,
        parent: r.parent,
        ...(r.attach ? { attach: r.attach } : {}),
      };
    }),
    mouth: {
      anchor: "head",
      at: MOUTH_AT,
      shapes: Object.fromEntries(VISEMES.map((v) => [v, `mouth/${v}.png`])),
    },
    eyes: { blink: ["eyes/open.png", "eyes/half.png", "eyes/closed.png"] },
    skins: Object.fromEntries([
      ["default", {}],
      ...ROLES.map((role) => [role, Object.fromEntries(PARTS.map((p) => [p.id, `skins/${role}/${p.id}.png`]))]),
    ]),
    meta: { grounding: "", notes: ["Programmatic placeholder cast — flat shapes, not for publication."] },
  });
  writeFileSync(join(root, "puppet.json"), JSON.stringify(puppet, null, 2) + "\n");

  const meta = LibraryMetaSchema.parse({
    id: "_placeholder",
    version: 1,
    kind: "character",
    model: { name: "procedural-placeholder", license: "ours" },
    seeds: {},
    prompts: {},
    date: "2026-07-08",
    approver: "studio/generate-placeholder",
    grounding: [],
    notes: ["Generated by packages/studio/src/generate-placeholder.ts. Deterministic; re-runnable."],
  });
  writeFileSync(join(root, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

  process.stdout.write(`placeholder cast written to ${root} (${PARTS.length} parts, ${VISEMES.length} visemes, 3 eyes)\n`);
}

main().catch((err) => {
  process.stderr.write(`generate-placeholder failed: ${(err as Error).message}\n`);
  process.exit(1);
});
