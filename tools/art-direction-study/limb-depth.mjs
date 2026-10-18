#!/usr/bin/env node
/**
 * Depth gauge for an svg-bone-parts figure: how thick is the body when the camera
 * turns to the profile?
 *
 * The defect this measures was reported as "a paper-thin plank": a figure whose
 * front view is heavy and whose profile is a cut-out. "Too thin" is not a check,
 * so this rasterises the views and compares one band of the body against the same
 * band seen from the front. Each band is anchored to a skeleton row and measured
 * on the part that band names, because a band drawn from two thighs in the front
 * view against one thigh in profile compares two limbs with one:
 *
 *   chest  armpit to sternum        trunk and legs     (arms hang beside it)
 *   hip    across the hip joint     trunk and legs
 *   thigh  below the chalk bag to above the knee   one thigh
 *   shin   calf, below the knee     one shin
 *
 * A band's width is the widest covered row inside it, so the measurement is the
 * part's thickest section rather than an accident of where its ends fall. A limb
 * band measures one limb, the one the camera sees in full: both chains are
 * rasterised and the wider wins, because a turned view narrows the far limb as a
 * depth cue, so the narrow one is that depth cue and not the limb's depth. Without
 * this the front view measures two thighs and the profile one, which compares two
 * limbs with one.
 *
 * Coverage is measured colour-independently, the same way silhouette-holes.mjs
 * does it: the same artwork is rendered twice, once over magenta and once over
 * black, and since a pixel is (1-a)*background + a*fill, the magenta-minus-black
 * difference in the red and blue channels gives the uncovered fraction. A pixel
 * counts as body when less than half of it is uncovered, so a stroke or an
 * antialiased edge counts once it is at least half a rendered pixel wide.
 *
 * Gates on the trunk-and-legs silhouette: chest and hip at least 0.62 of the
 * front width, thigh at least 0.80 and shin at least 0.75, and the quarter view
 * strictly between front and side on every band. Exit code is 1 on a miss.
 *
 * An arms-included table is printed ungated as a diagnostic: arms are not a depth
 * measure, because a hanging arm is lateral in the front view (it widens the
 * front reference) and superimposed on the torso in profile (it adds little
 * depth). It is printed to show what a naive silhouette measurement sees, never
 * to accept or reject a figure.
 *
 * Run: node tools/art-direction-study/limb-depth.mjs [--figure DIR] [--scale N] [--json]
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const BACKGROUNDS = [{ r: 255, g: 0, b: 255 }, { r: 0, g: 0, b: 0 }];
const VIEWS = ["front", "quarter", "side"];
const LEG_CHAIN = ["leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r"];

function inner(svg) {
  const match = svg.match(/^<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/);
  if (match === null) throw new Error("figure layer is not a validated SVG");
  return match[1];
}

/** Part markup in the engine's paint order, with the arm chains optional. */
function compose(view, withArms) {
  const arm = (side) =>
    inner(view.parts[`arm_u_${side}`]) + inner(view.parts[`arm_l_${side}`]) +
    inner(view.hands[side].rest);
  const rear = view.rearArms.filter((side) => side === "l").concat(
    view.rearArms.filter((side) => side === "r"));
  const front = ["l", "r"].filter((side) => !view.rearArms.includes(side));
  return [
    ...LEG_CHAIN.filter((key) => view.parts[key] !== undefined).map((key) => inner(view.parts[key])),
    ...(withArms ? rear.map(arm) : []),
    ...(view.parts.torso === undefined ? [] : [inner(view.parts.torso)]),
    ...(withArms ? front.map(arm) : []),
    ...(withArms ? [inner(view.parts.head)] : []),
  ].join("");
}

/** Uncovered fraction per pixel, from the magenta and black renders. */
function coverage(magenta, black, pixels) {
  const result = new Float32Array(pixels);
  for (let i = 0; i < pixels; i += 1) {
    const red = 1 - (magenta[i * 3] - black[i * 3]) / 255;
    const blue = 1 - (magenta[i * 3 + 2] - black[i * 3 + 2]) / 255;
    result[i] = Math.min(1, Math.max(0, (red + blue) / 2));
  }
  return result;
}

