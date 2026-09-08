/**
 * World Puppet Motor (docs/WORLD_PUPPET_MOTOR.md) — planar physical motion
 * for actors and props. Deterministic fixed-timestep simulation run at
 * compile time; the renderer only looks up baked per-frame trajectories.
 *
 * Invariants:
 *   I1 Support    — feet plant; bodies never overlap (hard projection);
 *                   walkers halt at adjacency.
 *   I2 Contact    — a body or prop only accelerates while physically touched
 *                   (the driving hand circle overlaps the target's declared
 *                   torso/box). No remote force, no cooperation.
 *   I3 Reaction   — the pusher's hand force drags HIS OWN body once the arm
 *                   is taut (Newton's third law: pushing with an extended
 *                   arm pulls the shoulder along).
 *   I4 Hold       — a bound prop's position IS the holding hand's position
 *                   every substep. A prop moves only when carried, falling,
 *                   or sliding under a contact impulse. Nothing else moves it.
 *   I5 Determinism— fixed timestep, seeded; no wall clock, no randomness.
 */

export interface MotorIntent {
  at: number;
  duration: number;
  intent: "move" | "push" | "grab" | "release";
  target?: string;
  /** Stylized force 0..1 for push. */
  force?: number;
  /** Fraction of the intent spent reaching before contact (push). */
  reach?: number;
  /** Object to grab when this move completes (handover receiver). */
  grab?: string;
  /** Seconds of force application after contact (push). */
  forceSec?: number;
  /** The former holder of a released object (from binding tracks). */
  holder?: string;
}

export interface MotorActorInput {
  id: string;
  /** Staged pelvis/ground position at scene start. */
  x: number;
  groundY: number;
  facing: 1 | -1;
  /** Staging scale — the sim shares the renderer's body geometry. */
  scale: number;
  /** Declared figure skeleton (joints, part shapes, arm lengths, waist). */
  skeleton?: Skeleton;
  intents: MotorIntent[];
}

export interface MotorPropInput {
  id: string;
  /** Stage-space footprint [w, h]; the box anchors at (x, y) as base-center. */
  size: [number, number];
  /** Declared touch box (stage-space offsets from the base point) — the
   * drawn body the hand must actually touch. */
  touchBox?: {a: [number, number]; b: [number, number]};
  x: number;
  y: number;
  intents: MotorIntent[];
}

export interface MotorActorFrame {
  x: number;
  /** Torso lean in degrees (reaction + gait), positive = facing-forward. */
  lean: number;
  facing: 1 | -1;
  /** Walk cycle phase 0..1, 0 = standing. */
  walk: number;
  /** Hand world position while reaching/exerting/holding, else undefined. */
  reach?: [number, number];
  /** True while in force-producing contact with the intent target. */
  contact?: boolean;
  /** Waist pitch in degrees (physics-driven bend for reaches). */
  waist?: number;
  /** Crouch amount 0..1 (knees bend, hip drops by CROUCH_DROP). */
  crouch?: number;
  /** The prop currently bound to this actor's hand. */
  holds?: string;
}

export interface MotorPropFrame {
  x: number;
  y: number;
  /** Set while the prop is falling under gravity after a release. */
  falling?: boolean;
}

export interface MotorTrajectory {
  actors: Record<string, MotorActorFrame[]>;
  props: Record<string, MotorPropFrame[]>;
}

import { circleOverlapsBox, solveSkeleton } from "./skeleton";
import type { Skeleton } from "../schemas/libraryMeta";

const FPS = 24;
const DT = 1 / 120;
const SUBSTEPS = Math.round(1 / (FPS * DT));
/** Walk speed in stage px/s. */
const WALK_SPEED = 420;
/** Ground friction deceleration for sliding props (px/s²). */
const PROP_FRICTION = 900;
/** Reaction lean per unit of applied force (degrees). */
const REACTION_LEAN = 14;
/**
 * Generic puppet-model limits — engine mechanics, NOT figure data:
 * the spine can pitch to 85° and a full crouch drops the hip 90 design px
 * (the drawn figure bends exactly with these — Actor.tsx consumes the same
 * constants through the baked frame).
 */
const SPINE_MAX = 85;
export const CROUCH_DROP = 90;
const WAIST_RATE = 120; // deg/s
const CROUCH_RATE = 1.6; // fraction/s
/** Gravity for released props (stage px/s²). */
const GRAVITY = 2600;
/** Hand drive acceleration/top speed per unit force (stage px/s², px/s). */
const HAND_ACC = 1500;
const HAND_MAX = 560;

/** Per-actor body geometry, all derived from the declared skeleton. */
interface ActorBody {
  /** Torso half-width in design px (torso box). */
  halfWidth: number;
  /** Torso top/bottom design y. */
  torsoTop: number;
  torsoBottom: number;
  /** Full arm reach in design px (upper + fore + hand radius). */
  armReach: number;
  /** Hand circle radius in design px. */
  handRadius: number;
  /** Balance stepping: slide allowance per recovery step, catch fraction, capacity. */
  stepLength: number;
  catchFraction: number;
  maxSteps: number;
  /** Waist pivot (design). */
  waist: [number, number];
  /** Ground-to-waist distance in design px. */
  groundToWaist: number;
  /** Design space height. */
  spaceHeight: number;
  /** Shoulder offset from the waist pivot (design, facing-right frame). */
  shoulderFromWaist: [number, number];
  /** Design-space rest hand (facing-right frame). */
  restHand: [number, number];
}

