// Derives per-part figure colliders EXACTLY from the drawn geometry in
// packages/studio/src/components/performance/Actor.tsx.
//
// The drawn SVG is the single source of truth: this script regex-extracts the
// robe/hair/neck paths, the head circle, the limb stroke width, the limb
// anchor coordinates, and the fist geometry from the component source, fl
// attens the paths to their true bounds (quad sampling), and writes the exact
// design-space part boxes into every library/figure/<name>/skeleton.json.
// packages/core/test/partBounds.test.ts re-runs the same computation and
// asserts the manifests still match the drawing, so the two can never drift.
//
// Usage: npx tsx scripts/part-bounds.ts [write|verify]
import {readFileSync, writeFileSync, readdirSync, existsSync} from "node:fs";
import {join} from "node:path";

type Pt = [number, number];
type PathCmd = {cmd: "M" | "L"; p: Pt} | {cmd: "Q"; c: Pt; p: Pt};
export type DrawnShapes = {
  robe: {d: PathCmd[]; stroke: number};
  hair: {d: PathCmd[]; stroke: number};
  neck: {d: PathCmd[]; stroke: number};
  headCircle: {c: Pt; r: number; stroke: number};
  limbRadius: number;
  fistRadius: number;
  anchors: {shoulder: [Pt, Pt]; elbow: [Pt, Pt]; handY: number; hip: [Pt, Pt]; knee: [Pt, Pt]; foot: [Pt, Pt]}; // [left, right]
};

const ACTOR_TSX = "packages/studio/src/components/performance/Actor.tsx";
const FIGURE_DIR = "library/figure";

/** Flatten the absolute M/L/Q subset used by the figure paths. */
export function parsePath(d: string): PathCmd[] {
  const tokens = d.match(/[MLQZ]|-?\d+(?:\.\d+)?/g);
  if (!tokens) throw new Error(`unparseable path: ${d}`);
  const cmds: PathCmd[] = [];
  let i = 0;
  const num = (): number => Number(tokens[i++]);
  while (i < tokens.length) {
    const cmd = tokens[i++] as "M" | "L" | "Q" | "Z";
    if (cmd === "Z") continue;
    if (cmd === "Q") {
      const c: Pt = [num(), num()];
      cmds.push({cmd, c, p: [num(), num()]});
    } else cmds.push({cmd, p: [num(), num()]});
  }
  return cmds;
}

const quad = (a: number, b: number, c: number, t: number): number => {
  const u = 1 - t;
  return u * u * a + 2 * u * t * b + t * t * c;
};

/** True bounds of a path: curves sampled densely, endpoints always included. */
export function pathBounds(cmds: PathCmd[], steps = 128): [Pt, Pt] {
  let min: Pt = [Infinity, Infinity];
  let max: Pt = [-Infinity, -Infinity];
  const see = (p: Pt): void => {
    min = [Math.min(min[0], p[0]), Math.min(min[1], p[1])];
    max = [Math.max(max[0], p[0]), Math.max(max[1], p[1])];
  };
  for (let k = 0; k < cmds.length; k++) {
    const cmd = cmds[k]!;
    if (cmd.cmd === "Q") {
      const prev = k === 0 ? cmd.c : (cmds[k - 1] as {p: Pt}).p;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        see([quad(prev[0], cmd.c[0], cmd.p[0], t), quad(prev[1], cmd.c[1], cmd.p[1], t)]);
      }
    } else see(cmd.p);
  }
  return [min, max];
}

const grow = (b: [Pt, Pt], m: number): [Pt, Pt] => [[b[0][0] - m, b[0][1] - m], [b[1][0] + m, b[1][1] + m]];
const union = (a: [Pt, Pt], b: [Pt, Pt]): [Pt, Pt] => [[Math.min(a[0][0], b[0][0]), Math.min(a[0][1], b[0][1])], [Math.max(a[1][0], b[1][0]), Math.max(a[1][1], b[1][1])]];
const round1 = (n: number): number => Math.round(n * 10) / 10;

