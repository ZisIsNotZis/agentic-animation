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
  /** Native-art body/hip drop in design units; feet remain independent. */
  waistY?: number;
  torsoScaleY?: number;
  /** Leg angles are in design space, before renderer mirroring. */
  legR?: ArmAngles;
  legL?: ArmAngles;
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
  const drop = pose.waistY ?? 0;
  const sy = pose.torsoScaleY ?? 1;
  const bodyPoint = (point: [number, number]): [number, number] => {
    const v = sub(point, waist);
    return add([0,drop],add(waist,rot(pitch,[v[0],v[1]*sy])));
  };
  const legged = new Set(["hip_r", "knee_r", "foot_r", "hip_l", "knee_l", "foot_l"]);
  const joints: Record<string, [number, number]> = {};
  for (const [name, point] of Object.entries(skeleton.joints)) {
    joints[name] = legged.has(name) ? [point[0], point[1] + (name.startsWith("hip_") ? drop : 0)] : bodyPoint(point);
  }
  const parts: SolvedSkeleton["parts"] = {};
  let torso: WorldBox | undefined;
  for (const [name, part] of Object.entries(skeleton.parts)) {
    const shape = part as {box?: [[number, number], [number, number]]; circle?: {at?: string; center?: [number, number]; radius: number}; capsule?: {from: string; to: string; radius: number}};
    let world: WorldShape | undefined;
    if (shape.box) {
      if (drop === 0 && sy === 1) world = rotateBox(shape.box[0], shape.box[1], waist, pitch);
      else {
        const [a,b] = shape.box;
        const corners = [a,[b[0],a[1]],[a[0],b[1]],b].map((p) => bodyPoint(p as [number,number]));
        world = {kind:"box",a:[Math.min(...corners.map(p=>p[0])),Math.min(...corners.map(p=>p[1]))],b:[Math.max(...corners.map(p=>p[0])),Math.max(...corners.map(p=>p[1]))]};
      }
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
    const s = bodyPoint(shoulder);
    const elbow0 = skeleton.joints[`elbow_${side}`] ?? [0, 0];
    const hand0 = skeleton.joints[`hand_${side}`] ?? [0, 0];
    const u: [number, number] = [(elbow0[0] - shoulder[0]) * facing, elbow0[1] - shoulder[1]];
    const f: [number, number] = [(hand0[0] - elbow0[0]) * facing, hand0[1] - elbow0[1]];
    const elbow = drop === 0 && sy === 1 ? add(s, rot(pitch + angles.upper, u)) : bodyPoint(add(shoulder,rot(angles.upper,u)));
    const hand = drop === 0 && sy === 1 ? add(elbow, rot(pitch + angles.upper + angles.lower, f)) : bodyPoint(add(add(shoulder,rot(angles.upper,u)),rot(angles.upper+angles.lower,f)));
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
  for (const side of ["r","l"] as const) {
    const angles = side === "r" ? pose.legR : pose.legL;
    if (!angles) continue;
    const h0 = skeleton.joints[`hip_${side}`],k0 = skeleton.joints[`knee_${side}`],f0 = skeleton.joints[`foot_${side}`];
    if (!h0 || !k0 || !f0) continue;
    const h: [number,number] = [h0[0],h0[1]+drop];
    const k = add(h,rot(angles.upper,sub(k0,h0)));
    const f = add(k,rot(angles.upper+angles.lower,sub(f0,k0)));
    joints[`hip_${side}`]=h;joints[`knee_${side}`]=k;joints[`foot_${side}`]=f;
    for (const [name,a,b] of [[`thigh_${side}`,h,k],[`shin_${side}`,k,f]] as const) {
      const previous=parts[name];
      if (previous?.world.kind==="capsule") parts[name]={shape:previous.shape,world:{kind:"capsule",a,b,radius:previous.world.radius}};
    }
  }
  const handCircle = (side: "r" | "l"): WorldCircle | undefined => {
    const p = parts[`hand_${side}`]?.world;
    return p?.kind === "circle" ? p : undefined;
  };
  return {joints, parts, hands: {hand_r: handCircle("r"), hand_l: handCircle("l")}, torso};
}

/** Analytic two-bone IK (SVG angles): side mirrors rest vectors; bend selects
 * the elbow branch independently. Default preserves the mirrored legacy solve. */
export function solveArmIK(
  target: {x: number; y: number},
  arm: {upper: number; fore: number; shoulder: [number, number]; upperDir: [number, number]; foreDir: [number, number]},
  side: 1 | -1 = 1,
  bend: 1 | -1 = side,
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
    upper: ((base - bend * alpha - phi1) * 180) / Math.PI,
    lower: ((phi1 - phi2 + bend * (Math.PI - beta)) * 180) / Math.PI,
  };
}

