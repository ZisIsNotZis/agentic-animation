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
  intents: MotorIntent[];
}

export interface MotorPropInput {
  id: string;
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

import { BODY_HALF_WIDTH as BODY_HALF_DESIGN, FIGURE_BOX, HAND_PUSH, HAND_REST, REACH_PUSH } from "./figureGeometry";

const FPS = 24;
const DT = 1 / 120;
const SUBSTEPS = Math.round(1 / (FPS * DT));
/** Walk speed in stage px/s. */
const WALK_SPEED = 420;
/**
 * Body half-width comes from the drawn figure (figureGeometry SSOT): the
 * physics body IS the drawn silhouette (robe spans 100..300 of the 400px
 * design box), not an invented box.
 */
const BODY_HALF_WIDTH = (FIGURE_BOX.width - 2 * BODY_HALF_DESIGN) / 2;
/** Contact margin: the drawn hand tip touches the target's silhouette edge. */
const CONTACT_MARGIN = 14;
/** Ground friction deceleration for sliding props (px/s²). */
const PROP_FRICTION = 900;
/** Reaction lean per unit of applied force (degrees). */
const REACTION_LEAN = 14;

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
}

interface PropState {
  id: string;
  x: number;
  y: number;
  vx: number;
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
      walkPhase: 0, lean: 0, moveTarget: null, reach: null, grab: null, stagger: 0,
    }]),
  );
  const props = new Map<string, PropState>(
    scene.props.map((prop) => [prop.id, { id: prop.id, x: prop.x, y: prop.y, vx: 0 }]),
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
            state.moveTarget = isProp ? tx - dir * BODY_HALF_WIDTH * state.scale : tx;
            state.grabTarget = isProp ? intent.target! : null;
          } else {
            state.moveTarget = state.x;
          }
        } else if (intent.intent === "push") {
          const tx = intent.target !== undefined ? scene.resolveX(intent.target) : undefined;
          if (tx !== undefined) {
            state.reach = { tx, ty: state.groundY + HAND_PUSH.y, target: intent.target!, contact: false };
            state.stagger += 0; // reaction applied during force below
            pendingForces.push({ actor: id, target: intent.target!, start: now + (intent.reach ?? 0.35), sec: intent.forceSec ?? 0.25, force: clamp(intent.force ?? 0.7, 0.1, 1) });
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
      const handX = actor.x + direction * HAND_PUSH.x * actor.scale;
      const targetScale = targetActor?.scale ?? 1;
      const inContact = Math.abs(handX - targetX) <= BODY_HALF_WIDTH * targetScale + CONTACT_MARGIN * actor.scale;
      // Reach phase: track the target and step into contact range — the
      // approach always completes before any force can exist (I2).
      actor.reach = { tx: targetX, ty: actor.groundY + HAND_PUSH.y, target: force.target, contact: inContact && now >= force.start };
      if (!inContact) {
        actor.facing = direction as 1 | -1;
        actor.x += direction * WALK_SPEED * DT;
        actor.walkPhase = (actor.walkPhase + DT * 2.2) % 1;
        continue;
      }
      actor.facing = direction as 1 | -1;
      if (now < force.start) continue; // braced and in range, waiting
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
      // Grab trajectory (docs/WORLD_PUPPET_MOTOR.md): reach down to the
      // object, grip, then stand up with it. The reach point lands exactly
      // on the object and returns exactly to the carry anchor, so the
      // renderer's hand-follow is continuous throughout.
      if (state.grab) {
        state.grab.t += DT;
        const anchorX = state.x + state.facing * HAND_REST.x * state.scale;
        const anchorY = state.groundY + HAND_REST.y * state.scale;
        const t = state.grab.t;
        const point = t < 0.25
          ? { x: state.grab.x, y: state.grab.y }
          : t < 0.7
            ? (() => {
                const k = smoothstep01((t - 0.25) / 0.45);
                return { x: state.grab!.x + (anchorX - state.grab!.x) * k, y: state.grab!.y + (anchorY - state.grab!.y) * k };
              })()
            : null;
        if (point) {
          state.reach = { tx: point.x, ty: point.y, target: state.grab.propId, contact: true };
        } else {
          state.grab = null;
          state.reach = null;
        }
      }
      // Balance recovery: stagger momentum decays through foot friction.
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
        // Stagger: momentum slides the body, feet catch with friction.
        const direction = Math.sign(state.stagger);
        const slide = Math.min(Math.abs(state.stagger), 140 * DT);
        state.x += direction * slide;
        state.stagger -= direction * slide;
        state.walkPhase = (state.walkPhase + DT * 3) % 1;
        state.lean *= 0.96;
      } else {
        state.stagger = 0;
        state.lean *= 0.9;
        if (!state.reach) state.walkPhase = 0;
      }
      // Body separation (I1): two actors cannot share ground. A mover stops
      // at adjacency — the script says "run at", not "overlap with", so
      // pursuit halts at the other body's edge.
      for (const other of actors.values()) {
        if (other.id === state.id) continue;
        const gap = Math.abs(other.x - state.x);
        const required = BODY_HALF_WIDTH * (state.scale + other.scale);
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
        frames.push({
          x: Math.round(state.x * 100) / 100,
          lean: Math.round(state.lean * 100) / 100,
          facing: state.facing,
          walk: Math.round(state.walkPhase * 1000) / 1000,
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
  actors: Record<string, {at: readonly [number, number]; facing?: number}>;
  objects: Record<string, {at: readonly [number, number]}>;
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
    actorInputs.push({id, x: staged.at[0] * video.width, groundY: staged.at[1] * video.height, facing: staged.facing === -1 ? -1 : 1, scale: (staged as {scale?: number}).scale ?? 1, intents: []});
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
    props: Object.entries(source.objects ?? {}).map(([id, staged]) => ({id, x: staged.at[0] * video.width, y: staged.at[1] * video.height, intents: []})),
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
