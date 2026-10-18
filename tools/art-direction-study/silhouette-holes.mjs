#!/usr/bin/env node
/**
 * Mechanical silhouette check for an svg-bone-parts figure.
 *
 * Two review rounds failed on the same visible defect - background showing
 * through the shoulder/sleeve junction - because "looks closed" is not a check.
 * This rasterises every view of a figure directory and reports enclosed
 * background regions (holes) inside the silhouette, so closure is a number.
 *
 * Coverage is measured colour-independently: the same artwork is rendered twice,
 * once over magenta and once over black, and since a pixel is
 * (1-a)*background + a*fill, the magenta-minus-black difference in the red and
 * blue channels gives the uncovered fraction of that pixel. A pixel is
 * background when less than half of it is covered, so an antialiased seam only
 * counts once it is at least half a rendered pixel wide.
 *
 * The composition mirrors packages/studio/src/components/performance/ArtFigure.tsx
 * at a neutral pose: legs, rear arms, torso, front arms, head, then the hand of
 * each arm. Face layers are ink drawn inside the head outline and cannot open a
 * background hole, so they are left out.
 *
 * Two more things are measured because a hole scan alone would have passed the
 * defect that was actually reported: the figure must be one silhouette piece (a
 * socket that missed its parent detaches a limb), and on the two unprojected
 * constructions every skeleton capsule axis must be covered end to end (a sleeve
 * that stops bridging its junction leaves the axis bare).
 *
 * Enclosed air that the pose genuinely opens - under a hanging arm, between two
 * legs - can be declared in LEGITIMATE_AIR with its reason and a bounding box, so a
 * reviewer judges the justification instead of re-finding the same region.
 *
 * Run: node tools/art-direction-study/silhouette-holes.mjs [--figure DIR] [--scale N] [--json]
 * Exit code is 1 when a hole is undeclared, a limb axis is uncovered or a view's
 * silhouette is in more than one piece.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "../..");
const BACKGROUNDS = [{ r: 255, g: 0, b: 255 }, { r: 0, g: 0, b: 0 }];
const VIEWS = ["front", "quarter", "side", "back", "quarter_back"];
const LEG_CHAIN = ["leg_u_l", "leg_l_l", "foot_l", "leg_u_r", "leg_l_r", "foot_r"];

function inner(svg) {
  const match = svg.match(/^<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/);
  if (match === null) throw new Error("figure layer is not a validated SVG");
  return match[1];
}

/** Part markup in the engine's paint order for one rest-pose view. */
function compose(view) {
  const arm = (side) =>
    inner(view.parts[`arm_u_${side}`]) + inner(view.parts[`arm_l_${side}`]) +
    inner(view.hands[side].rest);
  const rear = view.rearArms.filter((side) => side === "l").concat(
    view.rearArms.filter((side) => side === "r"));
  const front = ["l", "r"].filter((side) => !view.rearArms.includes(side));
  return [
    ...LEG_CHAIN.map((key) => inner(view.parts[key])),
    ...rear.map(arm),
    inner(view.parts.torso),
    ...front.map(arm),
    inner(view.parts.head),
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

/**
 * Background pixels not reachable from the canvas edge. A gap that opens to the
 * outside - the wedge under a hanging arm, between two legs - is air, not a hole;
 * only a region fully surrounded by the figure is.
 */
function enclosedBackground(cover, width, height) {
  const background = new Uint8Array(width * height);
  for (let i = 0; i < cover.length; i += 1) background[i] = cover[i] < 0.5 ? 1 : 0;
  const stack = [];
  const push = (index) => { if (background[index] === 1) { background[index] = 2; stack.push(index); } };
  for (let x = 0; x < width; x += 1) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { push(y * width); push(y * width + width - 1); }
  while (stack.length) {
    const index = stack.pop();
    const x = index % width;
    if (x > 0) push(index - 1);
    if (x < width - 1) push(index + 1);
    if (index >= width) push(index - width);
    if (index + width < background.length) push(index + width);
  }
  return background;  // 2 = exterior air, 1 = enclosed
}

/** Column scan: enclosed background runs between two covered runs, grouped per hole. */
function findHoles(cover, width, height) {
  const enclosed = enclosedBackground(cover, width, height);
  const segments = [];
  const perColumn = [];
  let top = null;
  let bottom = null;
  for (let x = 0; x < width; x += 1) {
    const indices = [];
    perColumn.push(indices);
    let first = -1;
    let last = -1;
    for (let y = 0; y < height; y += 1) {
      if (cover[y * width + x] < 0.5) continue;
      if (first < 0) first = y;
      last = y;
    }
    if (first < 0) continue;
    top = top === null ? first : Math.min(top, first);
    bottom = bottom === null ? last : Math.max(bottom, last);
    let run = -1;
    for (let y = first; y <= last; y += 1) {
      if (enclosed[y * width + x] === 1) {
        if (run < 0) run = y;
      } else if (run >= 0) {
        indices.push(segments.length);
        segments.push({ x, y0: run, y1: y - 1 });
        run = -1;
      }
    }
  }
  const parent = segments.map((_segment, index) => index);
  const find = (index) => {
    let current = index;
    while (parent[current] !== current) current = parent[current];
    return current;
  };
  const union = (a, b) => {
    const [rootA, rootB] = [find(a), find(b)];
    if (rootA !== rootB) parent[Math.max(rootA, rootB)] = Math.min(rootA, rootB);
  };
  for (let x = 1; x < width; x += 1) {
    for (const index of perColumn[x]) {
      for (const back of perColumn[x - 1]) {
        if (segments[index].y0 <= segments[back].y1 + 2 &&
            segments[index].y1 + 2 >= segments[back].y0) union(back, index);
      }
    }
  }
  const groups = new Map();
  for (let index = 0; index < segments.length; index += 1) {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(segments[index]);
  }
  const holes = [];
  for (const members of groups.values()) {
    const xs = members.map((member) => member.x);
    const ys = members.flatMap((member) => [member.y0, member.y1]);
    holes.push({
      x0: Math.min(...xs), x1: Math.max(...xs),
      y0: Math.min(...ys), y1: Math.max(...ys),
      columns: new Set(xs).size,
      areaPixels: members.reduce((sum, member) => sum + member.y1 - member.y0 + 1, 0),
    });
  }
  holes.sort((a, b) => b.areaPixels - a.areaPixels);
  return { holes, top, bottom };
}

/**
 * Enclosed background that is genuinely outside the body: air the pose opens up,
 * which the projection happens to seal. Each entry carries the reason it is air
 * rather than a junction cutout, and a box that keeps it away from a shoulder.
 */
const LEGITIMATE_AIR = {
  gymnast_b: [
    {
      views: ["quarter_back"], box: [225, 389, 233, 403], maxArea: 12,
      why: "a 3 unit2 pocket where the rest knee bend meets the far shin behind the " +
        "near leg; sub-pixel at stage scale and sealed on both sides, so it reads as " +
        "cloth shadow rather than a hole. Declared so the gauge stays strict elsewhere.",
    },
  ],
  athlete_a: [
    {
      views: ["quarter", "quarter_back"], box: [130, 288, 150, 368], maxArea: 600,
      why: "air between the hanging near forearm and the torso, sealed below only where " +
        "the hand's thumb overlaps the jersey; the same air is open to the canvas in the " +
        "front view, so nothing is drawn through it",
    },
  ],
};

/**
 * The limb-axis probe: the defect this replaced was reported as "the sleeve fill
 * does not bridge from the shoulder cap to the sleeve hem", which a hole scan
 * cannot see because such a slit opens to the canvas. Sampling the skeleton's own
 * capsule axes - three parallel lines per limb - fails when the artwork leaves any
 * of them uncovered, i.e. when the drawn fill stops bridging a junction.
 *
 * Only front and back are probed: those are the two constructions whose artwork is
 * not laterally projected, and artwork.json carries one rest-space skeleton for all
 * five views, so on the turned views the skeleton axis is not on the drawn limb and
 * the probe would measure the projection rather than the art.
 */
const AXIS_VIEWS = ["front", "back"];

function axisProbe(cover, width, height, scale, skeleton) {
  const probes = [];
  for (const [name, part] of Object.entries(skeleton.parts)) {
    if (part.capsule === undefined) continue;
    const from = skeleton.joints[part.capsule.from];
    const to = skeleton.joints[part.capsule.to];
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const samples = Math.max(2, Math.round(length * scale));
    let worst = { coverage: 1, at: null };
    for (const offset of [0, -1, 1]) {
      for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const x = from[0] + dx * t + nx * offset;
        const y = from[1] + dy * t + ny * offset;
        const px = Math.round(x * scale);
        const py = Math.round(y * scale);
        if (px < 0 || py < 0 || px >= width || py >= height) continue;
        const value = cover[py * width + px];
        if (value < worst.coverage) {
          worst = { coverage: value, at: [+x.toFixed(1), +y.toFixed(1)], offset };
        }
      }
    }
    probes.push({ limb: name, minCoverage: +worst.coverage.toFixed(2), gapAt: worst.coverage < 0.99 ? worst.at : null });
  }
  return probes;
}

/** The figure has to be one piece: a limb whose socket missed its parent detaches. */
function componentCount(cover, width, height) {
  const label = new Uint8Array(width * height);
  let count = 0;
  for (let start = 0; start < cover.length; start += 1) {
    if (cover[start] < 0.5 || label[start] === 1) continue;
    count += 1;
    const stack = [start];
    label[start] = 1;
    while (stack.length) {
      const index = stack.pop();
      const x = index % width;
      if (x > 0 && cover[index - 1] >= 0.5 && label[index - 1] === 0) { label[index - 1] = 1; stack.push(index - 1); }
      if (x < width - 1 && cover[index + 1] >= 0.5 && label[index + 1] === 0) { label[index + 1] = 1; stack.push(index + 1); }
      if (index >= width && cover[index - width] >= 0.5 && label[index - width] === 0) { label[index - width] = 1; stack.push(index - width); }
      if (index + width < cover.length && cover[index + width] >= 0.5 && label[index + width] === 0) { label[index + width] = 1; stack.push(index + width); }
    }
  }
  return count;
}

async function main() {
  const args = process.argv.slice(2);
  const option = (name, fallback) => {
    const index = args.indexOf(`--${name}`);
    return index < 0 ? fallback : args[index + 1];
  };
  const figure = resolve(ROOT, option("figure", "library/figure/athlete_a"));
  const scale = Number(option("scale", "2"));
  const asJson = args.includes("--json");
  const artwork = JSON.parse(readFileSync(resolve(figure, "artwork.json"), "utf8"));
  const space = artwork.views.front.skeleton.space ?? { width: 400, height: 720 };
  const width = Math.round(space.width * scale);
  const height = Math.round(space.height * scale);
  const report = [];
  for (const name of VIEWS) {
    const view = artwork.views[name];
    const cover = await rasterise(compose(view), width, height, space);
    const { holes, top, bottom } = findHoles(cover, width, height);
    const skeleton = view.skeleton;
    const probes = AXIS_VIEWS.includes(name) ? axisProbe(cover, width, height, scale, skeleton) : [];
    const pieces = componentCount(cover, width, height);
    let left = width;
    let right = -1;
    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) {
        if (cover[y * width + x] >= 0.5) { left = Math.min(left, x); right = Math.max(right, x); break; }
      }
    }
    const air = LEGITIMATE_AIR[figure.split("/").pop()] ?? [];
    report.push({
      view: name, width, height, scale,
      extent: { left: left / scale, right: right / scale, top: top === null ? null : top / scale, bottom: bottom === null ? null : bottom / scale },
      holes: holes.map((hole) => {
        const box = [hole.x0 / scale, hole.y0 / scale, hole.x1 / scale, hole.y1 / scale];
        const area = +(hole.areaPixels / (scale * scale)).toFixed(2);
        const allowed = air.find((entry) => entry.views.includes(name) && area <= entry.maxArea &&
          box[0] >= entry.box[0] && box[1] >= entry.box[1] && box[2] <= entry.box[2] && box[3] <= entry.box[3]);
        return {
          x0: +box[0].toFixed(2), x1: +box[2].toFixed(2),
          y0: +box[1].toFixed(2), y1: +box[3].toFixed(2),
          columns: hole.columns, area, legitimate: allowed ? allowed.why : null,
        };
      }),
      limbs: probes,
      pieces,
    });
  }
  if (asJson) {
    process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
  } else {
    console.log(`silhouette-holes: ${figure} at ${width}x${height} (scale ${scale}); ` +
      `coverage < 0.5 counts as background`);
    console.log("view          x extent          y extent          holes  largest area");
    for (const entry of report) {
      const { extent } = entry;
      const area = entry.holes.length ? entry.holes[0].area : 0;
      console.log(
        `${entry.view.padEnd(13)} ${`${extent.left.toFixed(1)}..${extent.right.toFixed(1)}`.padEnd(17)} ` +
        `${`${extent.top.toFixed(1)}..${extent.bottom.toFixed(1)}`.padEnd(17)} ` +
        `${String(entry.holes.length).padEnd(6)} ${area ? `${area.toFixed(2)} units²` : "-"}`);
      for (const hole of entry.holes) {
        console.log(`  hole x ${hole.x0}..${hole.x1} y ${hole.y0}..${hole.y1} ` +
          `(${hole.columns} columns, ${hole.area} units²)`);
      }
    }
    const total = report.reduce((sum, entry) => sum + entry.holes.length, 0);
    const unallowed = report.flatMap((entry) => entry.holes.filter((hole) => hole.legitimate === null)
      .map((hole) => `${entry.view} x ${hole.x0}..${hole.x1} y ${hole.y0}..${hole.y1} (${hole.area} units²)`));
    console.log("limb axis    uncovered samples");
    for (const entry of report) {
      const gaps = entry.limbs.filter((limb) => limb.gapAt !== null);
      console.log(`${entry.view.padEnd(13)} ${entry.limbs.length === 0 ? `not probed (projected construction), ${entry.pieces} silhouette piece(s)` :
        gaps.length === 0 ? `none (min coverage ${Math.min(...entry.limbs.map((l) => l.minCoverage)).toFixed(2)} over ${entry.limbs.length} limbs), ${entry.pieces} silhouette piece(s)` :
        gaps.map((limb) => `${limb.limb} at ${limb.gapAt[0]},${limb.gapAt[1]} coverage ${limb.minCoverage}`).join("; ")}`);
    }
    const problems = [...unallowed,
      ...report.flatMap((entry) => entry.limbs.filter((limb) => limb.gapAt !== null)
        .map((limb) => `${entry.view} ${limb.limb} axis uncovered at ${limb.gapAt[0]},${limb.gapAt[1]}`)),
      ...report.filter((entry) => entry.pieces !== 1).map((entry) => `${entry.view} is ${entry.pieces} silhouette pieces, expected 1`)];
    console.log(problems.length ? `FAIL:\n  ${problems.join("\n  ")}` :
      `PASS: ${total} hole(s), all in declared legitimate air; every limb axis bridged`);
  }
  process.exitCode = report.some((entry) =>
    entry.holes.some((hole) => hole.legitimate === null) || entry.limbs.some((limb) => limb.gapAt !== null) ||
    entry.pieces !== 1) ? 1 : 0;
}

await main();
