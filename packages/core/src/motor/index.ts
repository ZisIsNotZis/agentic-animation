/**
 * World Puppet Motor (docs/WORLD_PUPPET_MOTOR.md) — planar physical motion
 * for actors and props. Deterministic fixed-timestep simulation run at
 * compile time; the renderer only looks up baked per-frame trajectories.
 *
 * Invariants:
 *   I1 Support    — feet plant; pelvis motion respects planted feet (stepping
 *                   keeps the center of mass over support).
 *   I2 Contact    — a body only accelerates while touched (a push applies
 *                   force only while the hand is within contact range).
 *   I3 Reaction   — exerting force shifts the actor's own weight backward.
 *   I4 Determinism— fixed timestep, seeded; no wall clock, no randomness
 *                   beyond the seed.
 */

export interface MotorIntent {
  at: number;
  duration: number;
  intent: "move" | "push";
  target?: string;
  /** Stylized force 0..1 for push. */
  force?: number;
  /** Fraction of the intent spent reaching before contact (push). */
  reach?: number;
  /** Seconds of force application after contact (push). */
  forceSec?: number;
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
  /** Hand world position while reaching/exerting, else undefined. */
  reach?: [number, number];
  /** True while in force-producing contact with the intent target. */
  contact?: boolean;
}

export interface MotorPropFrame {
  x: number;
  y: number;
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
  /** Max waist pitch in deg. */
  pitchMax: number;
  /** Balance stepping: slide allowance per recovery step, catch fraction, capacity. */
  stepLength: number;
  catchFraction: number;
  maxSteps: number;
  /** Waist pivot (design). */
  waist: [number, number];
  /** Ground-to-waist distance in design px. */
  groundToWaist: number;
  /** Shoulder offset from the waist pivot (design, facing-right frame). */
  shoulderFromWaist: [number, number];
}

function bodyOf(skeleton: Skeleton): ActorBody {
  const torso = skeleton.parts.torso as {box?: [[number, number], [number, number]]} | undefined;
  if (!torso?.box) throw new Error("motor: figure skeleton lacks a torso box part");
  const shoulder = skeleton.joints.shoulder_r;
  const waist = skeleton.joints.waist;
  if (!shoulder || !waist) throw new Error("motor: figure skeleton lacks shoulder_r/waist joints");
  return {
    halfWidth: Math.abs(torso.box[1][0] - torso.box[0][0]) / 2,
    torsoTop: Math.min(torso.box[0][1], torso.box[1][1]),
    torsoBottom: Math.max(torso.box[0][1], torso.box[1][1]),
    armReach: skeleton.arm.upper + skeleton.arm.fore + skeleton.arm.handRadius,
    handRadius: skeleton.arm.handRadius,
    pitchMax: skeleton.waist.pitchMax,
    stepLength: skeleton.balance.stepLength,
    catchFraction: skeleton.balance.catchFraction,
    maxSteps: skeleton.balance.maxSteps,
    waist,
    groundToWaist: skeleton.space.height - waist[1],
    shoulderFromWaist: [shoulder[0] - waist[0], shoulder[1] - waist[1]],
  };
}