function bodyOf(skeleton: Skeleton): ActorBody {
  const torso = skeleton.parts.torso as {box?: [[number, number], [number, number]]} | undefined;
  if (!torso?.box) throw new Error("motor: figure skeleton lacks a torso box part");
  const shoulder = skeleton.joints.shoulder_r;
  const waist = skeleton.joints.waist;
  if (!shoulder || !waist) throw new Error("motor: figure skeleton lacks shoulder_r/waist joints");
  const rest = solveSkeleton(skeleton, {});
  const restHand = rest.hands.hand_r?.center ?? [waist[0] + 92, waist[1] - 300];
  return {
    halfWidth: Math.abs(torso.box[1][0] - torso.box[0][0]) / 2,
    torsoTop: Math.min(torso.box[0][1], torso.box[1][1]),
    torsoBottom: Math.max(torso.box[0][1], torso.box[1][1]),
    armReach: skeleton.arm.upper + skeleton.arm.fore + skeleton.arm.handRadius,
    handRadius: skeleton.arm.handRadius,
    stepLength: skeleton.balance.stepLength,
    catchFraction: skeleton.balance.catchFraction,
    maxSteps: skeleton.balance.maxSteps,
    waist,
    groundToWaist: skeleton.space.height - waist[1],
    spaceHeight: skeleton.space.height,
    shoulderFromWaist: [shoulder[0] - waist[0], shoulder[1] - waist[1]],
    restHand,
  };
}

