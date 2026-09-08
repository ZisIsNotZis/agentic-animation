/**
 * Reach -> drawn-arm angle mapping (pure, React-free so core tests can
 * import it directly). The criterion is GEOMETRIC: the hand the SVG actually
 * renders must land on the motor's baked reach point in world space, for
 * every facing/flip/scale/waist-pitch combination — the drawn hand IS the
 * physics hand (docs/WORLD_PUPPET_MOTOR.md).
 */
import {solveArmIK} from "@anim/core/skeleton";
import type {Skeleton} from "@anim/core";

/** The minimal actor surface the reach solve needs (evaluate.ts output shape). */
export interface ReachInput {
  id?: string;
  x: number;
  /** Ground line in world space (actor.y). */
  y: number;
  scale: number;
  motor?: boolean;
  reach?: [number, number];
  /** Facing already resolved by the evaluator (motor bake or heuristic). */
  facing?: 1 | -1;
  flip?: boolean;
  orientation?: string;
  /** Motor-driven waist pitch (deg). */
  waist?: number;
  lean?: number;
  contact?: boolean;
  skeleton?: Skeleton;
}

export interface ReachResult {
  armRight: {upper: number; lower: number; hand: "rest" | "fist"};
  /** Extra torso tilt (deg) the reach exerts. */
  torsoTiltBoost: number;
  /** The design-space target the IK was solved against (for tests). */
  target: [number, number];
  flipped: boolean;
  waistPitch: number;
}

type Pt = [number, number];

/** SVG-convention rotation (y down, +deg clockwise): [cos, -sin; sin, cos]. */
function rot(deg: number, v: Pt): Pt {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[1] * c + v[0] * s];
}

function add(a: Pt, b: Pt): Pt {
  return [a[0] + b[0], a[1] + b[1]];
}

function sub(a: Pt, b: Pt): Pt {
  return [a[0] - b[0], a[1] - b[1]];
}

/** Whether the drawn figure is mirrored (front/back mirror via `flip`; side views pick a side). */
export function isFlipped(actor: Pick<ReachInput, "orientation" | "flip">): boolean {
  const orientation = actor.orientation ?? "front";
  return orientation === "front" || orientation === "back"
    ? actor.flip === true
    : orientation === "left" || orientation.endsWith("-left");
}

/** World reach point -> design-space target in the SVG's pre-mirror frame. */
export function reachDesignTarget(actor: ReachInput, flipped: boolean, space: {width: number; height: number}): [number, number] {
  return [
    space.width / 2 + ((actor.reach![0] - actor.x) / actor.scale) * (flipped ? -1 : 1),
    space.height - (actor.y - actor.reach![1]) / actor.scale,
  ];
}

/** Design-space FK hand -> world position (inverse of the renderer mapping). */
export function designHandToWorld(actor: ReachInput, hand: Pt, space: {width: number; height: number}, flipped: boolean): [number, number] {
  return [
    actor.x + (hand[0] - space.width / 2) * actor.scale * (flipped ? -1 : 1),
    actor.y - (space.height - hand[1]) * actor.scale,
  ];
}

/**
 * Solve the drawn right arm onto the motor's reach point. The IK runs in the
 * SVG's pre-mirror design frame with the UNMIRRORED rest segments: the world
 * target maps to design space (flip only flips the world back-map), and the
 * waist-unrot undoes the torso group's rotate(waistPitch) about the declared
 * waist joint. The div mirror then carries the drawn hand to the mirrored
 * world position — one composition, no per-facing angle signs.
 */
export function solveReach(actor: ReachInput): ReachResult {
  const sk = actor.skeleton;
  if (!actor.reach || !sk) throw new Error("solveReach needs reach + skeleton");
  const space = sk.space ?? {width: 400, height: 720};
  const flipped = isFlipped(actor);
  const waistPitch = (actor.lean ?? 0) + (actor.motor ? actor.waist ?? 0 : 0);
  const dir = (actor.facing ?? (actor.reach[0] >= actor.x ? 1 : -1)) as 1 | -1;
  const design = reachDesignTarget(actor, flipped, space);
  const W = sk.joints.waist ?? [space.width / 2, space.height * 0.71];
  const S = sk.joints.shoulder_r ?? [space.width / 2 + 60, space.height * 0.4];
  const E = sk.joints.elbow_r ?? [S[0] + 32, S[1] + 122];
  const H0 = sk.joints.hand_r ?? [E[0], E[1] + 104];
  // world/design target -> torso-rest frame (undo the SVG torso rotation).
  const g = add(W, rot(-waistPitch, sub(design, W)));
  const ik = solveArmIK(
    {x: g[0], y: g[1]},
    {
      upper: sk.arm.upper,
      fore: sk.arm.fore,
      shoulder: S,
      upperDir: sub(E, S),
      foreDir: sub(H0, E),
    },
    1,
  );
  const armRight = {upper: ik.upper, lower: ik.lower, hand: (actor.contact ? "fist" : "rest") as "rest" | "fist"};
  return {armRight, torsoTiltBoost: dir * 6, target: design, flipped, waistPitch};
}

/**
 * EXACTLY what the SVG renders for the right-arm shoulder pivot (waist
 * rotation applied; div mirror applied in world space).
 */
export function renderedShoulderWorld(actor: ReachInput, flipped: boolean): [number, number] {
  const sk = actor.skeleton;
  if (!sk) throw new Error("renderedShoulderWorld needs skeleton");
  const space = sk.space ?? {width: 400, height: 720};
  const waistPitch = (actor.lean ?? 0) + (actor.motor ? actor.waist ?? 0 : 0);
  const W = sk.joints.waist ?? [space.width / 2, space.height * 0.71];
  const S = sk.joints.shoulder_r ?? [space.width / 2 + 60, space.height * 0.4];
  const wd = add(W, rot(waistPitch, sub(S, W)));
  return designHandToWorld(actor, wd, space, flipped);
}

/**
 * EXACTLY what the SVG renders for the right arm: arm rotations nest inside
 * the torso group's rotate(waistPitch) about the waist joint, and the div
 * mirror (flipped figures) maps the design x about space.width/2. This is
 * the ground truth the angles must satisfy — solveSkeleton's arm chain uses
 * a different mirrored convention and is NOT the render truth.
 */
export function renderedHandWorld(actor: ReachInput, armRight: {upper: number; lower: number}, flipped: boolean): [number, number] {
  const sk = actor.skeleton;
  if (!sk) throw new Error("renderedHandWorld needs skeleton");
  const space = sk.space ?? {width: 400, height: 720};
  const waistPitch = (actor.lean ?? 0) + (actor.motor ? actor.waist ?? 0 : 0);
  const W = sk.joints.waist ?? [space.width / 2, space.height * 0.71];
  const S = sk.joints.shoulder_r ?? [space.width / 2 + 60, space.height * 0.4];
  const E = sk.joints.elbow_r ?? [S[0] + 32, S[1] + 122];
  const H0 = sk.joints.hand_r ?? [E[0], E[1] + 104];
  const elbowT = add(S, rot(armRight.upper, sub(E, S)));
  const handT = add(elbowT, rot(armRight.upper + armRight.lower, sub(H0, E)));
  const wd = add(W, rot(waistPitch, sub(handT, W)));
  return designHandToWorld(actor, wd, space, flipped);
}