/** Pull the drawn figure geometry out of the Actor component source. */
export function extractShapes(source: string): DrawnShapes {
  // Layout-tolerant: the source may be formatted (one-line or split lines),
  // so matching runs over whitespace-normalized text and attribute order is
  // free. Only the semantic anchors (path data, component, fill source) matter.
  const flat = source.replace(/\s+/g, " ");
  const grab = (re: RegExp, what: string): RegExpExecArray => {
    const m = re.exec(flat);
    if (!m) throw new Error(`part-bounds: cannot find ${what} in ${ACTOR_TSX} — the drawing changed, update the extractor`);
    return m;
  };
  const strokedPath = (anchor: RegExp, what: string): {d: PathCmd[]; stroke: number} => {
    const m = grab(anchor, what);
    return {d: parsePath(m[1]!), stroke: Number(m[2])};
  };
  const robe = strokedPath(/<path d="(M124[^"]+)" fill=\{ROBES\[role\]\} stroke=\{INK\} strokeWidth="(\d+)"/, "robe path");
  const hair = strokedPath(/<path d="(M110[^"]+)" fill=\{HAIR\} stroke=\{INK\} strokeWidth="(\d+)"/, "hair path");
  const neck = strokedPath(/aria-label="neck connection" d="([^"]+)" fill=\{SKIN\} stroke=\{INK\} strokeWidth="(\d+)"/, "neck path");
  const cm = grab(/<circle cx="(\d+)" cy="(\d+)" r="(\d+)" fill=\{SKIN\} stroke=\{INK\} strokeWidth="(\d+)"/, "head circle");
  const headCircle = {c: [Number(cm[1]), Number(cm[2])] as Pt, r: Number(cm[3]), stroke: Number(cm[4])};
  const limbRadius = Number(grab(/const LIMB_OUTLINE = (\d+)/, "limb outline width")[1]) / 2;
  // Fist silhouette (the grabbing hand): template numbers from the Hand
  // component, plus half the stroke. Groups: 1=A(x-extent) 2=B(top end y)
  // 3=C(top ctrl y) 4=D 5=E 6=F(bottom x1) 7=G(bottom end y) 8=H(bottom ctrl
  // y) 9=I(bottom x2) 10=J 11=strokeWidth.
  const fm = grab(/shape === "fist" \? \( ?<path d=\{`M\$\{x - (\d+)\} \$\{y - (\d+)\}Q\$\{x\} \$\{y - (\d+)\} \$\{x \+ (\d+)\} \$\{y - (\d+)\}L\$\{x \+ (\d+)\} \$\{y \+ (\d+)\}Q\$\{x\} \$\{y \+ (\d+)\} \$\{x - (\d+)\} \$\{y \+ (\d+)\}Z`\} fill=\{SKIN\} stroke=\{INK\} strokeWidth="(\d+)"/, "fist path");
  const strokeHalf = Number(fm[11]) / 2;
  const fy0 = -(Number(fm[2]) + (Number(fm[3]) - Number(fm[2])) / 2 + strokeHalf); // quad extreme above
  const fy1 = Number(fm[7]) + (Number(fm[8]) - Number(fm[7])) / 2 + strokeHalf; // quad extreme below
  const fx = Math.max(Number(fm[1]), Number(fm[4]), Number(fm[6]), Number(fm[9])) + strokeHalf;
  const fistRadius = round1(Math.max(fx, Math.abs(fy0), fy1));
  const shoulderL = Number(grab(/const shoulder = left \? (\d+) : (\d+);/, "shoulder x"));
  void shoulderL;
  const sh = grab(/const shoulder = left \? (\d+) : (\d+); const elbow = left \? (\d+) : (\d+);/, "arm anchors");
  const lg = grab(/const hip = left \? (\d+) : (\d+); const knee = left \? (\d+) : (\d+); const foot = left \? (\d+) : (\d+);/, "leg anchors");
  const armSeg = grab(/M\$\{shoulder\} (\d+)L\$\{elbow\} (\d+)/, "arm segment ys");
  const handY = Number(grab(/M\$\{elbow\} \d+L\$\{elbow\} (\d+)/, "hand y")[1]);
  const legSeg = grab(/M\$\{hip\} (\d+)L\$\{knee\} (\d+)/, "leg segment ys");
  const footY = Number(grab(/M\$\{knee\} \d+L\$\{foot\} (\d+)/, "foot y")[1]);
  return {
    robe, hair, neck, headCircle, limbRadius, fistRadius,
    anchors: {
      shoulder: [[Number(sh[1]), Number(armSeg[1])], [Number(sh[2]), Number(armSeg[1])]],
      elbow: [[Number(sh[3]), Number(armSeg[2])], [Number(sh[4]), Number(armSeg[2])]],
      handY,
      hip: [[Number(lg[1]), Number(legSeg[1])], [Number(lg[2]), Number(legSeg[1])]],
      knee: [[Number(lg[3]), Number(legSeg[2])], [Number(lg[4]), Number(legSeg[2])]],
      foot: [[Number(lg[5]), footY], [Number(lg[6]), footY]],
    },
  };
}

type Joints = Record<string, [number, number]>;