async function rasterise(markup, width, height, space) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${space.width} ${space.height}">${markup}</svg>`;
  const flattened = [];
  for (const background of BACKGROUNDS) {
    const { data } = await sharp(Buffer.from(svg)).flatten({ background }).raw()
      .toBuffer({ resolveWithObject: true });
    flattened.push(data);
  }
  return coverage(flattened[0], flattened[1], width * height);
}

function loneChain(view, keys) {
  return { ...view, parts: Object.fromEntries(keys.map((key) => [key, view.parts[key]])), rearArms: [] };
}

/**
 * Bands, anchored to skeleton rows. Each one names the composition it measures:
 * the trunk bands read the trunk-and-legs silhouette, and a limb band reads only
 * the near-side chain of the limb it names, so both sides of its ratio are one
 * limb. `near` is the side facing the camera in the turned views.
 */
const BANDS = [
  {
    name: "chest", gate: 0.62, parts: "trunk",
    rows: (j) => [j.shoulder_r[1], j.shoulder_r[1] + 0.5 * (j.waist[1] - j.shoulder_r[1])],
    anchor: (j) => `armpit (shoulder row ${j.shoulder_r[1]}) to sternum (halfway to waist ${j.waist[1]})`,
  },
  {
    name: "hip", gate: 0.62, parts: "trunk",
    rows: (j) => [j.hip_r[1] - 12, j.hip_r[1] + 12],
    anchor: (j) => `across the hip joint, row ${j.hip_r[1]} plus and minus 12`,
  },
  {
    name: "thigh", gate: 0.80, parts: ["leg_u_l", "leg_u_r"],
    rows: (j) => {
      const span = j.knee_r[1] - j.hip_r[1];
      return [j.hip_r[1] + 0.45 * span, j.knee_r[1] - 0.07 * span];
    },
    anchor: (j) => `below the chalk bag (hip row ${j.hip_r[1]} + 45%) to above the knee (${j.knee_r[1]})`,
  },
  {
    name: "shin", gate: 0.75, parts: ["leg_l_l", "leg_l_r"],
    rows: (j) => {
      const span = j.foot_r[1] - j.knee_r[1];
      return [j.knee_r[1] + 0.06 * span, j.foot_r[1] - 0.30 * span];
    },
    anchor: (j) => `calf, below the knee (${j.knee_r[1]}) and above the ankle (foot row ${j.foot_r[1]} - 30%)`,
  },
];