/** World-space shoulder for an actor at a waist pitch + crouch (generic waist FK). */
function shoulderAt(x: number, groundY: number, scale: number, facing: 1 | -1, body: ActorBody, pitchDeg: number, crouch: number): [number, number] {
  // state.x IS the waist anchor: the renderer maps actor.x to design
  // space.width/2, and the declared waist.x == space.width/2 — so the waist
  // sits AT actor.x (adding body.waist[0] here double-offsets the sim's
  // shoulder ~176px right of the drawn figure at 0.88 scale, and the drawn
  // arm can then never reach the sim's hand).
  const wx = x;
  const wy = groundY - (body.groundToWaist - CROUCH_DROP * crouch) * scale;
  const d: [number, number] = [facing * body.shoulderFromWaist[0] * scale, body.shoulderFromWaist[1] * scale];
  const r = ((facing * pitchDeg) * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [wx + d[0] * c - d[1] * s, wy + d[0] * s + d[1] * c];
}

/** World-space rest hand (design rest hand mapped through facing + crouch drop). */
function restHandAt(state: {x: number; groundY: number; scale: number; facing: 1 | -1; body: ActorBody; crouch: number}): [number, number] {
  const k = state.scale;
  return [
    state.x + (state.body.restHand[0] - state.body.waist[0]) * state.facing * k,
    // Height above ground of a design point = spaceHeight - design y (crouch
    // lowers the whole body).
    state.groundY - (state.body.spaceHeight - state.body.restHand[1] - CROUCH_DROP * state.crouch) * k,
  ];
}

function approach(current: number, goal: number, maxDelta: number): number {
  return current < goal ? Math.min(goal, current + maxDelta) : Math.max(goal, current - maxDelta);
}

function smoothstep01(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

interface ActorState {
  id: string;
  x: number;
  vx: number;
  facing: 1 | -1;
  groundY: number;
  scale: number;
  body: ActorBody;
  skeleton: Skeleton | undefined;
  /** Current waist pitch in deg (0 = upright). */
  waist: number;
  /** Crouch 0..1. */
  crouch: number;
  walkPhase: number;
  lean: number;
  /** Motor-driven destination while a move intent is active. */
  moveTarget: number | null;
  /** Prop id a completed move intent should grab (transient). */
  grabTarget?: string | null;
  /** Active grab controller: reach/bend/crouch until the hand physically
   * touches the object's declared body box — then bind (I4). */
  grab: {propId: string; t: number} | null;
  /** The prop bound to the hand; position = hand every substep until release. */
  holding: string | null;
  /** Shoulder-relative hand offset blend after binding (arm relaxes to carry). */
  holdRel: {from: [number, number]; t: number; dur: number} | null;
  /** Push hand drive: the force accelerates the HAND; a taut arm drags the body.
   *  Phase "approach" walks the pusher into arm's range first (his own legs —
   *  legitimate locomotion); "drive" extends the hand and conducts force. */
  handDrive: {target: string; force: number; t: number; sec: number; speed: number; hand: [number, number]; contact: boolean; phase: "approach" | "drive"; contactT: number | null} | null;
  /** Where the hand grips the held prop relative to the hand point (the prop
   *  never teleports to the hand — it stays exactly where the grip landed). */
  grip: {ox: number; oy: number} | null;
  /** The settled grip: the prop origin relative to the hand when the hand
   *  sits at the object's box CENTER (small objects are carried at their
   *  middle). The grip eases here over the holdRel settle, never snaps. */
  gripGoal: {ox: number; oy: number} | null;
  /** Live pursuit: the actor id whose CURRENT position the walk follows
   *  (handovers chase a mover; the stop point is the adjacency clamp). */
  pursue: string | null;
  /** Placing: the support surface y the held prop is being lifted onto;
   *  the hand rises until the prop base clears the surface, then releases. */
  place: number | null;
  /** Reaching/exerting/holding state: the world-space point the hand is at. */
  reach: { tx: number; ty: number; target: string; contact: boolean } | null;
  /** Impulse queue for stagger momentum. */
  stagger: number;
  /** Recovery steps taken for the current stagger event. */
  stepsTaken: number;
  /** True on the substep a recovery step plants (baked as a frame marker). */
  stepPlanted?: boolean;
  /** Accumulated slide for the current stagger event (px). */
  staggerSlide: number;
}

interface PropState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  falling: boolean;
  size: [number, number];
  touchBox?: {a: [number, number]; b: [number, number]};
}

export interface MotorScene {
  durationSec: number;
  actors: MotorActorInput[];
  props: MotorPropInput[];
  /** Declared support surfaces (stage space): a released prop falls to the
   * highest surface under its x, else to the ground line. */
  supports?: Array<{x0: number; x1: number; y: number}>;
  /** Ground line fallback for released props. */
  groundY?: number;
  /** Target resolution: id -> stage x (actors and props share the space). */
  resolveX(id: string): number | undefined;
}

/**
 * Simulate one scene. Pure and deterministic: same inputs -> identical
 * trajectories. Emits one frame per 24fps tick.
 */
/** Open the hand: the held prop detaches and falls under gravity. */
function propOpenHand(state: ActorState, props: Map<string, PropState>): void {
  const heldProp = state.holding ? props.get(state.holding) : undefined;
  if (heldProp) {
    heldProp.falling = true;
    heldProp.vy = Math.max(0, -heldProp.vy);
  }
  state.holding = null;
  state.holdRel = null;
  state.grip = null;
  state.gripGoal = null;
  state.place = null;
}

/** Walk arrival hooks: a pending grab starts, and a push drive takes over
 *  from the walk. Shared by the normal arrival and the clamp-pinned arrival. */
function arriveMotorWalk(
  state: ActorState,
  actors: Map<string, ActorState>,
  props: Map<string, PropState>,
): void {
  state.vx = 0;
  const propId = state.grabTarget;
  if (propId) {
    const prop = props.get(propId);
    if (prop && !state.holding && !state.grab) state.grab = {propId, t: 0};
    state.grabTarget = null;
  }
  if (state.handDrive?.phase === "approach") {
    state.handDrive.phase = "drive";
    state.handDrive.t = 0;
    const rest = restHandAt(state);
    state.handDrive.hand = [rest[0], rest[1]];
    state.handDrive.speed = 0;
  }
  state.pursue = null;
}

export function simulateScene(scene: MotorScene): MotorTrajectory {
  const frameCount = Math.max(1, Math.ceil(scene.durationSec * FPS));
  const actors = new Map<string, ActorState>(
    scene.actors.map((actor) => [actor.id, {
      id: actor.id, x: actor.x, vx: 0, facing: actor.facing, groundY: actor.groundY, scale: actor.scale,
      walkPhase: 0, lean: 0, moveTarget: null, grab: null, holding: null, holdRel: null, handDrive: null, reach: null, grip: null, gripGoal: null, pursue: null, place: null,
      stagger: 0, stepsTaken: 0, staggerSlide: 0, body: bodyOf(actor.skeleton as Skeleton),
      skeleton: actor.skeleton, waist: 0, crouch: 0,
    }]),
  );
  const props = new Map<string, PropState>(
    scene.props.map((prop) => [prop.id, { id: prop.id, x: prop.x, y: prop.y, vx: 0, vy: 0, falling: false, size: prop.size, touchBox: prop.touchBox }]),
  );

  // Intent queues per actor, in start order.
  const queues = new Map<string, MotorIntent[]>();
  for (const actor of scene.actors) {
    queues.set(actor.id, [...actor.intents].sort((a, b) => a.at - b.at));
  }

  const actorFrames = new Map<string, MotorActorFrame[]>(scene.actors.map((actor) => [actor.id, []]));
  const propFrames = new Map<string, MotorPropFrame[]>(scene.props.map((prop) => [prop.id, []]));

  const propBoxWorld = (prop: PropState): {a: [number, number]; b: [number, number]} =>
    prop.touchBox
      ? {a: [prop.x + prop.touchBox.a[0], prop.y + prop.touchBox.a[1]], b: [prop.x + prop.touchBox.b[0], prop.y + prop.touchBox.b[1]]}
      : {a: [prop.x - prop.size[0] / 2, prop.y - prop.size[1]], b: [prop.x + prop.size[0] / 2, prop.y]};
  const propAim = (prop: PropState): [number, number] => {
    const box = propBoxWorld(prop);
    return [(box.a[0] + box.b[0]) / 2, (box.a[1] + box.b[1]) / 2];
  };
  /** The hand point for an actor reaching toward an aim at a given posture. */
  const handTargetAt = (state: ActorState, aim: [number, number], pitch: number, crouch: number): [number, number] => {
    const k = state.scale;
    const sh = shoulderAt(state.x, state.groundY, k, state.facing, state.body, pitch, crouch);
    const dx = aim[0] - sh[0];
    const dy = aim[1] - sh[1];
    const d = Math.hypot(dx, dy) || 1;
    const ext = Math.min(d, state.body.armReach * k);
    return [sh[0] + (dx / d) * ext, sh[1] + (dy / d) * ext];
  };
  /** The relaxed carry pose: hand down-forward of the shoulder at 60% reach. */
  const carryHandAt = (state: ActorState): [number, number] => {
    const k = state.scale;
    const sh = shoulderAt(state.x, state.groundY, k, state.facing, state.body, state.waist, state.crouch);
    const d = Math.hypot(0.35, 0.94);
    return [sh[0] + (0.35 / d) * state.body.armReach * k * 0.6 * state.facing, sh[1] + (0.94 / d) * state.body.armReach * k * 0.6];
  };
  const supportYAt = (x: number, currentY: number): number => {
    let best = scene.groundY ?? scene.actors[0]?.groundY ?? 720;
    for (const surface of scene.supports ?? []) {
      if (x >= surface.x0 && x <= surface.x1 && surface.y >= currentY - 2 && surface.y < best) best = surface.y;
    }
    return best;
  };

  const totalSubsteps = frameCount * SUBSTEPS;
  for (let step = 0; step < totalSubsteps; step++) {
    const now = step * DT;

    // Start intents whose time has come.
    for (const [id, queue] of queues) {
      const state = actors.get(id)!;
      while (queue.length && queue[0]!.at <= now) {
        const intent = queue.shift()!;
        if (intent.intent === "move") {
          const tx = intent.target !== undefined ? scene.resolveX(intent.target) : undefined;
          if (tx !== undefined) {
            // Moves at props halt at the prop's edge: pick up, do not walk through.
            const isProp = !actors.has(intent.target!) && scene.props.some((prop) => prop.id === intent.target);
            const dir = Math.sign(tx - state.x) || state.facing;
            if (isProp || intent.grab) {
              // Grab approach: halt where the SHOULDER lands beside the
              // object (the shoulder rides 260 design px toward facing), so
              // the hand reaches down onto it instead of past it.
              const shoulderFromCenter = Math.abs(state.body.waist[0] + state.body.shoulderFromWaist[0]);
              state.moveTarget = tx - dir * shoulderFromCenter * state.scale * 0.92;
              // The grabbed object: the move target for prop pickups, or the
              // declared `grab` for receiver moves (handover).
              state.grabTarget = intent.grab ?? (isProp ? intent.target! : null);
              // A moving actor target is pursued LIVE (the staged stop point
              // goes stale the moment the target walks).
              state.pursue = !isProp && actors.has(intent.target!) ? intent.target! : null;
            } else {
              state.moveTarget = tx;
              state.grabTarget = null;
              state.pursue = actors.has(intent.target!) ? intent.target! : null;
            }
          } else {
            state.moveTarget = state.x;
          }
        } else if (intent.intent === "push") {
          const tx = intent.target !== undefined ? scene.resolveX(intent.target) : undefined;
          if (tx !== undefined && state.handDrive === null) {
            const dir = (Math.sign(tx - state.x) || state.facing) as 1 | -1;
            state.facing = dir;
            const rest = restHandAt(state);
            // Walk into arm's range first: stop where the extended hand can
            // touch the target's near edge (real locomotion, no teleport).
            const target = actors.get(intent.target!);
            const stopGap = target
              ? (state.body.halfWidth + target.body.halfWidth) * state.scale + state.body.armReach * state.scale
              : 140 * state.scale;
            state.moveTarget = tx - dir * stopGap;
            state.handDrive = {
              target: intent.target!, force: clamp(intent.force ?? 0.7, 0.1, 2),
              t: 0, sec: intent.forceSec ?? 0.25, speed: 0, hand: [rest[0], rest[1]], contact: false, phase: "approach", contactT: null,
            };
          }
        } else if (intent.intent === "grab") {
          const targetId = intent.target!;
          if (state.holding !== targetId && state.grab?.propId !== targetId) {
            const prop = props.get(targetId);
            if (prop && state.moveTarget === null) state.grab = {propId: targetId, t: 0};
            else if (prop) state.grabTarget = targetId; // grab on arrival
          }
        } else if (intent.intent === "release") {
          const targetId = intent.target!;
          if (state.holding === targetId) {
            const prop = props.get(targetId)!;
            // Placing onto a support: if the prop's base sits BELOW a declared
            // surface at this x, the holder LIFTS it until the base clears the
            // surface, then opens the hand (a real placement, not a drop
            // through the shelf). Otherwise: open the hand and let it fall.
            const surface = (scene.supports ?? [])
              .filter((s) => prop.x >= s.x0 && prop.x <= s.x1 && s.y < scene.groundY!)
              .reduce((best, s) => Math.min(best, s.y), scene.groundY ?? 720);
            if (surface < prop.y - 4) {
              state.place = surface;
            } else {
              prop.falling = true;
              prop.vy = Math.max(0, -prop.vy);
              state.holding = null;
              state.holdRel = null;
              state.grip = null;
              state.gripGoal = null;
            }
          }
        }
      }
    }

    // Push hand drive (I2/I3): the force accelerates the HAND toward the
    // target. The arm follows; while the arm is not taut the body stays; once
    // taut, the hand's further motion drags the shoulder — the pusher's whole
    // body accelerates in the push direction. Force transfers to the target
    // only while the hand circle physically overlaps the target's box.
    for (const state of actors.values()) {
      const drive = state.handDrive;
      if (!drive || drive.phase === "approach") continue; // the walk drives the body; the hand waits at rest
      drive.t += DT;
      const targetActor = actors.get(drive.target);
      const targetProp = props.get(drive.target);
      const targetX = targetActor?.x ?? targetProp?.x;
      if (targetX === undefined) { state.handDrive = null; continue; }
      if (drive.t > (drive.contactT ?? 0) + drive.sec + (drive.contactT === null ? 1.2 : 0.45)) {
        // Force window over: the arm relaxes back to rest.
        const rest = restHandAt(state);
        const blend = clamp((drive.t - drive.sec - 0.45) / 0.3, 0, 1);
        drive.hand = [drive.hand[0] + (rest[0] - drive.hand[0]) * 8 * DT * (1 - blend), drive.hand[1] + (rest[1] - drive.hand[1]) * 8 * DT * (1 - blend)];
        if (blend >= 1) { state.handDrive = null; state.reach = null; continue; }
        state.reach = {tx: drive.hand[0], ty: drive.hand[1], target: drive.target, contact: false};
        continue;
      }
      const dir = (Math.sign(targetX - state.x) || state.facing) as 1 | -1;
      state.facing = dir;
      // Contact geometry: the target's declared torso box / prop body box.
      const targetBody = targetActor?.body;
      const targetBox = targetActor && targetBody
        ? {
            a: [targetActor.x - targetBody.halfWidth * targetActor.scale, targetActor.groundY - (targetBody.groundToWaist - CROUCH_DROP * targetActor.crouch + (targetBody.waist[1] - targetBody.torsoTop)) * targetActor.scale] as [number, number],
            b: [targetActor.x + targetBody.halfWidth * targetActor.scale, targetActor.groundY - (targetBody.groundToWaist - CROUCH_DROP * targetActor.crouch) * targetActor.scale] as [number, number],
          }
        : targetProp
          ? propBoxWorld(targetProp)
          : undefined;
      const inContact = targetBox !== undefined && circleOverlapsBox({center: drive.hand, radius: state.body.handRadius * state.scale}, targetBox);
      drive.contact = inContact;
      // The force window opens at FIRST CONTACT (the reach + waist bend take
      // whatever time they take), then conducts for `sec` seconds.
      if (inContact && drive.contactT === null) drive.contactT = drive.t;
      const forcing = drive.contactT !== null && drive.t - drive.contactT <= drive.sec;
      if (forcing && inContact) {
        // Force conducts through the touching surfaces only (I2).
        const impulse = drive.force * 680 * DT;
        if (targetActor) {
          targetActor.stagger += impulse;
          targetActor.facing = (-dir) as 1 | -1; // pushed body faces the pusher
        } else if (targetProp) {
          targetProp.vx += dir * impulse * 6;
        }
        // I3 reaction: the pusher leans back against the exertion.
        state.lean = -dir * REACTION_LEAN * drive.force;
      }
      // Hand motion: accelerate toward the target; brace on contact.
      if (!inContact || !forcing) {
        drive.speed = Math.min(drive.speed + HAND_ACC * drive.force * DT, HAND_MAX * drive.force);
        const targetAimY = targetActor && targetBody
          ? targetActor.groundY - (targetBody.groundToWaist - CROUCH_DROP * targetActor.crouch + (targetBody.waist[1] - targetBody.torsoTop) * 0.5) * targetActor.scale
          : targetProp
            ? propAim(targetProp)[1]
            : state.groundY - 300 * state.scale;
        const step = drive.speed * DT;
        drive.hand = [drive.hand[0] + dir * step, drive.hand[1] + clamp(targetAimY - drive.hand[1], -step, step)];
      } else {
        drive.speed = Math.max(0, drive.speed - HAND_ACC * drive.force * DT * 2);
        // Brace against the contact: the hand rests just inside the box edge.
        const aim = targetActor ? [targetX, drive.hand[1]] as [number, number] : propAim(targetProp!);
        const held = handTargetAt(state, aim, state.waist, state.crouch);
        drive.hand = [drive.hand[0] + (held[0] - drive.hand[0]) * 10 * DT, drive.hand[1] + (held[1] - drive.hand[1]) * 10 * DT];
      }
      // Arm constraint: a taut arm drags the body (I3).
      const k = state.scale;
      if (process.env.WDBG === state.id) console.log("drive", state.id, "x", state.x.toFixed(1), "hand", drive.hand[0].toFixed(0), drive.hand[1].toFixed(0), "phase", drive.phase, "t", drive.t.toFixed(2), "contactT", drive.contactT?.toFixed(2));
      const sh = shoulderAt(state.x, state.groundY, k, state.facing, state.body, state.waist, state.crouch);
      const dx = drive.hand[0] - sh[0];
      const dy = drive.hand[1] - sh[1];
      const d = Math.hypot(dx, dy);
      const reach = state.body.armReach * k;
      if (d > reach) {
        const excess = d - reach;
        drive.hand[0] -= (dx / d) * excess;
        drive.hand[1] -= (dy / d) * excess;
        // The taut arm pulls the shoulder along the hand's motion — but the
        // body never steps through another body (same I1 clamp as the walk).
        let nextX = state.x + dir * excess;
        for (const other of actors.values()) {
          if (other.id === state.id) continue;
          const required = state.body.halfWidth * state.scale + other.body.halfWidth * other.scale;
          if (dir > 0) nextX = Math.min(nextX, other.x - required);
          else nextX = Math.max(nextX, other.x + required);
        }
        state.x = nextX;
        state.walkPhase = (state.walkPhase + DT * 2.2) % 1;
      }
      // Keep the reaction lean while the force window holds and the arm is
      // loaded (contact or fully taut — the pusher is bracing either way).
      if (drive.contactT !== null && drive.t - drive.contactT <= drive.sec && (inContact || d >= reach * 0.98)) {
        state.lean = -dir * REACTION_LEAN * drive.force;
      }
      state.reach = {tx: drive.hand[0], ty: drive.hand[1], target: drive.target, contact: inContact && forcing};
    }

    // Actor integration.
    for (const state of actors.values()) {
      // Grab controller (I2/I4): bend the waist and crouch — the MINIMUM
      // posture whose fully-extended hand physically touches the object's
      // declared body box — then bind. The posture motion is the body's own
      // motion at real joint rates; the object never moves toward the hand.
      if (state.grab) {
        const g = state.grab;
        g.t += DT;
        const k = state.scale;
        const liveProp = props.get(g.propId)!;
        const box = propBoxWorld(liveProp);
        const aim = propAim(liveProp);
        // Face the object: a hand cannot honestly grab what is behind the back.
        state.facing = (Math.sign(aim[0] - state.x) || state.facing) as 1 | -1;
        const touches = (pitch: number, crouch: number): boolean =>
          circleOverlapsBox({center: handTargetAt(state, aim, pitch, crouch), radius: state.body.handRadius * k}, box);
        // Physical bind the moment the live hand overlaps the live box.
        if (touches(state.waist, state.crouch)) {
          // The grip takes the weight: any previous holder's hand opens.
          for (const other of actors.values()) {
            if (other.id !== state.id && other.holding === g.propId) {
              other.holding = null;
              other.holdRel = null;
              other.reach = null;
              other.grip = null;
              other.gripGoal = null;
            }
          }
          state.holding = g.propId;
          state.grab = null;
          const sh = shoulderAt(state.x, state.groundY, k, state.facing, state.body, state.waist, state.crouch);
          const hand = handTargetAt(state, aim, state.waist, state.crouch);
          // The grip starts where the hand physically touched, then eases to
          // the CENTER grip: the box center sits at the hand point (small
          // objects are carried at their middle, not by a distant offset).
          state.grip = {ox: liveProp.x - hand[0], oy: liveProp.y - hand[1]};
          state.gripGoal = {ox: liveProp.x - aim[0], oy: liveProp.y - aim[1]};
          state.holdRel = {from: [hand[0] - sh[0], hand[1] - sh[1]], t: 0, dur: 0.45};
        } else if (g.t > 2.5) {
          // Honest miss: no posture within the puppet model can touch it.
          state.grab = null;
          state.reach = null;
        } else {
          // Minimal-touch posture: least crouch, then least |pitch|.
          let goalPitch = SPINE_MAX * ((aim[0] - state.x) * state.facing >= 0 ? 1 : -1);
          let goalCrouch = 1;
          search: for (let c = 0; c <= 1.0001; c += 0.25) {
            for (let p = 0; p <= SPINE_MAX; p += 5) {
              if (touches(p, c)) { goalPitch = p; goalCrouch = c; break search; }
              if (touches(-p, c)) { goalPitch = -p; goalCrouch = c; break search; }
            }
          }
          state.waist = approach(state.waist, goalPitch, WAIST_RATE * DT);
          state.crouch = approach(state.crouch, goalCrouch, CROUCH_RATE * DT);
          const liveHand = handTargetAt(state, aim, state.waist, state.crouch);
          state.reach = {tx: liveHand[0], ty: liveHand[1], target: g.propId, contact: false};
        }
      }
      // Hold (I4): the bound prop's position IS the hand's position — through
      // walking, staggering, rising from a crouch, everything — until an
      // explicit release.
      if (state.holding) {
        const heldProp = props.get(state.holding)!;
        // The posture returns to neutral at real joint rates; the hand keeps
        // its shoulder-relative shape (the arm holds the object as the body
        // straightens), then relaxes to the carry pose.
        state.waist = approach(state.waist, 0, WAIST_RATE * DT);
        state.crouch = approach(state.crouch, 0, CROUCH_RATE * DT);
        if (state.holdRel) {
          state.holdRel.t += DT;
          const blend = smoothstep01(state.holdRel.t / state.holdRel.dur);
          // The grip eases from the bind-time touch offset to the center grip
          // while the hand settles to carry — the fingers close around the
          // object; the prop never jumps (the ease spans the whole settle).
          const gripNow = state.grip && state.gripGoal
            ? {
                ox: state.grip.ox + (state.gripGoal.ox - state.grip.ox) * blend,
                oy: state.grip.oy + (state.gripGoal.oy - state.grip.oy) * blend,
              }
            : state.grip;
          const k = state.scale;
          const sh = shoulderAt(state.x, state.groundY, k, state.facing, state.body, state.waist, state.crouch);
          const carry = carryHandAt(state);
          const rel: [number, number] = [
            state.holdRel.from[0] + ((carry[0] - sh[0]) - state.holdRel.from[0]) * blend,
            state.holdRel.from[1] + ((carry[1] - sh[1]) - state.holdRel.from[1]) * blend,
          ];
          const hand: [number, number] = [sh[0] + rel[0], sh[1] + rel[1]];
          heldProp.x = hand[0] + (gripNow?.ox ?? 0);
          heldProp.y = hand[1] + (gripNow?.oy ?? 0);
          heldProp.vx = 0;
          heldProp.falling = false;
          state.reach = {tx: hand[0], ty: hand[1], target: state.holding, contact: true};
          if (blend >= 1) {
            state.grip = state.gripGoal ?? state.grip;
            state.holdRel = null;
          }
        } else if (state.place !== null) {
          // Placing: raise the hand (the prop rides the grip) until the prop
          // base clears the support surface, then open the hand.
          const hand = carryHandAt(state);
          const targetHandY = state.place - 6 - (state.grip?.oy ?? 0);
          // Rise from the PREVIOUS hand position (the carry pose recomputes
          // every substep and would otherwise swallow the accumulated lift).
          const prevY = state.reach?.ty ?? hand[1];
          const liftY = Math.max(targetHandY, prevY - 260 * DT);
          const liftHand: [number, number] = [hand[0], liftY];
          heldProp.x = liftHand[0] + (state.grip?.ox ?? 0);
          heldProp.y = liftHand[1] + (state.grip?.oy ?? 0);
          heldProp.vx = 0;
          heldProp.falling = false;
          state.reach = {tx: liftHand[0], ty: liftHand[1], target: state.holding, contact: true};
          if (heldProp.y <= state.place + 2) {
            propOpenHand(state, props);
          }
        } else {
          const hand = carryHandAt(state);
          heldProp.x = hand[0] + (state.grip?.ox ?? 0);
          heldProp.y = hand[1] + (state.grip?.oy ?? 0);
          heldProp.vx = 0;
          heldProp.falling = false;
          state.reach = {tx: hand[0], ty: hand[1], target: state.holding, contact: true};
        }
      }
      // Posture return when nothing is held or grabbed.
      if (!state.grab && !state.holding && (state.waist !== 0 || state.crouch !== 0)) {
        state.waist = approach(state.waist, 0, WAIST_RATE * DT);
        state.crouch = approach(state.crouch, 0, CROUCH_RATE * DT);
      }
      // Pursuit: walk toward an active move target (planted-feet walk), but
      // never step into another body — halt at adjacency (I1).
      if (state.moveTarget !== null) {
        // Live pursuit: chase the target's current position (the staged stop
        // point goes stale the moment the target walks).
        if (state.pursue) {
          const live = actors.get(state.pursue);
          if (live) state.moveTarget = live.x;
          else state.pursue = null;
        }
        const distance = state.moveTarget - state.x;
        if (Math.abs(distance) <= WALK_SPEED * DT) {
          // Arrival: same body-edge clamp as the step — a move target inside
          // another body's exclusion zone stops at adjacency, never snaps in.
          let arrival = state.moveTarget;
          for (const other of actors.values()) {
            if (other.id === state.id) continue;
            const required = state.body.halfWidth * state.scale + other.body.halfWidth * other.scale;
            if (arrival >= state.x) arrival = Math.min(arrival, other.x - required);
            else arrival = Math.max(arrival, other.x + required);
          }
          state.x = arrival;
          state.moveTarget = null;
          arriveMotorWalk(state, actors, props);
        } else {
          const direction = Math.sign(distance) as 1 | -1;
          state.facing = direction;
          // Clamp the step at every other body's edge — a walker never
          // overlaps and never gets a backward correction.
          let stepX = state.x + direction * WALK_SPEED * DT;
          let clampedBy: ActorState | null = null;
          for (const other of actors.values()) {
            if (other.id === state.id) continue;
            const required = state.body.halfWidth * state.scale + other.body.halfWidth * other.scale;
            const before = stepX;
            if (direction > 0) stepX = Math.min(stepX, other.x - required);
            else stepX = Math.max(stepX, other.x + required);
            if (stepX !== before) clampedBy = other;
          }
          state.x = stepX;
          state.walkPhase = (state.walkPhase + DT * 2.2) % 1;
          // Pinned at another body's edge: if the target is beyond (or IS the
          // body we pressed into), this is as close as bodies allow — arrival.
          if (clampedBy && ((state.moveTarget - state.x) * direction <= 0 || clampedBy.id === state.pursue)) {
            state.moveTarget = null;
            state.pursue = null;
            arriveMotorWalk(state, actors, props);
          }
        }
      } else if (Math.abs(state.stagger) > 1) {
        // Stagger: momentum slides the body with foot friction; when the
        // slide exceeds the declared step allowance, the feet take a
        // recovery step that catches part of the remaining momentum
        // (capture-point stepping, thresholds from the figure data).
        const direction = Math.sign(state.stagger);
        const slide = Math.min(Math.abs(state.stagger), 140 * DT);
        state.x += direction * slide;
        state.stagger -= direction * slide;
        state.staggerSlide += slide;
        state.walkPhase = (state.walkPhase + DT * 3) % 1;
        state.lean *= 0.96;
        // Recovery step: after ~stepLength of slide the feet reposition and
        // catch catchFraction of the remaining momentum. Beyond maxSteps the
        // imbalance exceeds capacity — the figure is falling (future work:
        // fall poses; for now the lean grows and friction settles it).
        if (state.staggerSlide >= state.body.stepLength && state.stepsTaken < state.body.maxSteps) {
          state.stagger -= direction * Math.abs(state.stagger) * state.body.catchFraction;
          state.staggerSlide = 0;
          state.stepsTaken += 1;
          state.stepPlanted = true;
        }
      } else {
        state.stagger = 0;
        state.staggerSlide = 0;
        state.stepsTaken = 0;
        state.lean *= 0.9;
        if (!state.reach) state.walkPhase = 0;
      }
      // Body separation (I1): hard projection — two actors cannot share
      // ground. Walkers already halt at adjacency; this resolves contact
      // between staggered/shoved bodies deterministically.
      for (const other of actors.values()) {
        if (other.id <= state.id) continue;
        const gap = Math.abs(other.x - state.x);
        const required = state.body.halfWidth * state.scale + other.body.halfWidth * other.scale;
        if (gap >= required || gap === 0) continue;
        const overlap = required - gap;
        const dir = Math.sign(state.x - other.x) || (state.facing as number);
        state.x += dir * overlap / 2;
        other.x -= dir * overlap / 2;
      }
    }

    // Prop integration (I4): a prop moves only by carrying (handled in the
    // hold block), gravity after release, or friction slide from an impulse.
    for (const prop of props.values()) {
      if (prop.falling) {
        prop.vy += GRAVITY * DT;
        prop.y += prop.vy * DT;
        const surface = supportYAt(prop.x, prop.y - prop.vy * DT);
        if (prop.y >= surface) {
          prop.y = surface;
          prop.vy = 0;
          prop.falling = false;
        }
      } else if (Math.abs(prop.vx) > 1) {
        prop.x += prop.vx * DT;
        const friction = Math.sign(prop.vx) * PROP_FRICTION * DT;
        prop.vx = Math.abs(prop.vx) <= Math.abs(friction) ? 0 : prop.vx - friction;
      } else {
        prop.vx = 0;
      }
    }

    // Bake one frame per 24fps tick.
    if ((step + 1) % SUBSTEPS === 0) {
      for (const [id, frames] of actorFrames) {
        const state = actors.get(id)!;
        const planted = state.stepPlanted;
        state.stepPlanted = false;
        frames.push({
          x: Math.round(state.x * 100) / 100,
          lean: Math.round(state.lean * 100) / 100,
          facing: state.facing,
          walk: Math.round(state.walkPhase * 1000) / 1000,
          ...(state.waist ? {waist: Math.round(state.waist * 100) / 100} : {}),
          ...(state.crouch > 0.01 ? {crouch: Math.round(state.crouch * 100) / 100} : {}),
          ...(state.holding ? {holds: state.holding} : {}),
          ...(planted ? {step: 1} : {}),
          ...(state.reach ? {
            reach: [Math.round(state.reach.tx * 100) / 100, Math.round(state.reach.ty * 100) / 100],
            ...(state.reach.contact ? { contact: true } : {}),
          } : {}),
        });
      }
      for (const [id, frames] of propFrames) {
        const prop = props.get(id)!;
        frames.push({ x: Math.round(prop.x * 100) / 100, y: Math.round(prop.y * 100) / 100, ...(prop.falling ? {falling: true} : {}) });
      }
    }
  }

  return {
    actors: Object.fromEntries(actorFrames),
    props: Object.fromEntries(propFrames),
  };
}

export interface MotorSceneSource {
  durationSec: number;
  /** Normalized staging positions keyed by instance id. */
  actors: Record<string, {at: readonly [number, number]; facing?: number; scale?: number; skeleton?: Skeleton}>;
  objects: Record<string, {at: readonly [number, number]; size?: [number, number]; scale?: number; touchBox?: {a: [number, number]; b: [number, number]}}>;
  /** Declared support surfaces in stage space (released props land here). */
  supports?: Array<{x0: number; x1: number; y: number}>;
  /** Scene performance tracks (motor intents live here, subject-keyed). */
  tracks: Array<{subject?: string; events?: Array<{start?: number; end?: number; tracks?: Array<{kind?: string; events?: Array<Record<string, unknown>>}>}>}>;
}

/**
 * Extract motor intents from a compiled scene and run the simulation.
 * Returns undefined when the scene declares no motor intents — unmigrated
 * actions keep the legacy semantic path.
 */
export function bakeSceneMotor(
  source: MotorSceneSource,
  video: {width: number; height: number} = {width: 1920, height: 1080},
): MotorTrajectory | undefined {
  const actorInputs: MotorActorInput[] = [];
  const intentsByActor = new Map<string, MotorIntent[]>();
  for (const [id, staged] of Object.entries(source.actors ?? {})) {
    actorInputs.push({id, x: staged.at[0] * video.width, groundY: staged.at[1] * video.height, facing: staged.facing === -1 ? -1 : 1, scale: staged.scale ?? 1, skeleton: staged.skeleton, intents: []});
    intentsByActor.set(id, []);
  }
  for (const track of source.tracks ?? []) {
    const subject = track.subject;
    for (const event of track.events ?? []) {
      for (const recipe of event.tracks ?? []) {
        if (recipe.kind === "binding") {
          // Binding events drive the physical hold: a release opens the
          // holder's hand; a bind starts the grab controller (reach/bend/
          // contact/bind) for the holder — no easing, no grace periods.
          for (const item of recipe.events ?? []) {
            const value = (item.value ?? item) as Record<string, unknown>;
            const op = String(value.operation ?? "bind");
            const object = String(value.object ?? value.target ?? track.subject ?? "");
            const holder = String(value.holder ?? value.actorId ?? value.actor ?? subject ?? "");
            if (!object || !intentsByActor.has(holder)) continue;
            const at = Number(event.start ?? 0) + Number(item.at ?? item.frame ?? 0);
            if (op === "release") {
              intentsByActor.get(holder)!.push({at, duration: 0.01, intent: "release", target: object});
            } else {
              intentsByActor.get(holder)!.push({at, duration: 1, intent: "grab", target: object});
            }
          }
          continue;
        }
        if (recipe.kind !== "motor") continue;
        for (const item of recipe.events ?? []) {
          const intent = (item.value ?? item) as Record<string, unknown>;
          if (intent.intent !== "move" && intent.intent !== "push" && intent.intent !== "release" && intent.intent !== "grab") continue;
          // An intent may drive an actor other than the invoking subject
          // (e.g. a handover walks the RECEIVER to the giver).
          const driven = typeof intent.actor === "string" && intentsByActor.has(intent.actor) ? intent.actor : subject;
          if (!driven || !intentsByActor.has(driven)) continue;
          intentsByActor.get(driven)!.push({
            at: Number(event.start ?? 0) + Number(intent.at ?? 0),
            duration: Number(intent.duration ?? event.end ?? 1),
            intent: intent.intent as "move" | "push" | "release" | "grab",
            target: intent.target as string | undefined,
            force: typeof intent.force === "number" ? intent.force : undefined,
            reach: typeof intent.reach === "number" ? intent.reach : undefined,
            forceSec: typeof intent.forceSec === "number" ? intent.forceSec : undefined,
            grab: typeof intent.grab === "string" ? intent.grab : undefined,
          });
        }
      }
    }
  }
  const totalIntents = [...intentsByActor.values()].reduce((sum, list) => sum + list.length, 0);
  if (totalIntents === 0) return undefined;
  for (const actor of actorInputs) actor.intents = intentsByActor.get(actor.id)!;
  return simulateScene({
    durationSec: source.durationSec,
    actors: actorInputs,
    props: Object.entries(source.objects ?? {}).map(([id, staged]) => ({id, x: staged.at[0] * video.width, y: staged.at[1] * video.height, size: staged.size ?? [80, 120] as [number, number], touchBox: staged.touchBox, intents: []})),
    supports: source.supports,
    groundY: actorInputs[0]?.groundY,
    resolveX: (id) => {
      const actor = source.actors?.[id];
      if (actor) return actor.at[0] * video.width;
      const object = source.objects?.[id];
      return object ? object.at[0] * video.width : undefined;
    },
  });
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}
