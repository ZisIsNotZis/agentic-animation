/**
 * Generic skeleton forward kinematics + part-shape contact (Slice 1,
 * docs/WORLD_PUPPET_MOTOR.md). The engine holds NO figure numbers here:
 * every joint, part shape, arm length, and waist limit comes from the
 * figure's declared skeleton data (library/figure/<name>/skeleton.json).
 *
 * Convention: design space (width×height from skeleton.space), y down,
 * ground at space.height, figure center at space.width/2. World position =
 * design position + actor origin (actor.x − center, actor.y − height).
 */
import type {Skeleton} from "../schemas/libraryMeta";

export interface ArmAngles {
  upper: number;
  lower: number;
}

/** Pose input for FK. All angles are SVG-convention degrees (clockwise, y down). */
export interface SkeletonPose {
  /** Torso pitch about the declared waist joint (deg; + leans toward facing). */
  waistPitch?: number;
  facing?: 1 | -1;
  armR?: ArmAngles;
  armL?: ArmAngles;
}

export interface WorldCircle {
  kind: "circle";
  center: [number, number];
  radius: number;
}

export interface WorldCapsule {
  kind: "capsule";
  a: [number, number];
  b: [number, number];
  radius: number;
}

export interface WorldBox {
  kind: "box";
  a: [number, number];
  b: [number, number];
}

export type WorldShape = WorldCircle | WorldCapsule | WorldBox;

export interface SolvedSkeleton {
  /** World design-space joint positions (already waist-rotated). */
  joints: Record<string, [number, number]>;
  /** World part shapes, keyed by part name. */
  parts: Record<string, {shape: WorldShape; world: WorldShape}>;
  /** Rest-frame hand circle per side (world). */
  hands: {hand_r?: WorldCircle; hand_l?: WorldCircle};
  torso: WorldBox | undefined;
}

function rot(deg: number, v: [number, number]): [number, number] {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

function add(a: [number, number], b: [number, number]): [number, number] {
  return [a[0] + b[0], a[1] + b[1]];
}

function sub(a: [number, number], b: [number, number]): [number, number] {
  return [a[0] - b[0], a[1] - b[1]];
}

/** Rotate a box (two opposite corners) about a pivot. */
function rotateBox(a: [number, number], b: [number, number], pivot: [number, number], deg: number): WorldBox {
  const corners: [number, number][] = [
    [a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]],
  ];
  const rotated = corners.map((c) => add(pivot, rot(deg, sub(c, pivot))));
  const xs = rotated.map((c) => c[0]);
  const ys = rotated.map((c) => c[1]);
  return {kind: "box", a: [Math.min(...xs), Math.min(...ys)], b: [Math.max(...xs), Math.max(...ys)]};
}

/**
 * Forward kinematics: rest joints → waist rotation (torso/head/arms about
 * the waist pivot; hips and legs stay planted) → arm chain rotations.
 */
