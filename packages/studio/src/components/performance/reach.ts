/**
 * Reach -> drawn-arm angle mapping (pure, React-free so core tests can
 * import it directly). The criterion is GEOMETRIC: the FK hand joint must
 * land on the motor's baked reach point in world space, for every
 * facing/flip/scale/waist-pitch combination — the drawn hand IS the physics
 * hand (docs/WORLD_PUPPET_MOTOR.md).
 */
import {solveArmIK, type Skeleton} from "@anim/core/skeleton";

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

/** Whether the drawn figure is mirrored (front/back mirror via `flip`; side views pick a side). */
export function isFlipped(actor: Pick<ReachInput, "orientation" | "flip">): boolean {
  const orientation = actor.orientation ?? "front";
  return orientation === "front" || orientation === "back"
    ? actor.flip === true
    : orientation === "left" || orientation.endsWith("-left");
}

/** World reach point -> design-space target (the renderer's design frame). */
export function reachDesignTarget(actor: ReachInput, flipped: boolean, space: {width: number; height: number}): [number, number] {
  return [
    space.width / 2 + ((actor.reach![0] - actor.x) / actor.scale) * (flipped ? -1 : 1),
    space.height - (actor.y - actor.reach![1]) / actor.scale,
  ];
}

/** Design-space FK hand -> world position (inverse of the renderer mapping). */
export function designHandToWorld(actor: ReachInput, hand: [number, number], space: {width: number; height: number}, flipped: boolean): [number, number] {
  return [
    actor.x + (hand[0] - space.width / 2) * actor.scale * (flipped ? -1 : 1),
    actor.y - (space.height - hand[1]) * actor.scale,
  ];
}

/**
 * Solve the drawn right arm onto the motor's reach point. The IK runs in the
 * torso-rest frame: the world target is expressed in design space, unrotated
 * by the waist pitch about the declared waist joint (the SVG rotates the
 * whole torso group by waistPitch about that same pivot, so composing the
 * two puts the drawn hand back on the world target).
 */
export function solveReach(actor: ReachInput): ReachResult {
  const sk = actor.skeleton;
  if (!actor.reach || !sk) throw new Error("solveReach needs reach + skeleton");
  const space = sk.space ?? {width: 400, height: 720};
  const flipped = isFlipped(actor);
  const facing = (flipped ? -1 : 1) as 1 | -1;
  const waistPitch = (actor.lean ?? 0) + (actor.motor ? actor.waist ?? 0 : 0);
  const dir = (actor.facing ?? (actor.reach[0] >= actor.x ? 1 : -1)) as 1 | -1;
  const design = reachDesignTarget(actor, flipped, space);
  const W = sk.joints.waist ?? [space.width / 2, space.height * 0.71];
  const S = sk.joints.shoulder_r ?? [space.width / 2 + 60, space.height * 0.4];
  const E = sk.joints.elbow_r ?? [S[0] + 32, S[1] + 122];
  const H0 = sk.joints.hand_r ?? [E[0], E[1] + 104];
  // world/design target -> torso-rest frame (undo the SVG torso rotation).
  const r = (-waistPitch * Math.PI) / 180;
  const dx = design[0] - W[0];
  const dy = design[1] - W[1];
  const g: [number, number] = [W[0] + dx * Math.cos(r) - dy * Math.sin(r), W[1] + dx * Math.sin(r) + dy * Math.cos(r)];
  // Mirror the rest joints for flipped figures (the SVG mirrors the whole div).
  const fold = (p: [number, number]): [number, number] => [space.width / 2 + (p[0] - space.width / 2) * (flipped ? -1 : 1), p[1]];
  const Sf = fold(S);
  const Ef = fold(E);
  const Hf = fold(H0);
  const gf = fold(g);
  const ik = solveArmIK(
    {x: gf[0], y: gf[1]},
    {
      upper: sk.arm.upper,
      fore: sk.arm.fore,
      shoulder: Sf,
      upperDir: [Ef[0] - Sf[0], Ef[1] - Sf[1]],
      foreDir: [Hf[0] - Ef[0], Hf[1] - Ef[1]],
    },
    1,
  );
  const armRight = {upper: ik.upper, lower: ik.lower, hand: (actor.contact ? "fist" : "rest") as "rest" | "fist"};
  return {armRight, torsoTiltBoost: dir * 6, target: design, flipped, waistPitch};
}
}
