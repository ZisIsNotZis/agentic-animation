/**
 * Independent view of what the renderer actually draws for a baked motor frame
 * (docs/WORLD_PUPPET_MOTOR.md "Body geometry SSOT: drawn = collider").
 *
 * The moter's own separation/collision code is deliberately NOT imported here:
 * these helpers reproduce the ArtFigure transform from the baked pose so the
 * invariant tests can judge the drawing, not the engine's belief about it.
 *
 * ArtFigure composition (packages/studio/src/components/performance/ArtFigure.tsx):
 *   div left = x - width/2, top = y - height, transform-origin (200,720),
 *   transform scale(k*(flip?-1:1), k); torso group
 *   translate(0,waistY) rotate(waistPitch, waist) …; head group
 *   translate(0,headY) rotate(headTilt, neck) ….
 */
import type {Skeleton} from "../../src/schemas/libraryMeta";

export type Point = [number, number];
export type Quad = [Point, Point, Point, Point];

export interface BakedActorFrame {
  x: number;
  facing?: number;
  lean?: number;
  skeletonPose?: {waistPitch?: number; waistY?: number; torsoScaleY?: number; facing?: number};
}

export interface BakedPropFrame {
  x: number;
  y: number;
  rotation?: number;
  falling?: boolean;
}

const rot = (deg: number, v: Point): Point => {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
};
const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];

/** Drawn torso/head quads in world stage px for one baked frame. */
export function drawnBodyQuads(skeleton: Skeleton, frame: BakedActorFrame, scale: number, groundY: number) {
  const pose = frame.skeletonPose ?? {};
  const pitch = pose.waistPitch ?? 0;
  const drop = pose.waistY ?? 0;
  const sy = pose.torsoScaleY ?? 1;
  const waist = skeleton.joints.waist!;
  const neck = skeleton.joints.neck ?? waist;
  const flip = (frame.facing ?? 1) < 0 ? -1 : 1;
  const space = skeleton.space;
  const world = (p: Point): Point => [
    frame.x + (p[0] - space.width / 2) * scale * flip,
    groundY + (p[1] - space.height) * scale,
  ];
  const torsoPoint = (p: Point): Point => {
    const v = sub(p, waist);
    return add([0, drop], add(waist, rot(pitch, [v[0], v[1] * sy])));
  };
  // Head follow-through: solveActorFigure adds damped lean to the neck hinge.
  const headTilt = (frame.lean ?? 0) * 0.45;
  const headPoint = (p: Point): Point => add(neck, rot(headTilt, sub(p, neck)));
  const boxQuad = (box: [[number, number], [number, number]], transform: (p: Point) => Point): Quad => {
    const [a, b] = box;
    return ([[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]] as Point[])
      .map((p) => world(transform(p))) as Quad;
  };
  const torsoBox = (skeleton.parts.torso as {box: [[number, number], [number, number]]}).box;
  const headBox = (skeleton.parts.head as {box: [[number, number], [number, number]]}).box;
  return {
    torso: boxQuad(torsoBox, torsoPoint),
    head: boxQuad(headBox, (p) => torsoPoint(headPoint(p))),
  };
}

/** Convex-polygon intersection area (Sutherland–Hodgman); 0 when disjoint. */
const signedArea = (poly: readonly Point[]): number => {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!, q = poly[(i + 1) % poly.length]!;
    area += p[0] * q[1] - q[0] * p[1];
  }
  return area / 2;
};

export function overlapArea(a: Quad, b: Quad): number {
  // Clip against a consistently oriented edge list (y-down drawings wind either way).
  const orientation = signedArea(b) >= 0 ? 1 : -1;
  const side = (p: Point, q: Point, r: Point): number =>
    orientation * ((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  let out: Point[] = [...a];
  for (let i = 0; i < b.length && out.length; i++) {
    const p = b[i]!, q = b[(i + 1) % b.length]!;
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const cur = input[j]!, prev = input[(j + input.length - 1) % input.length]!;
      const dc = side(p, q, cur), dp = side(p, q, prev);
      if (dc >= 0) out.push(cur);
      if ((dc >= 0) !== (dp >= 0)) {
        const t = dp / (dp - dc);
        out.push([prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]);
      }
    }
  }
  if (out.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < out.length; i++) {
    const p = out[i]!, q = out[(i + 1) % out.length]!;
    area += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(area) / 2;
}

/** Largest torso/head intersection area between two actors on one frame. */
export function bodyOverlap(
  a: {skeleton: Skeleton; frame: BakedActorFrame; scale: number; groundY: number},
  b: {skeleton: Skeleton; frame: BakedActorFrame; scale: number; groundY: number},
): {torso: number; head: number} {
  const qa = drawnBodyQuads(a.skeleton, a.frame, a.scale, a.groundY);
  const qb = drawnBodyQuads(b.skeleton, b.frame, b.scale, b.groundY);
  return {torso: overlapArea(qa.torso, qb.torso), head: overlapArea(qa.head, qb.head)};
}

/** Interior elbow angle (deg, 180 = straight) of the drawn right arm. */
export function drawnElbowAngle(
  skeleton: Skeleton,
  arm: {upper: number; lower: number},
): number {
  const s = skeleton.joints.shoulder_r!, e = skeleton.joints.elbow_r!, h = skeleton.joints.hand_r!;
  const upper = rot(arm.upper, sub(e, s));
  const fore = rot(arm.upper + arm.lower, sub(h, e));
  const dot = upper[0] * fore[0] + upper[1] * fore[1];
  const n = Math.hypot(...upper) * Math.hypot(...fore) || 1;
  // Interior elbow angle: 180° is a straight arm, 90° a right-angled fold.
  return 180 - (Math.acos(Math.max(-1, Math.min(1, dot / n))) * 180) / Math.PI;
}

/** Lowest drawn point of a rotated convex prop solid, from its anchor. */
export function solidLowestOffset(solid: Quad | readonly Point[], rotationDeg: number): number {
  const r = (rotationDeg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  let lowest = -Infinity;
  for (const [x, y] of solid as Point[]) lowest = Math.max(lowest, x * s + y * c);
  return lowest;
}