export function solveSkeleton(skeleton: Skeleton, pose: SkeletonPose = {}): SolvedSkeleton {
  const facing = pose.facing ?? 1;
  const pitch = (pose.waistPitch ?? 0) * facing;
  const waist = skeleton.joints.waist ?? [skeleton.space.width / 2, skeleton.space.height * 0.71];
  const legged = new Set(["hip_r", "knee_r", "foot_r", "hip_l", "knee_l", "foot_l"]);
  const joints: Record<string, [number, number]> = {};
  for (const [name, point] of Object.entries(skeleton.joints)) {
    joints[name] = legged.has(name) ? [point[0], point[1]] : add(waist, rot(pitch, sub(point, waist)));
  }
  const parts: SolvedSkeleton["parts"] = {};
  let torso: WorldBox | undefined;
  for (const [name, part] of Object.entries(skeleton.parts)) {
    const shape = part as {box?: [[number, number], [number, number]]; circle?: {at?: string; center?: [number, number]; radius: number}; capsule?: {from: string; to: string; radius: number}};
    let world: WorldShape | undefined;
    if (shape.box) {
      world = rotateBox(shape.box[0], shape.box[1], waist, pitch);
      if (name === "torso") torso = world;
    } else if (shape.circle) {
      const center: [number, number] = shape.circle.at
        ? joints[shape.circle.at] ?? [0, 0]
        : shape.circle.center ?? [0, 0];
      world = {kind: "circle", center, radius: shape.circle.radius};
    } else if (shape.capsule) {
      const from = joints[shape.capsule.from];
      const to = joints[shape.capsule.to];
      if (from && to) world = {kind: "capsule", a: from, b: to, radius: shape.capsule.radius};
    }
    if (world) parts[name] = {shape: world, world};
  }
  // Arm chains: pose angles compose with the waist pitch (the drawn arm
  // groups nest inside the torso group).
  for (const [side, angles] of [["r", pose.armR], ["l", pose.armL]] as const) {
    if (!angles) continue;
    const shoulder = skeleton.joints[`shoulder_${side}`];
    if (!shoulder) continue;
    const s = add(waist, rot(pitch, sub(shoulder, waist)));
    const elbow0 = skeleton.joints[`elbow_${side}`] ?? [0, 0];
    const hand0 = skeleton.joints[`hand_${side}`] ?? [0, 0];
    const u: [number, number] = [(elbow0[0] - shoulder[0]) * facing, elbow0[1] - shoulder[1]];
    const f: [number, number] = [(hand0[0] - elbow0[0]) * facing, hand0[1] - elbow0[1]];
    const elbow = add(s, rot(pitch + angles.upper, u));
    const hand = add(elbow, rot(pitch + angles.upper + angles.lower, f));
    joints[`shoulder_${side}`] = s;
    joints[`elbow_${side}`] = elbow;
    joints[`hand_${side}`] = hand;
    const handRadius = (parts[`hand_${side}`]?.shape as WorldCircle | undefined)?.radius ?? skeleton.arm.handRadius;
    parts[`hand_${side}`] = {shape: {kind: "circle", center: [0, 0], radius: handRadius}, world: {kind: "circle", center: hand, radius: handRadius}};
    const fore = parts[`forearm_${side}`];
    const upper = parts[`upper_arm_${side}`];
    if (fore) parts[`forearm_${side}`] = {shape: fore.shape, world: {kind: "capsule", a: elbow, b: hand, radius: (fore.shape as WorldCapsule).radius}};
    if (upper) parts[`upper_arm_${side}`] = {shape: upper.shape, world: {kind: "capsule", a: s, b: elbow, radius: (upper.shape as WorldCapsule).radius}};
  }
  const handCircle = (side: "r" | "l"): WorldCircle | undefined => {
    const p = parts[`hand_${side}`]?.world;
    return p?.kind === "circle" ? p : undefined;
  };
  return {joints, parts, hands: {hand_r: handCircle("r"), hand_l: handCircle("l")}, torso};
}

/** Analytic two-bone IK against declared arm lengths (SVG angle convention). */
export function solveArmIK(
  target: {x: number; y: number},
  arm: {upper: number; fore: number; shoulder: [number, number]; upperDir: [number, number]; foreDir: [number, number]},
  side: 1 | -1 = 1,
): ArmAngles {
  const [sx, sy] = arm.shoulder;
  const dx = target.x - sx;
  const dy = target.y - sy;
  let d = Math.hypot(dx, dy);
  const l1 = arm.upper;
  const l2 = arm.fore;
  d = Math.min(d, l1 + l2 - 1e-3);
  d = Math.max(d, Math.abs(l1 - l2) + 1e-3);
  const base = Math.atan2(dy, dx);
  const phi1 = Math.atan2(arm.upperDir[1], arm.upperDir[0] * side);
  const phi2 = Math.atan2(arm.foreDir[1], arm.foreDir[0] * side);
  const alpha = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const beta = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2))));
  return {
    upper: ((base - side * alpha - phi1) * 180) / Math.PI,
    lower: ((phi1 - phi2 + side * (Math.PI - beta)) * 180) / Math.PI,
  };
}

/** True if a circle overlaps an axis-aligned box. */
export function circleOverlapsBox(circle: {center: [number, number]; radius: number}, box: {a: [number, number]; b: [number, number]}): boolean {
  const [cx, cy] = circle.center;
  const nx = Math.min(Math.max(cx, Math.min(box.a[0], box.b[0])), Math.max(box.a[0], box.b[0]));
  const ny = Math.min(Math.max(cy, Math.min(box.a[1], box.b[1])), Math.max(box.a[1], box.b[1]));
  return Math.hypot(cx - nx, cy - ny) <= circle.radius;
}

/** True if two circles touch or overlap. */
export function circleOverlapsCircle(a: {center: [number, number]; radius: number}, b: {center: [number, number]; radius: number}): boolean {
  return Math.hypot(a.center[0] - b.center[0], a.center[1] - b.center[1]) <= a.radius + b.radius;
}