/** Exact part colliders for a figure with the given declared joints. */
export function computeParts(sh: DrawnShapes, joints: Joints): Record<string, unknown> {
  const need = (name: string): Pt => {
    const j = joints[name];
    if (!j) throw new Error(`part-bounds: figure joints lack ${name}`);
    return j;
  };
  // The drawn limb anchors must equal the declared joints — otherwise the
  // capsule endpoints would not be the drawn endpoints.
  const check = (name: string, drawn: Pt): void => {
    const j = need(name);
    if (Math.abs(j[0] - drawn[0]) > 0.5 || Math.abs(j[1] - drawn[1]) > 0.5) {
      throw new Error(`part-bounds: joint ${name} ${JSON.stringify(j)} != drawn anchor ${JSON.stringify(drawn)} — the drawing and the manifests disagree`);
    }
  };
  for (const side of ["l", "r"] as const) {
    check(`shoulder_${side}`, sh.anchors.shoulder[side === "l" ? 0 : 1]);
    check(`elbow_${side}`, sh.anchors.elbow[side === "l" ? 0 : 1]);
    check(`hand_${side}`, [sh.anchors.elbow[side === "l" ? 0 : 1][0], sh.anchors.handY]);
    check(`hip_${side}`, sh.anchors.hip[side === "l" ? 0 : 1]);
    check(`knee_${side}`, sh.anchors.knee[side === "l" ? 0 : 1]);
    check(`foot_${side}`, sh.anchors.foot[side === "l" ? 0 : 1]);
  }
  const box = (b: [Pt, Pt]): [[number, number], [number, number]] => [[round1(b[0][0]), round1(b[0][1])], [round1(b[1][0]), round1(b[1][1])]];
  const torsoBox = grow(pathBounds(sh.robe.d), sh.robe.stroke / 2);
  const headBox = union(
    grow([[sh.headCircle.c[0] - sh.headCircle.r, sh.headCircle.c[1] - sh.headCircle.r], [sh.headCircle.c[0] + sh.headCircle.r, sh.headCircle.c[1] + sh.headCircle.r]], sh.headCircle.stroke / 2),
    grow(pathBounds(sh.hair.d), sh.hair.stroke / 2),
  );
  // Coverage invariant: every drawn pixel of the neck lies inside the union
  // of the torso and head boxes (the neck is interior ink).
  const neckBox = grow(pathBounds(sh.neck.d), sh.neck.stroke / 2);
  const inside = (p: Pt, b: [Pt, Pt]): boolean => p[0] >= b[0][0] - 0.5 && p[0] <= b[1][0] + 0.5 && p[1] >= b[0][1] - 0.5 && p[1] <= b[1][1] + 0.5;
  for (const corner of [neckBox[0], [neckBox[0][0], neckBox[1][1]], [neckBox[1][0], neckBox[0][1]], neckBox[1]] as Pt[]) {
    if (!inside(corner, torsoBox) && !inside(corner, headBox)) {
      throw new Error(`part-bounds: neck ink at ${JSON.stringify(corner)} is covered by neither torso nor head — part bounds must be recomputed`);
    }
  }
  const capsule = (from: string, to: string): unknown => ({capsule: {from, to, radius: sh.limbRadius}});
  return {
    torso: {box: box(torsoBox)},
    head: {box: box(headBox)},
    upper_arm_r: capsule("shoulder_r", "elbow_r"),
    forearm_r: capsule("elbow_r", "hand_r"),
    hand_r: {circle: {at: "hand_r", radius: sh.fistRadius}},
    upper_arm_l: capsule("shoulder_l", "elbow_l"),
    forearm_l: capsule("elbow_l", "hand_l"),
    hand_l: {circle: {at: "hand_l", radius: sh.fistRadius}},
    thigh_r: capsule("hip_r", "knee_r"),
    shin_r: capsule("knee_r", "foot_r"),
    thigh_l: capsule("hip_l", "knee_l"),
    shin_l: capsule("knee_l", "foot_l"),
  };
}

export function figureDirs(root = "."): string[] {
  return readdirSync(join(root, FIGURE_DIR)).filter((d) => !d.startsWith("_") && existsSync(join(root, FIGURE_DIR, d, "skeleton.json")));
}

export function verifyFigure(root: string, dir: string, shapes: DrawnShapes): string | null {
  const path = join(root, FIGURE_DIR, dir, "skeleton.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  const expected = computeParts(shapes, manifest.joints);
  const actual = manifest.parts;
  return JSON.stringify(expected) === JSON.stringify(actual) ? null : `${dir}: parts differ from the drawing`;
}

export function writeFigure(root: string, dir: string, shapes: DrawnShapes): void {
  const path = join(root, FIGURE_DIR, dir, "skeleton.json");
  const manifest = JSON.parse(readFileSync(path, "utf8"));
  manifest.parts = computeParts(shapes, manifest.joints);
  manifest.arm.handRadius = shapes.fistRadius;
  writeFileSync(path, JSON.stringify(manifest, null, 2) + "\n");
}

const main = (): void => {
  const mode = process.argv[2] ?? "write";
  const source = readFileSync(ACTOR_TSX, "utf8");
  const shapes = extractShapes(source);
  const dirs = figureDirs();
  if (mode === "write") {
    for (const dir of dirs) writeFigure(".", dir, shapes);
    console.log(`part-bounds: wrote exact parts for ${dirs.length} figures (fist r=${shapes.fistRadius}, limb r=${shapes.limbRadius})`);
  }
  const bad = dirs.map((d) => verifyFigure(".", d, shapes)).filter((v): v is string => v !== null);
  if (bad.length) {
    console.error(bad.join("\n"));
    process.exit(1);
  }
  console.log(`part-bounds: ${dirs.length} figures match the drawing`);
};

if (process.argv[1]?.endsWith("part-bounds.ts")) main();