/** Widest covered row inside the band, in rest-space units. */
function bandWidth(cover, width, height, scale, y0, y1) {
  const first = Math.max(0, Math.round(y0 * scale));
  const last = Math.min(height - 1, Math.round(y1 * scale));
  let widest = null;
  for (let y = first; y <= last; y += 1) {
    let left = -1;
    let right = -1;
    for (let x = 0; x < width; x += 1) {
      if (cover[y * width + x] < 0.5) continue;
      if (left < 0) left = x;
      right = x;
    }
    if (left < 0) continue;
    const span = (right - left + 1) / scale;
    if (widest === null || span > widest.span) widest = { span, row: y / scale };
  }
  return widest;
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index < 0 ? fallback : args[index + 1];
  };
  const figure = resolve(ROOT, option("figure", "library/figure/gymnast_b"));
  const scale = Number(option("scale", "3"));
  const asJson = args.includes("--json");
  const artwork = JSON.parse(readFileSync(resolve(figure, "artwork.json"), "utf8"));
  const front = artwork.views.front;
  const space = front.skeleton.space ?? { width: 400, height: 720 };
  const joints = front.skeleton.joints;
  const width = Math.round(space.width * scale);
  const height = Math.round(space.height * scale);

  const measure = async (withArms, band) => {
    const result = {};
    const [y0, y1] = band.rows(joints);
    for (const name of VIEWS) {
      // The arms-included diagnostic is the whole silhouette: a naive measurement
      // takes the figure as drawn, which is what that table reports. A limb band
      // tries both chains and keeps the wider one.
      const chains = (withArms || band.parts === "trunk") ? [null] : band.parts;
      let widest = null;
      for (const keys of chains) {
        const view = keys === null ? artwork.views[name] : loneChain(artwork.views[name], [keys]);
        const cover = await rasterise(compose(view, withArms), width, height, space);
        const found = bandWidth(cover, width, height, scale, y0, y1);
        if (found !== null && (widest === null || found.span > widest.span)) widest = found;
      }
      result[name] = widest;
    }
    return result;
  };

  const gated = [];
  const diagnostic = [];
  for (const band of BANDS) {
    const side = await measure(false, band);
    const arms = await measure(true, band);
    const [y0, y1] = band.rows(joints);
    gated.push({ band, y0, y1, rows: side, ratio: side.side.span / side.front.span });
    diagnostic.push({ band, rows: arms, ratio: arms.side.span / arms.front.span });
  }

  const verdict = gated.map(({ band, rows, ratio }) => {
    const between = rows.quarter.span < rows.front.span - 0.5 && rows.quarter.span > rows.side.span + 0.5;
    return {
      band: band.name, gate: band.gate, ratio: +ratio.toFixed(2), between,
      passes: ratio >= band.gate && between,
    };
  });
  const failures = verdict.filter((entry) => !entry.passes);

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ figure, scale, verdict, gated, diagnostic }, null, 1)}\n`);
  } else {
    console.log(`limb-depth: ${figure} at ${width}x${height} (scale ${scale}); ` +
      `coverage < 0.5 counts as background`);
    console.log("anchor rows (rest-space units)");
    for (const { band, y0, y1 } of gated) {
      console.log(`  ${band.name.padEnd(6)} rows ${`${y0.toFixed(1)}..${y1.toFixed(1)}`.padEnd(12)} ${band.anchor(joints)}`);
    }
    console.log("");
    console.log("gated: trunk and legs (arms and hands excluded); a band's width is its widest row");
    console.log("band    rows           front   quarter   side    side/front  gate    quarter in between  result");
    for (const { band, y0, y1, rows, ratio } of gated) {
      const v = verdict.find((entry) => entry.band === band.name);
      console.log(
        `${band.name.padEnd(7)} ${`${y0.toFixed(0)}..${y1.toFixed(0)}`.padEnd(14)} ` +
        `${rows.front.span.toFixed(1).padEnd(7)} ${rows.quarter.span.toFixed(1).padEnd(9)} ` +
        `${rows.side.span.toFixed(1).padEnd(7)} ${ratio.toFixed(2).padEnd(11)} ` +
        `${`>=${band.gate.toFixed(2)}`.padEnd(7)} ${`${v.between ? "yes" : "no"} (${rows.quarter.span.toFixed(1)})`.padEnd(19)} ` +
        `${v.passes ? "pass" : "FAIL"}`);
    }
    console.log("");
    console.log("ungated diagnostic: arms included. NOT a depth measure - a hanging arm is");
    console.log("lateral in the front view, so it widens the front reference, and it is");
    console.log("superimposed on the torso in profile, so it adds little depth. Ignore it.");
    console.log("band    front   quarter   side    side/front");
    for (const { band, rows, ratio } of diagnostic) {
      console.log(`${band.name.padEnd(7)} ${rows.front.span.toFixed(1).padEnd(7)} ` +
        `${rows.quarter.span.toFixed(1).padEnd(9)} ${rows.side.span.toFixed(1).padEnd(7)} ${ratio.toFixed(2)}`);
    }
    console.log("");
    console.log(failures.length === 0 ?
      `PASS: every band reaches its depth gate and the quarter view sits between front and side` :
      `FAIL:\n  ${failures.map((entry) =>
        `${entry.band} side/front ${entry.ratio.toFixed(2)} (gate ${entry.gate.toFixed(2)})` +
        (entry.between ? "" : ", quarter view not strictly between front and side")).join("\n  ")}`);
  }
  process.exitCode = failures.length === 0 ? 0 : 1;
}

await main();
