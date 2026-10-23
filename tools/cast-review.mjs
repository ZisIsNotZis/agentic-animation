#!/usr/bin/env node
/**
 * Cast review stills: one still per new asset and one contact sheet, each drawn
 * at the size a 1280x720 episode frame draws it. No upscale, no sharpening, no
 * colour change — the asset's own art, composited in the renderer's own order.
 *
 *   node tools/cast-review.mjs
 *
 * Sizes, and why these numbers:
 * - The viewing size is the delivered video, `anim.config.json` `video` 1280x720.
 * - The stage the renderer composes on is 1920x1080, so `stageToVideo` = 1280/1920.
 * - A set fills the stage, so its still is the intrinsic 1920x1080 art at 1280x720.
 * - A figure is drawn at its design space (400x720 per view) scaled by the staged
 *   actor scale `packages/core/src/staging/index.ts` gives it: 0.92 for a one-actor
 *   shot, the common case for a figure standing on its own. That is the same
 *   number a two-actor shot spends differently (0.88), so the still states 0.92.
 * - Feet stand on y 691, the floor line `set/badminton_hall` declares, so a figure
 *   still and the hall still share one frame geometry.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/media/cast-review-2026-10-23");
const VIEW_W = 1280;
const VIEW_H = 720;
const STAGE_W = 1920;
const STAGE_TO_VIDEO = VIEW_W / STAGE_W;
const ONE_ACTOR_SCALE = 0.92;
const FLOOR_Y = 691;
const LABEL_FONT = "DejaVu Sans, Noto Sans, Arial, Helvetica, sans-serif";

const sha256 = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
/** The revision and its commit date: stable for a given tree, so a rebuild is
 *  byte-identical and the tree stays clean after `node tools/cast-review.mjs`. */
const revision = () => git("rev-parse", "--short", "HEAD");
const revisionDate = () => git("show", "-s", "--format=%cI", "HEAD");
const inner = (svg) => {
  const body = svg.match(/^<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/)?.[1];
  if (body === undefined) throw new Error("figure part is not a validated SVG");
  return body;
};

/** The figure's front view, composed in `ArtFigure.tsx`'s order: legs, rear arms,
 *  torso, front arms, head, then the calm face and the resting mouth. */
function figureFrontView(id) {
  const dir = join(ROOT, "library/figure", id);
  const art = JSON.parse(readFileSync(join(dir, "artwork.json"), "utf8"));
  const view = art.views.front;
  const { width, height } = view.skeleton.space;
  const rear = Array.isArray(view.rearArms) ? view.rearArms : [];
  const chain = (side) => inner(view.parts[`arm_u_${side}`]) + inner(view.parts[`arm_l_${side}`]) + inner(view.hands[side].rest);
  const body =
    inner(view.parts.leg_u_l) + inner(view.parts.leg_l_l) + inner(view.parts.foot_l) +
    inner(view.parts.leg_u_r) + inner(view.parts.leg_l_r) + inner(view.parts.foot_r) +
    rear.map(chain).join("") +
    inner(view.parts.torso) +
    ["l", "r"].filter((side) => !rear.includes(side)).map(chain).join("") +
    inner(view.parts.head) +
    inner(view.expressions.calm) +
    inner(view.mouths.A);
  return { dir, art, width, height, body };
}

function assetFigure(id) {
  const { dir, art, width, height, body } = figureFrontView(id);
  const scale = ONE_ACTOR_SCALE * STAGE_TO_VIDEO;
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${width} ${height}">${body}</svg>`;
  return {
    id,
    svg,
    w,
    h,
    left: Math.round(VIEW_W / 2 - w / 2),
    top: FLOOR_Y - h,
    sources: [join(dir, "artwork.json")],
    scaleNote: `figure design space ${width}x${height} x actor scale ${ONE_ACTOR_SCALE} x stage-to-video ${STAGE_TO_VIDEO.toFixed(4)} = ${scale.toFixed(4)}; drawn ${w}x${h} px`,
  };
}

async function assetSet(id) {
  const dir = join(ROOT, "library/set", id);
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  const [vw, vh] = String(manifest.coordinateSpace ?? "1920x1080").split("x").map(Number);
  const source = readFileSync(join(dir, manifest.source ?? "scene.svg"), "utf8");
  // The renderer draws the set across the 1920x1080 stage; the still is that same
  // art at the video's width. No layer of this set declares a blend, so the one
  // SVG is what the renderer composites.
  const svg = source.replace(/^<svg\b([^>]*)>/, (_m, attrs) => {
    const kept = String(attrs).replace(/\s(width|height|viewBox)="[^"]*"/g, "");
    return `<svg${kept} width="${VIEW_W}" height="${Math.round((VIEW_W * vh) / vw)}" viewBox="0 0 ${vw} ${vh}">`;
  });
  return { id, png: await sharp(Buffer.from(svg)).png().toBuffer(), w: VIEW_W, h: Math.round((VIEW_W * vh) / vw), left: 0, top: 0, sources: [join(dir, manifest.source ?? "scene.svg"), join(dir, "manifest.json")], scaleNote: `intrinsic ${vw}x${vh} -> ${VIEW_W}x${Math.round((VIEW_W * vh) / vw)} px (the stage-to-video factor, ${STAGE_TO_VIDEO.toFixed(4)})` };
}