/** World-space shoulder for an actor at a waist pitch (generic waist FK). */
function shoulderAt(x: number, groundY: number, scale: number, facing: 1 | -1, body: ActorBody, pitchDeg: number): [number, number] {
  const wx = x + facing * body.waist[0] * scale;
  const wy = groundY - body.groundToWaist * scale;
  const d: [number, number] = [facing * body.shoulderFromWaist[0] * scale, body.shoulderFromWaist[1] * scale];
  const r = ((facing * pitchDeg) * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [wx + d[0] * c - d[1] * s, wy + d[0] * s + d[1] * c];
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
  walkPhase: number;
  lean: number;
  /** Motor-driven destination while a move intent is active. */
  moveTarget: number | null;
  /** Prop id a completed move intent should grab (transient). */
  grabTarget?: string | null;
  /** Reaching/exerting state: the world-space point the hand is at. */
  reach: { tx: number; ty: number; target: string; contact: boolean } | null;
  /** Prop-grab trajectory after a move-to-prop intent arrives (see bake). */
  grab: { propId: string; t: number; x: number; y: number } | null;
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
  size: [number, number];
}

export interface MotorScene {
  durationSec: number;
  actors: MotorActorInput[];
  props: MotorPropInput[];
  /** Target resolution: id -> stage x (actors and props share the space). */
  resolveX(id: string): number | undefined;
}

/**
 * Simulate one scene. Pure and deterministic: same inputs -> identical
 * trajectories. Emits one frame per 24fps tick.
 */
export function simulateScene(scene: MotorScene): MotorTrajectory {
  const frameCount = Math.max(1, Math.ceil(scene.durationSec * FPS));
  const actors = new Map<string, ActorState>(
    scene.actors.map((actor) => [actor.id, {
      id: actor.id, x: actor.x, vx: 0, facing: actor.facing, groundY: actor.groundY, scale: actor.scale,
      walkPhase: 0, lean: 0, moveTarget: null, reach: null, grab: null, stagger: 0, stepsTaken: 0, staggerSlide: 0,
      body: bodyOf(actor.skeleton as Skeleton), skeleton: actor.skeleton, waist: 0,
    }]),
  );
  const props = new Map<string, PropState>(
    scene.props.map((prop) => [prop.id, { id: prop.id, x: prop.x, y: prop.y, vx: 0, size: prop.size }]),
  );

  // Intent queues per actor, in start order.
  const queues = new Map<string, MotorIntent[]>();
  for (const actor of scene.actors) {
    queues.set(actor.id, [...actor.intents].sort((a, b) => a.at - b.at));
  }

  const actorFrames = new Map<string, MotorActorFrame[]>(scene.actors.map((actor) => [actor.id, []]));
  const propFrames = new Map<string, MotorPropFrame[]>(scene.props.map((prop) => [prop.id, []]));
  const pendingForces: Array<{actor: string; target: string; start: number; sec: number; force: number; applied?: number}> = [];

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
            // Grab approaches stand close (hand reaches down over the object);
            // other moves halt at body adjacency.
            state.moveTarget = isProp ? tx - dir * state.body.halfWidth * state.scale * 0.3 : tx;
            state.grabTarget = isProp ? intent.target! : null;
          } else {
            state.moveTarget = state.x;
          }
        } else if (intent.intent === "push") {
          const tx = intent.target !== undefined ? scene.resolveX(intent.target) : undefined;
          if (tx !== undefined) {
            const shoulderY = state.groundY - (state.body.groundToWaist + (state.body.waist[1] - state.body.torsoTop) * 0.45) * state.scale;
            state.reach = { tx, ty: shoulderY, target: intent.target!, contact: false };
            pendingForces.push({ actor: id, target: intent.target!, start: now + (intent.reach ?? 0.35), sec: intent.forceSec ?? 0.25, force: clamp(intent.force ?? 0.7, 0.1, 2) });
          }
        }
      }
    }

    // Forces: approach, then contact-gated application (I2).
    for (let i = pendingForces.length - 1; i >= 0; i--) {
      const force = pendingForces[i]!;
      const actor = actors.get(force.actor);
      const targetActor = actors.get(force.target);
      const targetProp = props.get(force.target);
      if (!actor) { pendingForces.splice(i, 1); continue; }
      const targetX = targetActor?.x ?? targetProp?.x;
      if (targetX === undefined) { pendingForces.splice(i, 1); continue; }
      const direction = Math.sign(targetX - actor.x) || 1;
      // Part contact (Slice 1): the hand circle — extended from the waist-
      // FK shoulder toward the target's torso center — must overlap the
      // target's torso box. Force conducts through touching parts only.
      const targetBody = targetActor?.body;
      const aim: [number, number] = targetActor
        ? [targetX, targetActor.groundY - (targetBody!.groundToWaist + ((targetBody!.waist[1] - targetBody!.torsoTop) * 0.5)) * targetActor.scale]
        : targetProp
          ? [targetX, targetProp.y - targetProp.size[1] / 2]
          : [targetX, actor.groundY];
      const shoulder = shoulderAt(actor.x, actor.groundY, actor.scale, direction as 1 | -1, actor.body, actor.waist);
      const aimDx = aim[0] - shoulder[0];
      const aimDy = aim[1] - shoulder[1];
      const aimD = Math.hypot(aimDx, aimDy) || 1;
      const ext = Math.min(aimD, actor.body.armReach * actor.scale);
      const hand: [number, number] = [shoulder[0] + (aimDx / aimD) * ext, shoulder[1] + (aimDy / aimD) * ext];
      const handCircle = {center: hand, radius: actor.body.handRadius * actor.scale};
      const targetTorso = targetBody && targetActor
        ? {
            a: [targetX - targetBody.halfWidth * targetActor.scale, targetActor.groundY - (targetBody.groundToWaist + (targetBody.waist[1] - targetBody.torsoTop)) * targetActor.scale] as [number, number],
            b: [targetX + targetBody.halfWidth * targetActor.scale, targetActor.groundY - targetBody.groundToWaist * targetActor.scale] as [number, number],
          }
        : targetProp
          ? {
              a: [targetProp.x - targetProp.size[0] / 2, targetProp.y - targetProp.size[1]] as [number, number],
              b: [targetProp.x + targetProp.size[0] / 2, targetProp.y] as [number, number],
            }
          : undefined;
      const inContact = targetTorso !== undefined && circleOverlapsBox(handCircle, targetTorso);
      // Reach phase: track the target and step into contact range — the
      // approach always completes before any force can exist (I2).
      actor.reach = { tx: hand[0], ty: hand[1], target: force.target, contact: inContact && now >= force.start };
      actor.facing = direction as 1 | -1;
      // Reach phase: step into contact range — the approach always completes
      // before any force can exist (I2).
      if (!inContact) {
        actor.x += direction * WALK_SPEED * DT;
        actor.walkPhase = (actor.walkPhase + DT * 2.2) % 1;
        continue;
      }
      if (now < force.start) continue; // braced and in contact range, waiting
      if (force.applied !== undefined && force.applied >= force.sec) { pendingForces.splice(i, 1); continue; }
      force.applied = (force.applied ?? 0) + DT;
      if (force.applied >= force.sec) { pendingForces.splice(i, 1); continue; }
      const impulse = force.force * 260 * DT;
      if (targetActor) {
        targetActor.stagger += impulse;
        targetActor.vx += direction * impulse * 3;
        targetActor.facing = (-direction) as 1 | -1; // pushed body faces the pusher
      } else if (targetProp) {
        targetProp.vx += direction * impulse * 6;
      }
      // I3 reaction: pusher leans back and loses forward speed.
      actor.lean = -direction * REACTION_LEAN * force.force;
      actor.vx -= direction * impulse;
    }

    // Actor integration.
    for (const state of actors.values()) {
      // Grab trajectory (docs/WORLD_PUPPET_MOTOR.md): the waist bends just
      // enough to bring the object within arm reach, the arm extends onto it,
      // then the figure straightens up carrying it. The baked reach point is
      // the FK hand position throughout, so the renderer's hand-follow is
      // continuous and the drawn hand IS the grabbing hand.
      if (state.grab) {
        state.grab.t += DT;
        const t = state.grab.t;
        const body = state.body;
        const k = state.scale;
        const target: [number, number] = [state.grab.x, state.grab.y];
        const BEND = 0.35, GRIP = 0.5, RISE = 1.0;
        // Smallest waist pitch that puts the object within arm reach.
        const reachablePitch = (): number => {
          for (let p = 0; p <= body.pitchMax; p += 5) {
            const s = shoulderAt(state.x, state.groundY, k, state.facing, body, p);
            if (Math.hypot(target[0] - s[0], target[1] - s[1]) <= body.armReach * k) return p;
          }
          return body.pitchMax;
        };
        const need = reachablePitch();
        if (t < BEND) {
          state.waist = need * smoothstep01(t / BEND);
        } else if (t < GRIP) {
          state.waist = need;
        } else if (t < RISE) {
          state.waist = need * (1 - smoothstep01((t - GRIP) / (RISE - GRIP)));
        } else {
          state.waist = 0;
          state.grab = null;
          state.reach = null;
        }
        if (state.grab) {
          const shoulder = shoulderAt(state.x, state.groundY, k, state.facing, body, state.waist);
          const rest = solveSkeleton(state.skeleton as Skeleton, {});
          const restHand = rest.hands.hand_r?.center ?? [state.skeleton!.space.width / 2, state.skeleton!.space.height * 0.71];
          const carry: [number, number] = [
            state.x + state.facing * (restHand[0] - state.skeleton!.space.width / 2) * k,
            state.groundY - (state.skeleton!.space.height - restHand[1]) * k,
          ];
          const d = Math.hypot(target[0] - shoulder[0], target[1] - shoulder[1]);
          const ext = Math.min(d, body.armReach * k);
          const hand: [number, number] = t < GRIP
            ? [shoulder[0] + ((target[0] - shoulder[0]) / (d || 1)) * ext, shoulder[1] + ((target[1] - shoulder[1]) / (d || 1)) * ext]
            : [
                target[0] + (carry[0] - target[0]) * smoothstep01((t - GRIP) / (RISE - GRIP)),
                target[1] + (carry[1] - target[1]) * smoothstep01((t - GRIP) / (RISE - GRIP)),
              ];
          state.reach = { tx: hand[0], ty: hand[1], target: state.grab.propId, contact: t >= BEND && t < RISE };
        }
      }
      // Pursuit: walk toward an active move target (planted-feet walk).
      if (state.moveTarget !== null) {
        const distance = state.moveTarget - state.x;
        if (Math.abs(distance) <= WALK_SPEED * DT) {
          state.x = state.moveTarget;
          state.moveTarget = null;
          state.vx = 0;
          const propId = (state as {grabTarget?: string | null}).grabTarget;
          if (propId) {
            const prop = props.get(propId);
            if (prop) state.grab = { propId, t: 0, x: prop.x, y: prop.y };
            (state as {grabTarget?: string | null}).grabTarget = null;
          }
        } else {
          const direction = Math.sign(distance) as 1 | -1;
          state.facing = direction;
          state.x += direction * WALK_SPEED * DT;
          state.walkPhase = (state.walkPhase + DT * 2.2) % 1;
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
      // Body separation (I1): two actors cannot share ground. A mover stops
      // at adjacency — the script says "run at", not "overlap with", so
      // pursuit halts at the other body's edge.
      for (const other of actors.values()) {
        if (other.id === state.id) continue;
        const gap = Math.abs(other.x - state.x);
        const required = state.body.halfWidth * state.scale + other.body.halfWidth * other.scale;
        if (gap >= required) continue;
        if (state.moveTarget !== null) {
          const dir = Math.sign(state.moveTarget - state.x) || state.facing;
          const limit = other.x - dir * required;
          if ((state.moveTarget - limit) * dir > 0) state.moveTarget = limit;
        }
        const push = (required - gap) / 2;
        const dir = Math.sign(state.x - other.x) || state.facing;
        state.x += dir * push * DT * 8;
      }
    }

    // Prop integration: slide with friction, never leave the ground line.
    for (const prop of props.values()) {
      if (Math.abs(prop.vx) > 1) {
        prop.x += prop.vx * DT;
        const friction = Math.sign(prop.vx) * PROP_FRICTION * DT;
        prop.vx = Math.abs(prop.vx) <= Math.abs(friction) ? 0 : prop.vx - friction;
      } else {
        prop.vx = 0;
      }
    }

    // Bake one frame per 24fps tick.
    if ((step + 1) % SUBSTEPS === 0) {
      const frameIndex = Math.floor(now / (1 / FPS));
      void frameIndex;
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
          ...(planted ? {step: 1} : {}),
          ...(state.reach ? {
            reach: [Math.round(state.reach.tx * 100) / 100, Math.round(state.reach.ty * 100) / 100],
            ...(state.reach.contact ? { contact: true } : {}),
          } : {}),
        });
      }
      for (const [id, frames] of propFrames) {
        const prop = props.get(id)!;
        frames.push({ x: Math.round(prop.x * 100) / 100, y: Math.round(prop.y * 100) / 100 });
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
  objects: Record<string, {at: readonly [number, number]; size?: [number, number]; scale?: number}>;
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
    if (!subject || !intentsByActor.has(subject)) continue;
    for (const event of track.events ?? []) {
      for (const recipe of event.tracks ?? []) {
        if (recipe.kind !== "motor") continue;
        for (const item of recipe.events ?? []) {
          const intent = (item.value ?? item) as Record<string, unknown>;
          if (intent.intent !== "move" && intent.intent !== "push") continue;
          // An intent may drive an actor other than the invoking subject
          // (e.g. a handover walks the RECEIVER to the giver).
          const driven = typeof intent.actor === "string" && intentsByActor.has(intent.actor) ? intent.actor : subject;
          intentsByActor.get(driven)!.push({
            at: Number(event.start ?? 0) + Number(intent.at ?? 0),
            duration: Number(intent.duration ?? event.end ?? 1),
            intent: intent.intent as "move" | "push",
            target: intent.target as string | undefined,
            force: typeof intent.force === "number" ? intent.force : undefined,
            reach: typeof intent.reach === "number" ? intent.reach : undefined,
            forceSec: typeof intent.forceSec === "number" ? intent.forceSec : undefined,
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
    props: Object.entries(source.objects ?? {}).map(([id, staged]) => ({id, x: staged.at[0] * video.width, y: staged.at[1] * video.height, size: staged.size ?? [80, 120] as [number, number], intents: []})),
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