/** Feasible nonnegative hip drop while the hip stays above the ankle.
 * Uses the complete two-bone annulus on that native standing branch, with
 * the same .01 design-pixel extension margin as plantedLegAngles. Null means
 * infeasible; a horizontally clamped foot must not count as planted support. */
export function legDropInterval(skeleton: Skeleton, side: "l"|"r", target: [number,number]): [number,number] | null {
  const H=skeleton.joints[`hip_${side}`]!,K=skeleton.joints[`knee_${side}`]!,F=skeleton.joints[`foot_${side}`]!;
  const a=Math.hypot(K[0]-H[0],K[1]-H[1]),b=Math.hypot(F[0]-K[0],F[1]-K[1]);
  const dx=target[0]-H[0],dy=target[1]-H[1],outer=a+b-.01,inner=Math.abs(a-b)+.01;
  if (outer < inner || Math.abs(dx)>outer) return null;
  const high=Math.sqrt(outer*outer-dx*dx);
  const low=Math.abs(dx)<inner?Math.sqrt(inner*inner-dx*dx):0;
  const from=Math.max(0,dy-high),to=dy-low;
  return to>=from?[from,to]:null;
}

/** Hip drop -> leg angles with an independent foot target (shared native FK). */
export function plantedLegAngles(skeleton: Skeleton, side: "l"|"r", drop: number, target?: [number,number]): ArmAngles {
  const H=skeleton.joints[`hip_${side}`]!,K=skeleton.joints[`knee_${side}`]!,F=skeleton.joints[`foot_${side}`]!;
  const u=sub(K,H),v=sub(F,K);
  const hip: [number,number]=[H[0],H[1]+drop];
  const goal: [number,number]=target?[...target]:[...F];
  const max=Math.hypot(...u)+Math.hypot(...v)-.01;
  // Horizontal stride cannot lengthen a leg. Preserve the support height
  // whenever reachable, limiting stride instead of letting the sole sink.
  const dy=goal[1]-hip[1];
  if (Math.abs(dy)<max) {
    const dx=Math.sqrt(max*max-dy*dy);
    goal[0]=Math.max(hip[0]-dx,Math.min(hip[0]+dx,goal[0]));
  }
  // Native joints already contain their left/right geometry; mirroring their
  // rest vectors again changes the IK branch and cannot round-trip rest FK.
  const bend = (u[0]*v[1]-u[1]*v[0] < 0 ? -1 : 1) as 1|-1;
  return solveArmIK({x:goal[0],y:goal[1]}, {shoulder:hip,upper:Math.hypot(...u),fore:Math.hypot(...v),upperDir:u,foreDir:v},1,bend);
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

export function nativeCrouchDrop(skeleton: Skeleton): number {
  const lengths = (["l", "r"] as const).map(side => {
    const hip=skeleton.joints[`hip_${side}`]!,knee=skeleton.joints[`knee_${side}`]!,foot=skeleton.joints[`foot_${side}`]!;
    return Math.hypot(knee[0]-hip[0],knee[1]-hip[1])+Math.hypot(foot[0]-knee[0],foot[1]-knee[1]);
  });
  return Math.min(...lengths) / 2;
}