function labels(cells) {
  const items = cells.map((cell, index) => {
    const x = index * (STAGE_W / cells.length);
    return `<text x="${x + 16}" y="30" font-family="${LABEL_FONT}" font-size="24" fill="#272331">${cell.id}</text>` +
      `<text x="${x + 16}" y="54" font-family="${LABEL_FONT}" font-size="16" fill="#5a5450">${cell.caption}</text>`;
  }).join("");
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${STAGE_W}" height="${VIEW_H}">${items}</svg>`);
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const assets = [];
  const figures = ["athlete_a", "gymnast_b"].map((id) => {
    const figure = assetFigure(id);
    return { ...figure, png: null };
  });
  for (const figure of figures) {
    figure.png = await sharp(Buffer.from(figure.svg)).png().toBuffer();
    assets.push(figure);
  }
  assets.push(await assetSet("badminton_hall"));

  const rendered = [];
  for (const asset of assets) {
    const file = join(OUT, `${asset.id}.png`);
    await sharp({ create: { width: VIEW_W, height: VIEW_H, channels: 4, background: "#ffffff" } })
      .composite([{ input: asset.png, left: asset.left, top: asset.top }])
      .png()
      .toFile(file);
    rendered.push({
      asset: `library/${asset.id.startsWith("badminton_hall") ? "set" : "figure"}/${asset.id}`,
      still: join("docs/media/cast-review-2026-10-23", `${asset.id}.png`),
      stillSha256: sha256(file),
      drawnPx: [asset.w, asset.h],
      scale: asset.scaleNote,
      sources: asset.sources.map((path) => ({ path: path.slice(ROOT.length + 1), sha256: sha256(path) })),
    });
  }

  // The contact sheet: three equal cells, each asset at the size it is drawn at.
  const cellW = STAGE_W / 3;
  const sheetLayers = [];
  const sheets = [
    { ...figures[0], caption: "figure · 442 px tall in a 1280×720 frame" },
    { ...figures[1], caption: "figure · 442 px tall in a 1280×720 frame" },
    { ...assets[2], caption: "set · full frame; shown here at 640 px" },
  ];
  for (const [index, asset] of sheets.entries()) {
    const cellLeft = index * cellW;
    if (asset.id === "badminton_hall") {
      const wide = Math.round(cellW);
      const tall = Math.round((VIEW_H * wide) / VIEW_W);
      const input = await sharp(asset.png).resize({ width: wide }).png().toBuffer();
      sheetLayers.push({ input, left: cellLeft, top: Math.round((VIEW_H - tall) / 2) });
      continue;
    }
    const left = Math.round(cellLeft + cellW / 2 - asset.w / 2);
    sheetLayers.push({ input: asset.png, left, top: FLOOR_Y - asset.h });
  }
  sheetLayers.push({ input: labels(sheets), left: 0, top: 0 });
  const sheetFile = join(OUT, "cast-sheet.png");
  await sharp({ create: { width: STAGE_W, height: VIEW_H, channels: 4, background: "#ffffff" } })
    .composite(sheetLayers)
    .png()
    .toFile(sheetFile);

  const identity = {
    generatedBy: "tools/cast-review.mjs",
    command: "node tools/cast-review.mjs",
    renderedFromRevision: revision(),
    renderedFromCommitDate: revisionDate(),
    viewingSize: [VIEW_W, VIEW_H],
    whatItIs: "One still per new asset and one contact sheet, each asset drawn at the size a 1280x720 episode frame draws it: no upscale, no sharpening, no colour change, no crop.",
    figureScale: { oneActorStagedScale: ONE_ACTOR_SCALE, stageToVideo: Number(STAGE_TO_VIDEO.toFixed(6)), floorLineY: FLOOR_Y },
    figureLayerOrder: "legs l/r, rear arms, torso, front arms, head, calm expression, resting mouth — the order ArtFigure.tsx draws",
    sheet: { path: "docs/media/cast-review-2026-10-23/cast-sheet.png", sha256: sha256(sheetFile), sizePx: [STAGE_W, VIEW_H], note: "three 640 px cells; the figures are at their viewing size, the set is at half its viewing width to fit a cell" },
    stills: rendered,
  };
  writeFileSync(join(OUT, "identity.json"), JSON.stringify(identity, null, 2) + "\n");
  console.log(JSON.stringify(identity.stills.map((still) => [still.asset, still.still, still.drawnPx]), null, 0));
  console.log(`sheet: ${identity.sheet.path}`);
}

main().catch((error) => { console.error(error); process.exit(1); });
