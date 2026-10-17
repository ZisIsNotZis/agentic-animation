import {solidSupport,type PropSolid} from "./propGeometry";
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
  intent: "move" | "push" | "grab" | "release"
    | "bow" | "nod" | "shiver" | "point" | "wave" | "raise" | "think" | "fall";
  target?: string;
  /** Stylized force 0..1 for push. */
  force?: number;
  /** Fraction of the intent spent reaching before contact (push). */
  reach?: number;
  /** Object to grab when this move completes (handover receiver). */
  grab?: string;
  /** Earliest ownership beat for a planned handover. */
  contactAt?: number;
  /** Planned physical offer for a holder; internal motor data, not author DSL. */
  offerTo?: string;
  /** Omitted keeps legacy support-aware placement. */
  releaseMode?: "free" | "place";
  /** Seconds of force application after contact (push). */
  forceSec?: number;
  /** The former holder of a released object (from binding tracks). */
  holder?: string;
  /** Acting shape (M5, docs/WORLD_PUPPET_MOTOR.md): seconds the beat holds
   *  while the torso shifts weight opposite the intended motion. */
  anticipation?: number;
  /** Acting shape: 0..1 timing contrast into the key pose (acting hand). */
  accent?: number;
  /** Acting shape: 0..1 decaying overshoot past the key pose (acting hand). */
  settle?: number;
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
  /** Native view geometry for asset-driven figures; legacy figures omit it. */
  skeletonViews?: Record<FigureView,Skeleton>;
  orientations?: Array<{at:number;orientation:string}>;
  poseTracks?: PoseActor["tracks"];
  intents: MotorIntent[];
}

export interface MotorGrip {
  at: [number,number];
  radius: number;
  depth: "front" | "behind";
}

export interface MotorPropInput {
  solid?: PropSolid;
  grip?: MotorGrip;
  rotation?: number;
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
  skeletonPose?: SkeletonPose;
  worldFootTargets?: {l:[number,number];r:[number,number]};
  footSupport?: {l:boolean;r:boolean};
  orientation?:string;
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
  /** Outgoing unloaded reach weight; absent means authoritative contact. */
  reachInfluence?: number;
  gripDepth?: "front" | "behind";
  /** Waist pitch in degrees (physics-driven bend for reaches). */
  waist?: number;
  /** Crouch amount 0..1 (knees bend, hip drops by CROUCH_DROP). */
  crouch?: number;
  /** The prop currently bound to this actor's hand. */
  holds?: string;
}

export interface MotorPropFrame {
  rotation?: number;
  x: number;
  y: number;
  /** Set while the prop is falling under gravity after a release. */
  falling?: boolean;
}

export interface MotorTrajectory {
  diagnostics?: string[];
  actors: Record<string, MotorActorFrame[]>;
  props: Record<string, MotorPropFrame[]>;
}

import { circleOverlapsBox, solveSkeleton, solveArmIK,legDropInterval,nativeCrouchDrop,type SkeletonPose } from "./skeleton";
import {accentSpeed, anticipationEnvelope, anticipationLean, settleOffset, smoothstep01,
  ANTICIPATION_LEAN, ANTICIPATION_MAX_SEC} from "./acting";
import {solveActorFigure,type PoseActor} from './actorPose';
import {resolveWholeBodyProposal,type WholeBodyState,type OwnershipEvent} from './wholeBodyProposal';
import type { Skeleton } from "../schemas/libraryMeta";
import {figureViewForOrientation, type FigureView} from "../schemas/figureArtwork";

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
/** Native crouch keeps at least half of each declared leg chain extended.
 * Motor and renderer must use this same design-space hip drop. */
export {nativeCrouchDrop} from "./skeleton";

const WAIST_RATE = 120; // deg/s
const CROUCH_RATE = 1.6; // fraction/s
/** Gravity for released props (stage px/s²). */
const GRAVITY = 2600;
/** Hand drive acceleration/top speed per unit force (stage px/s², px/s). */
const HAND_ACC = 1500;
const HAND_MAX = 560;
/** Gesture envelopes (slice 3 vocabulary): stylized joint-space magnitudes —
 *  the invariants (planted support, no contact) are what matter. */
const BOW_PITCH = 28; // deg forward at the waist
const NOD_PITCH = 7.5; // deg per dip
const SHIVER_AMP = 2.4; // deg lean oscillation
const SHIVER_HZ = 9;
/** Slice 4 fall (balance-cut collapse, shared FK — not a ragdoll). */
const FALL_PITCH = 80; // deg waist hinge at full collapse
const FALL_DUR = 0.75; // s collapse span

/** Per-actor body geometry, all derived from the declared skeleton. */
interface ActorBody {
  /** Torso half-width in design px (torso box). */
  halfWidth: number;
  crouchDrop: number;
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

function bodyOf(skeleton: Skeleton, native = false): ActorBody {
  const torso = skeleton.parts.torso as {box?: [[number, number], [number, number]]} | undefined;
  if (!torso?.box) throw new Error("motor: figure skeleton lacks a torso box part");
  const shoulder = skeleton.joints.shoulder_r;
  const waist = skeleton.joints.waist;
  if (!shoulder || !waist) throw new Error("motor: figure skeleton lacks shoulder_r/waist joints");
  const rest = solveSkeleton(skeleton, {});
  const restHand = rest.hands.hand_r?.center ?? [waist[0] + 92, waist[1] - 300];
  return {
    crouchDrop: native ? nativeCrouchDrop(skeleton) : CROUCH_DROP,
    halfWidth: native
      ? Math.max(Math.abs(torso.box[1][0] - torso.box[0][0]) / 2,
          ...((skeleton.parts.head as {box?: [[number, number], [number, number]]})?.box ?? []).map(p => Math.abs(p[0] - (skeleton.space?.width ?? 400) / 2))) + skeleton.arm.handRadius
      : Math.abs(torso.box[1][0] - torso.box[0][0]) / 2,
    torsoTop: Math.min(torso.box[0][1], torso.box[1][1]),
    torsoBottom: Math.max(torso.box[0][1], torso.box[1][1]),
    armReach: skeleton.arm.upper + skeleton.arm.fore + (native ? 0 : skeleton.arm.handRadius),
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
  const wy = groundY - (body.groundToWaist - body.crouchDrop * crouch) * scale;
  const d: [number, number] = [facing * body.shoulderFromWaist[0] * scale, body.shoulderFromWaist[1] * scale];
  const r = ((facing * pitchDeg) * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [wx + d[0] * c - d[1] * s, wy + d[0] * s + d[1] * c];
}

/** World-space rest hand (design rest hand mapped through facing + crouch drop). */
function restHandAt(state: ActorState): [number, number] {
  const k = state.scale;
  if (state.skeletonViews) {
    const facing = geometryFacing(state);
    const d = [state.body.restHand[0]-state.body.waist[0],state.body.restHand[1]-state.body.waist[1]];
    const r = (state.waist+state.lean)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
    return [state.x+facing*(d[0]!*c-d[1]!*s)*k,state.groundY-state.body.groundToWaist*k+(d[0]!*s+d[1]!*c+state.body.crouchDrop*state.crouch)*k];
  }
  return [
    state.x + (state.body.restHand[0] - state.body.waist[0]) * state.facing * k,
    // Height above ground of a design point = spaceHeight - design y (crouch
    // lowers the whole body).
    state.groundY - (state.body.spaceHeight - state.body.restHand[1] - state.body.crouchDrop * state.crouch) * k,
  ];
}


function rotateVector(v: [number,number], deg: number): [number,number] {
  const r=deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return [v[0]*c-v[1]*s,v[0]*s+v[1]*c];
}
function angleDelta(deg: number): number { return ((deg+180)%360+360)%360-180; }
/** Same native IK branch/rest vectors as the renderer, in the torso frame. */
function wristDirection(state: ActorState, hand: [number,number]): number {
  const sk=state.skeleton!;const facing=geometryFacing(state);
  const w=sk.joints.waist!,sh=sk.joints.shoulder_r!,e=sk.joints.elbow_r!,h=sk.joints.hand_r!;
  const pitch=state.waist+state.lean;
  const design: [number,number]=[w[0]+facing*(hand[0]-state.x)/state.scale,sk.space.height+(hand[1]-state.groundY)/state.scale-state.body.crouchDrop*state.crouch];
  const rel=rotateVector([design[0]-w[0],design[1]-w[1]],-pitch);
  const u: [number,number]=[e[0]-sh[0],e[1]-sh[1]],v: [number,number]=[h[0]-e[0],h[1]-e[1]];
  const ik=solveArmIK({x:w[0]+rel[0],y:w[1]+rel[1]},{shoulder:sh,upper:sk.arm.upper,fore:sk.arm.fore,upperDir:u,foreDir:v},1,u[0]*v[1]-u[1]*v[0]<0?-1:1);
  const a=(Math.atan2(v[1],v[0])*180/Math.PI+ik.upper+ik.lower+pitch)*Math.PI/180;
  return Math.atan2(Math.sin(a),facing*Math.cos(a))*180/Math.PI;
}

function approach(current: number, goal: number, maxDelta: number): number {
  return current < goal ? Math.min(goal, current + maxDelta) : Math.max(goal, current - maxDelta);
}

/** Slow the final native hip rise before planted leg IK reaches extension. */
function recoverCrouch(state: ActorState, dt = DT): number {
  if (!state.skeletonViews) return approach(state.crouch, 0, CROUCH_RATE * dt);
  const minimum=state.supportMinimum??0;
  if (state.crouch-minimum < .0001) return minimum;
  return approach(state.crouch, minimum, Math.min(CROUCH_RATE * dt, (state.crouch-minimum) * dt / .12));
}

/** Finite travel, shared by incoming contact and outgoing withdrawal. */
function travelHand(from: [number, number], to: [number, number], settleSec = 0, speed = 480, dt = DT): [number, number] {
  const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const fraction = distance === 0 ? 1 : Math.min(1, speed * dt / distance, settleSec ? dt / settleSec : 1);
  return [from[0] + (to[0] - from[0]) * fraction, from[1] + (to[1] - from[1]) * fraction];
}

/** Bow envelope: bend in over the first 45%, hold to 62%, return upright. */
function bowEnvelope(t: number, dur: number): number {
  const t1 = dur * 0.45, t2 = dur * 0.62;
  return t < t1 ? smoothstep01(t / t1) : t < t2 ? 1 : smoothstep01(Math.max(0, 1 - (t - t2) / (dur - t2)));
}

/** Nod envelope: two full dips across the duration (0→1→0→1→0). */
function nodEnvelope(t: number, dur: number): number {
  return 0.5 - 0.5 * Math.cos((t / dur) * 4 * Math.PI);
}

function nativeCadence(state:ActorState):number {
  if(!state.skeletonViews||!state.skeleton)return 2.2;
  const sk=state.skeleton;
  const leg=Math.min(...(['l','r'] as const).map(side=>{
    const h=sk.joints[`hip_${side}`]!,k=sk.joints[`knee_${side}`]!,f=sk.joints[`foot_${side}`]!;
    return Math.hypot(k[0]-h[0],k[1]-h[1])+Math.hypot(f[0]-k[0],f[1]-k[1]);
  }));
  return WALK_SPEED/(leg*state.scale*.8);
}
/** Persistent world anchors: no target is rewritten while its foot is stance. */
function advanceSupport(state:ActorState,previousX:number,dt:number):void {
  if(!state.skeletonViews||!state.skeleton)return;
  const sk=state.skeleton,k=state.scale,dir=geometryFacing(state);
  const rest=(side:'l'|'r',x:number):[number,number]=>{
    const f=sk.joints[`foot_${side}`]!;
    return [x+dir*(f[0]-sk.space.width/2)*k,state.groundY+(f[1]-sk.space.height)*k];
  };
  if(!state.feet)state.feet=Object.fromEntries((['l','r'] as const).map(side=>{
    const target=rest(side,previousX);return [side,{target,from:target,landing:target,swing:false}];
  })) as NonNullable<ActorState['feet']>;
  const velocity=(state.x-previousX)/dt;
  // At an idle half-cycle boundary, land the outgoing swing before deciding
  // whether another foot needs a step. Stance anchors are never rewritten.
  if(state.moveTarget===null&&Math.abs(state.stagger)<=1&&
      (state.walkPhase===.5||state.walkPhase===1)){
    const outgoing=state.walkPhase===.5?'l':'r';
    const foot=state.feet[outgoing];
    if(foot.swing){foot.target=[...foot.landing];foot.swing=false;}
    const settled=(['l','r'] as const).every(side=>{
      const foot=state.feet![side],target=rest(side,state.x);
      return !foot.swing&&Math.hypot(foot.target[0]-target[0],foot.target[1]-target[1])<.02;
    });
    if(settled)state.walkPhase=0;
  }
  const phase=state.walkPhase;
  let minimum=0,hardMinimum=0;
  for(const side of ['l','r'] as const){
    const foot=state.feet[side],local=side==='l'?phase%1:(phase+.5)%1;
    const swing=phase>0&&local<.5;
    if(swing&&!foot.swing){
      foot.from=[...foot.target];
      const remaining=state.moveTarget===null?0:state.moveTarget-state.x;
      const ahead=Math.sign(velocity)*Math.min(Math.abs(remaining),Math.abs(velocity)*(.75-local)/nativeCadence(state));
      foot.landing=rest(side,state.x+ahead);
    }
    if(swing){
      const t=local*2,blend=smoothstep01(t);
      foot.target=[foot.from[0]+(foot.landing[0]-foot.from[0])*blend,
        foot.from[1]+(foot.landing[1]-foot.from[1])*blend-Math.sin(Math.PI*t)**2*22*k];
    }else if(foot.swing){
      if(state.fallen){
        // A fallen body cannot snap its swing foot down: glide it to the
        // landing at a bounded rate while the collapse continues underneath.
        foot.target=[approach(foot.target[0],foot.landing[0],480*dt),
          approach(foot.target[1],foot.landing[1],480*dt)];
        if(Math.hypot(foot.target[0]-foot.landing[0],foot.target[1]-foot.landing[1])<.5){
          foot.target=[...foot.landing];
        }
      }
      else foot.target=[...foot.landing];
    }
    // The fallen glide keeps its own swing flag until the foot lands (the
    // frozen walk phase would otherwise declare a mid-air foot stance, and a
    // supported mid-air sole is exactly what the proposal must reject).
    foot.swing=state.fallen
      ?(foot.swing&&Math.hypot(foot.target[0]-foot.landing[0],foot.target[1]-foot.landing[1])>=.01)
      :swing;
    const target:[number,number]=[sk.space.width/2+dir*(foot.target[0]-state.x)/k,
      sk.space.height+(foot.target[1]-state.groundY)/k];
    const interval=legDropInterval(sk,side,target);
    if(!interval){state.supportMinimum=Infinity;return;}
    const required=interval[0]/state.body.crouchDrop;
    const reserve=phase>0?12/state.body.crouchDrop:0;
    hardMinimum=Math.max(hardMinimum,required);
    minimum=Math.max(minimum,required+reserve);
  }
  state.crouch=Math.max(hardMinimum,state.crouch,approach(state.crouch,minimum,CROUCH_RATE*dt));
  state.supportMinimum=Math.min(state.crouch,minimum);
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
  skeletonViews?: Record<FigureView,Skeleton>;
  orientation?: string;
  /** Current waist pitch in deg (0 = upright). */
  waist: number;
  /** Crouch 0..1. */
  crouch: number;
  walkPhase: number;
  supportMinimum?:number;
  feet?:Record<'l'|'r',{target:[number,number];from:[number,number];landing:[number,number];swing:boolean}>;
  skeletonPose?:SkeletonPose;
  lean: number;
  /** Motor-driven destination while a move intent is active. */
  moveTarget: number | null;
  /** Prop id a completed move intent should grab (transient). */
  grabTarget?: string | null;
  grabContactAt?: number;
  offer?: {recipient: string; prop: string; until: number};
  /** Active grab controller: reach/bend/crouch until the hand physically
   * touches the object's declared body box — then bind (I4). `span` is the
   * first-seen hand-to-aim distance the accent shape measures against. */
  grab: {propId: string; t: number; notBefore?: number; accent: number; span?: number} | null;
  /** Acting-shape accent carried from the intent to the grab it arms. */
  grabAccent?: number;
  /** Acting-shape pre-roll in flight (M5 anticipation): the beat waits while
   *  the torso shifts weight opposite the intended motion. */
  prep: {t: number; dur: number; peak: number; sign: 1 | -1} | null;
  /** The prop bound to the hand; position = hand every substep until release. */
  holding: string | null;
  carryShoulder?:[number,number];
  reachShoulder?:[number,number];
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
  /** Preserve the outgoing contact hand until it has returned to rest. */
  retract: boolean;
  retractInfluence: number;
  retractElapsed: number;
  retractDuration: number;
  wristAtBind: number;
  propAngleAtBind: number;
  /** Impulse queue for stagger momentum. */
  stagger: number;
  /** Recovery steps taken for the current stagger event. */
  stepsTaken: number;
  /** True on the substep a recovery step plants (baked as a frame marker). */
  stepPlanted?: boolean;
  /** Accumulated slide for the current stagger event (px). */
  staggerSlide: number;
  /** Slice 4 fall: the active collapse envelope; `fallen` keeps the body
   *  down (get-up is out of scope) and blocks every balance recovery. */
  fall: {t: number; dur: number; dir: 1 | -1} | null;
  fallen: boolean;
  /** Torso-pitch gesture in flight (bow/nod/shiver): the waist/lean follows a
   *  fixed envelope; weight stays planted, nothing translates or contacts. */
  gesture: {kind: "bow" | "nod" | "shiver"; t: number; dur: number} | null;
  /** Reach gesture in flight (point/wave/raise/think): the hand travels to a
   *  fixed aim at real hand speed, holds, then returns via the shared retract. */
  handGesture: {
    kind: "point" | "wave" | "raise" | "think"; target: string; t: number; dur: number;
    /** Hand position when the beat started: the accent/settle span origin. */
    from: [number, number];
    accent: number;
    settle: number;
    /** Beat time the hand first reached the key pose (settle starts here). */
    keyAt: number | null;
  } | null;
}

interface PropState {
  solid?: PropSolid;
  grip?: MotorGrip;
  rotation: number;
  carryVelocity: [number,number];
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
function propOpenHand(state: ActorState, props: Map<string, PropState>, free = false): void {
  const heldProp = state.holding ? props.get(state.holding) : undefined;
  if (heldProp) {
    heldProp.falling = true;
    heldProp.vx = free ? heldProp.carryVelocity[0] : 0;
    heldProp.vy = free ? heldProp.carryVelocity[1] : Math.max(0, -heldProp.vy);
  }
  state.holding = null;
  state.holdRel = null;
  state.grip = null;
  state.gripGoal = null;
  state.place = null;
  state.retract = state.reach !== null;
}

/** Slice 4 fall (docs/WORLD_PUPPET_MOTOR.md): balance is cut — stepping,
 *  posture recovery, drives and gestures end; the collapse envelope drops the
 *  body through the shared FK and it stays down (get-up is out of scope). */
function startFall(state: ActorState, dir: 1 | -1, dur = FALL_DUR): void {
  if (state.fall || state.fallen) return;
  // A mid-swing foot is NOT snapped to its landing here: the walk phase
  // freezes and advanceSupport glides the swing down at a bounded rate (an
  // instant landing snaps the shin IK and the whole-body proposal correctly
  // rejects it).
  state.walkPhase = 0;
  state.fall = {t: 0, dur, dir};
  state.fallen = true;
  state.staggerSlide = 0;
  // The failed final catch: the last momentum fraction a recovery step would
  // have caught is absorbed by the collapse itself (the ground catches what
  // the feet no longer can).
  state.stagger -= Math.sign(state.stagger) * Math.abs(state.stagger) * state.body.catchFraction;
  state.handDrive = null;
  state.gesture = null;
  state.handGesture = null;
  state.grab = null;
  state.grabTarget = null;
  state.pursue = null;
  state.moveTarget = null;
  // Balance is cut: a preparation cannot finish and nothing settles.
  state.prep = null;
  // An in-flight reach retracts through the shared path — no arm snap.
  state.retract = state.retract || state.reach !== null;
}

/** Walk arrival hooks: a pending grab starts, and a push drive takes over
 *  from the walk. Shared by the normal arrival and the clamp-pinned arrival. */
function geometryFacing(state: ActorState): 1|-1 {
  if (!state.skeletonViews || !state.orientation || state.orientation==='front' || state.orientation==='back') return state.facing;
  return state.orientation==='left' || state.orientation.endsWith('-left') ? -1 : 1;
}
function geometryShoulder(state: ActorState, pitch=state.waist, crouch=state.crouch): [number,number] {
  return shoulderAt(state.x,state.groundY,state.scale,geometryFacing(state),state.body,pitch+(state.skeletonViews?state.lean:0),crouch);
}

function arriveMotorWalk(
  state: ActorState,
  actors: Map<string, ActorState>,
  props: Map<string, PropState>,
): void {
  state.vx = 0;
  const propId = state.grabTarget;
  if (propId) {
    const prop = props.get(propId);
    if (prop && !state.holding && !state.grab) state.grab = {propId, t: 0, notBefore:state.grabContactAt, accent: state.grabAccent ?? 0};
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
  let diagnostics: string[] = [];
  let exhaustedActors = new Set<string>();
  let actors = new Map<string, ActorState>(
    scene.actors.map((actor) => [actor.id, {
      id: actor.id, x: actor.x, vx: 0, facing: actor.facing, groundY: actor.groundY, scale: actor.scale,
      walkPhase: 0, lean: 0, moveTarget: null, grab: null, holding: null, holdRel: null, handDrive: null, reach: null, retract: false, retractInfluence: 1, retractElapsed: 0, retractDuration: .65, wristAtBind: 0, propAngleAtBind: 0, grip: null, gripGoal: null, pursue: null, place: null,
      stagger: 0, stepsTaken: 0, staggerSlide: 0, gesture: null, handGesture: null, prep: null, fall: null, fallen: false, body: bodyOf((actor.skeletonViews?.front??actor.skeleton) as Skeleton,actor.skeletonViews!==undefined),
      skeleton: actor.skeletonViews?.front??actor.skeleton, skeletonViews:actor.skeletonViews, orientation:actor.skeletonViews?'front':undefined, waist: 0, crouch: 0,
    }]),
  );
  let props = new Map<string, PropState>(
    scene.props.map((prop) => [prop.id, { id: prop.id, x: prop.x, y: prop.y, vx: 0, vy: 0, falling: false, size: prop.size, solid: prop.solid, touchBox: prop.touchBox, grip: prop.grip, rotation: prop.rotation ?? 0, carryVelocity: [0,0] }]),
  );

  for(const input of scene.actors){
    if(!input.skeletonViews)continue;
    const state=actors.get(input.id)!;
    state.orientation=(input.orientations??[]).filter(o=>o.at<=0).at(-1)?.orientation??'front';
    state.skeleton=input.skeletonViews[figureViewForOrientation(state.orientation)];
    state.body=bodyOf(state.skeleton,true);
    const first=input.intents.find(i=>i.at<=0&&!i.offerTo&&(i.intent==='grab'||i.intent==='move'));
    const target=first?.target?scene.resolveX(first.target):undefined;
    if(target!==undefined)state.facing=(Math.sign(target-state.x)||state.facing) as 1|-1;
  }

  // Intent queues per actor, in start order.
  let queues = new Map<string, MotorIntent[]>();
  for (const actor of scene.actors) {
    queues.set(actor.id, [...actor.intents].sort((a, b) => a.at - b.at));
  }

  const actorFrames = new Map<string, MotorActorFrame[]>(scene.actors.map((actor) => [actor.id, []]));
  const propFrames = new Map<string, MotorPropFrame[]>(scene.props.map((prop) => [prop.id, []]));

  const propBoxWorld = (prop: PropState): {a: [number, number]; b: [number, number]} =>
    prop.touchBox
      ? {a: [prop.x + prop.touchBox.a[0], prop.y + prop.touchBox.a[1]], b: [prop.x + prop.touchBox.b[0], prop.y + prop.touchBox.b[1]]}
      : {a: [prop.x - prop.size[0] / 2, prop.y - prop.size[1]], b: [prop.x + prop.size[0] / 2, prop.y]};
  const propAim = (prop: PropState, grip = false): [number, number] => {
    if (grip && prop.grip) { const offset=rotateVector(prop.grip.at,prop.rotation);return [prop.x+offset[0],prop.y+offset[1]]; }
    const box = propBoxWorld(prop);
    return [(box.a[0] + box.b[0]) / 2, (box.a[1] + box.b[1]) / 2];
  };
  /** The hand point for an actor reaching toward an aim at a given posture. */
  const handTargetAt = (state: ActorState, aim: [number, number], pitch: number, crouch: number, x=state.x): [number, number] => {
    const k = state.scale;
    const sh = geometryShoulder(state,pitch,crouch);
    sh[0] += x-state.x;
    const dx = aim[0] - sh[0];
    const dy = aim[1] - sh[1];
    const d = Math.hypot(dx, dy) || 1;
    const ext = Math.min(d, state.body.armReach * k);
    return [sh[0] + (dx / d) * ext, sh[1] + (dy / d) * ext];
  };
  /** The relaxed carry pose: hand down-forward of the shoulder at 60% reach. */
  const carryHandAt = (state: ActorState): [number, number] => {
    const k = state.scale;
    const sh = geometryShoulder(state);
    const d = Math.hypot(0.35, 0.94);
    return [sh[0] + (0.35 / d) * state.body.armReach * k * 0.6 * geometryFacing(state), sh[1] + (0.94 / d) * state.body.armReach * k * 0.6];
  };
  const supportPoint = (prop:PropState) => prop.solid ? solidSupport(prop.solid,prop.rotation) : {x:0,y:0};
  const supportYAt = (x: number, currentY: number): number => {
    let best = scene.groundY ?? scene.actors[0]?.groundY ?? 720;
    for (const surface of scene.supports ?? []) {
      if (x >= surface.x0 && x <= surface.x1 && surface.y >= currentY - 2 && surface.y < best) best = surface.y;
    }
    return best;
  };

  const presentationSampling = scene.actors.some(actor => actor.skeletonViews !== undefined);

  /** The world-x direction the intent moves the actor toward (0 = the beat has
   *  no direction of its own, e.g. a bow). */
  const intentDirection = (state: ActorState, intent: MotorIntent): 1 | 0 | -1 => {
    if (intent.target === undefined) return 0;
    const tx = actors.get(intent.target)?.x ?? props.get(intent.target)?.x ?? scene.resolveX(intent.target);
    return tx === undefined ? 0 : (Math.sign(tx - state.x) || 0) as 1 | 0 | -1;
  };
  /**
   * M5 anticipation (docs/WORLD_PUPPET_MOTOR.md): a shaped beat holds for its
   * pre-roll while the torso shifts weight opposite the intended motion, then
   * starts. The intent is re-queued with its preparation spent, so every
   * existing beat path runs unmodified and 0 stays the pre-M5 timing.
   */
  const startAnticipation = (state: ActorState, intent: MotorIntent, now: number, queue: MotorIntent[]): boolean => {
    const sec = Math.min(ANTICIPATION_MAX_SEC, Math.max(0, Number(intent.anticipation ?? 0)));
    // A fall has no balance to prepare, and a planned offer is bilateral
    // (its cue timing is agreed with the receiver), so neither is delayed.
    if (!(sec > 0) || intent.intent === "fall" || intent.offerTo || state.fallen || state.fall) return false;
    const {peak, clamped} = anticipationLean(sec, WAIST_RATE);
    if (!(peak > 0)) return false;
    const motion = intentDirection(state, intent);
    if (motion !== 0) state.facing = motion;
    // The baked lean is drawn in the facing frame: -peak is backward unless the
    // actor travels against its drawn facing (an explicit native orientation).
    const sign = (motion === 0 ? -1 : -(motion * geometryFacing(state))) as 1 | -1;
    state.prep = {t: 0, dur: sec, peak, sign};
    queue.push({...intent, at: now + sec, anticipation: 0});
    queue.sort((a, b) => a.at - b.at);
    if (clamped) {
      diagnostics.push(`anticipation clamped: ${state.id} ${intent.intent} at ${now.toFixed(3)}s; a ${sec}s pre-roll reaches ${peak.toFixed(1)}deg of the ${ANTICIPATION_LEAN}deg lean at the ${WAIST_RATE}deg/s waist rate`);
    }
    return true;
  };
  interface LiveState extends WholeBodyState {
    controllers:{actors:Map<string,ActorState>;props:Map<string,PropState>;queues:Map<string,MotorIntent[]>;
      diagnostics:string[];exhaustedActors:Set<string>};
  }
  const capture=(time:number):LiveState=>{
    const nativeActors:WholeBodyState['actors']={};
    for(const state of actors.values()){
      if(!state.skeletonViews||!state.skeleton)continue;
      if(!state.feet)advanceSupport(state,state.x,DT);
      const sk=state.skeleton,input=scene.actors.find(a=>a.id===state.id)!;
      const actor:PoseActor={id:state.id,x:state.x,y:state.groundY,scale:state.scale,flip:state.facing===-1,
        orientation:state.orientation,skeleton:sk,artwork:true,motor:true,lean:state.lean,
        walk:state.walkPhase,waist:state.waist,crouch:state.crouch,contact:state.reach?.contact,
        ...(state.reach?{reach:[state.reach.tx,state.reach.ty] as [number,number],
          ...(state.retract?{reachInfluence:state.retractInfluence}:{})}:{}),
        worldFootTargets:{l:state.feet!.l.target,r:state.feet!.r.target},
        expression:{gaze:[0,0],lipsPart:0,smile:0},
        tracks:(input.poseTracks??[]).map(track=>({...track,events:track.events.map(event=>{
          const frame=time*FPS,start=Number(event.frame??0),end=Number(event.endFrame??start+1);
          return {...event,progress:Math.max(0,Math.min(1,(frame-start)/(end-start))),active:frame>=start&&frame<end};
        })})),
      };
      const figure=solveActorFigure(actor);state.skeletonPose=figure.skeletonPose;state.reachShoulder=geometryShoulder(state);
      nativeActors[state.id]={skeleton:sk,x:state.x,y:state.groundY,scale:state.scale,
        flipped:figure.flipped,pose:figure.skeletonPose,footTargets:actor.worldFootTargets!,
        support:{l:state.feet!.l.swing?null:state.feet!.l.target,r:state.feet!.r.swing?null:state.feet!.r.target},
        soleOffset:{l:(sk.space.height-sk.joints.foot_l![1])*state.scale,r:(sk.space.height-sk.joints.foot_r![1])*state.scale},
        ...(state.reach&&!state.retract?{palmTarget:[state.reach.tx,state.reach.ty] as [number,number]}:{}),
      };
    }
    return {actors:nativeActors,props:Object.fromEntries([...props].map(([id,p])=>{
      const owner=[...actors.values()].find(a=>a.holding===id&&a.skeletonViews);
      const offset=owner?.grip?rotateVector([-owner.grip.ox,-owner.grip.oy],-owner.propAngleAtBind):undefined;
      return [id,{x:p.x,y:p.y,rotation:p.rotation,...(owner?{owner:owner.id,
        socket:p.grip?.at??offset,radius:p.grip?.radius??1.6}:{})}];
    })),controllers:{actors,props,queues,diagnostics,exhaustedActors}};
  };
  let lastPresentation:LiveState|undefined,lastPresentationTime:number|undefined;
  const totalSubsteps = frameCount * SUBSTEPS;
  for (let step = 0; step < totalSubsteps; step++) {
    const now = step * DT;
    const previousProps=new Map([...props].map(([id,p])=>[id,[p.x,p.y] as [number,number]]));

    const advanceSubstep=(delta:number)=>{
    // Asset projections are body state, just like their renderer orientation.
    // Updating the collider/reach model before control keeps palms and physics
    // on the same native drawing without changing legacy figure trajectories.
    for (const input of scene.actors) {
      if (!input.skeletonViews) continue;
      const state=actors.get(input.id)!;
      const orientation=[...(input.orientations??[])].sort((a,b)=>a.at-b.at).filter((o)=>o.at<=now).at(-1)?.orientation??'front';
      if (orientation===state.orientation) continue;
      state.orientation=orientation;
      state.skeleton=input.skeletonViews[figureViewForOrientation(orientation)];
      state.body=bodyOf(state.skeleton,true);
    }
    // Start intents whose time has come.
    for (const [id, queue] of queues) {
      const state = actors.get(id)!;
      while (queue.length && queue[0]!.at <= now) {
        const intent = queue.shift()!;
        // M5 anticipation: the beat waits out its pre-roll and is re-queued.
        if (startAnticipation(state, intent, now, queue)) continue;
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
              // Explicit native views need the signed shoulder, not a legacy
              // facing-based distance that can strand short arms behind a prop.
              state.moveTarget = state.skeletonViews
                ? tx - geometryFacing(state) * state.body.shoulderFromWaist[0] * state.scale
                : tx - dir * shoulderFromCenter * state.scale * 0.92;
              if (state.skeletonViews && isProp) {
                const prop = props.get(intent.target!)!;
                const aim = propAim(prop,true), box = propBoxWorld(prop);
                if (prop.grip) state.moveTarget=aim[0]-geometryFacing(state)*state.body.shoulderFromWaist[0]*state.scale;
                const candidate = state.moveTarget;
                let reachable = false;
                for (let c = 0; c <= 1.0001 && !reachable; c += 0.25) {
                  for (let p = -SPINE_MAX; p <= SPINE_MAX && !reachable; p += 5) {
                    const hand = handTargetAt(state, aim, p, c, candidate);
                    reachable = prop.grip ? Math.hypot(hand[0]-aim[0],hand[1]-aim[1])<=prop.grip.radius : circleOverlapsBox({center:hand,radius:state.body.handRadius*state.scale},box);
                  }
                }
                if (!reachable) {
                  const bent = geometryShoulder(state, SPINE_MAX, 1);
                  state.moveTarget = aim[0] - (bent[0]-state.x);
                }
              }
              // The grabbed object: the move target for prop pickups, or the
              // declared `grab` for receiver moves (handover).
              state.grabTarget = intent.grab ?? (isProp ? intent.target! : null);
              state.grabContactAt = intent.contactAt;
              state.grabAccent = Math.min(1, Math.max(0, Number(intent.accent ?? 0)));
              // A moving actor target is pursued LIVE (the staged stop point
              // goes stale the moment the target walks). A self-target is not
              // pursued — resolveX already returned the actor's staged mark,
              // and live self-pursuit would overwrite it with the actor's own
              // position, turning "return to your mark" into a no-op.
              state.pursue = !isProp && actors.has(intent.target!) && intent.target !== state.id ? intent.target! : null;
            } else {
              state.moveTarget = tx;
              state.grabTarget = null;
              state.pursue = actors.has(intent.target!) && intent.target !== state.id ? intent.target! : null;
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
          if (intent.offerTo) {
            state.offer={recipient:intent.offerTo,prop:targetId,until:(intent.contactAt??now)+intent.duration};
            if(state.skeletonViews&&state.reach&&state.holding){
              const sh=geometryShoulder(state);
              state.holdRel={from:[state.reach.tx-sh[0],state.reach.ty-sh[1]],t:0,dur:.65};
            }
            continue; // An offer never acquires or steals a prop.
          }
          if (state.holding !== targetId && state.grab?.propId !== targetId) {
            const prop = props.get(targetId);
            const accent = Math.min(1, Math.max(0, Number(intent.accent ?? 0)));
            if (prop && state.moveTarget === null) state.grab = {propId: targetId, t: 0, notBefore:intent.contactAt, accent};
            else if (prop) { state.grabTarget = targetId; state.grabAccent = accent; } // grab on arrival
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
              .filter((s) => prop.x + supportPoint(prop).x >= s.x0 && prop.x + supportPoint(prop).x <= s.x1 && s.y < scene.groundY!)
              .reduce((best, s) => Math.min(best, s.y), scene.groundY ?? 720);
            if (intent.releaseMode !== "free" && surface < prop.y + supportPoint(prop).y - 4) {
              state.place = surface;
            } else {
              propOpenHand(state, props, intent.releaseMode === 'free');
            }
          }
        } else if (intent.intent === "bow" || intent.intent === "nod" || intent.intent === "shiver") {
          // Torso-pitch gesture: the envelope is the whole motion — planted
          // support (I1), no contact (I2), no translation. A new gesture
          // supersedes an in-flight reach, which retracts through the shared path.
          state.handGesture = null;
          if (state.reach && !state.holding) state.retract = true;
          state.gesture = {kind: intent.intent, t: 0, dur: Math.max(0.2, intent.duration)};
        } else if (intent.intent === "point" || intent.intent === "wave" || intent.intent === "raise" || intent.intent === "think") {
          // Reach gesture: face the aim first (a hand cannot honestly point
          // where the body refuses to look); the hand then travels there at
          // real hand speed — no snap, no remote effect.
          state.gesture = null;
          if (intent.intent !== "think") {
            const tx = intent.target !== undefined ? scene.resolveX(intent.target) : undefined;
            if (tx !== undefined) state.facing = (Math.sign(tx - state.x) || state.facing) as 1 | -1;
          }
          state.handGesture = {kind: intent.intent, target: intent.target ?? "", t: 0, dur: Math.max(0.3, intent.duration),
            from: state.reach ? [state.reach.tx, state.reach.ty] : restHandAt(state),
            accent: Math.min(1, Math.max(0, Number(intent.accent ?? 0))),
            settle: Math.min(1, Math.max(0, Number(intent.settle ?? 0))),
            keyAt: null};
        } else if (intent.intent === "fall") {
          // Fall-classified event (slice 4): balance cuts directly; the
          // authored duration scales the collapse span (face the target first,
          // same as the reach gestures — a body falls where it faces).
          const tx = intent.target !== undefined ? scene.resolveX(intent.target) : undefined;
          if (tx !== undefined) state.facing = (Math.sign(tx - state.x) || state.facing) as 1 | -1;
          startFall(state, state.facing, clamp(Number(intent.duration) || FALL_DUR, 0.35, 1.5));
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
      drive.t += delta;
      const targetActor = actors.get(drive.target);
      const targetProp = props.get(drive.target);
      const targetX = targetActor?.x ?? targetProp?.x;
      if (targetX === undefined) { state.handDrive = null; continue; }
      if (drive.t > (drive.contactT ?? 0) + drive.sec + (drive.contactT === null ? 1.2 : 0.45)) {
        // Force window over: the arm relaxes back to rest and the brace lean
        // releases, both at honest rates (not an unbounded ease).
        const rest = restHandAt(state);
        const blend = clamp((drive.t - drive.sec - 0.45) / 0.3, 0, 1);
        state.lean = approach(state.lean, 0, WAIST_RATE * delta);
        drive.hand = travelHand(drive.hand, rest, 0, 480 * (1 - blend), delta);
        if (blend >= 1) {
          // Hand off to the shared retract: clearing the reach outright would
          // snap the extended arm to the authored rest pose in one substep
          // (57° forearm swing — the whole-body proposal correctly rejects it;
          // repaired pre-existing defect).
          state.handDrive = null;
          state.retract = state.reach !== null;
          continue;
        }
        state.reach = {tx: drive.hand[0], ty: drive.hand[1], target: drive.target, contact: false};
        continue;
      }
      const dir = (Math.sign(targetX - state.x) || state.facing) as 1 | -1;
      state.facing = dir;
      // Contact geometry: the target's declared torso box / prop body box.
      const targetBody = targetActor?.body;
      const targetBox = targetActor && targetBody
        ? {
            a: [targetActor.x - targetBody.halfWidth * targetActor.scale, targetActor.groundY - (targetBody.groundToWaist - targetBody.crouchDrop * targetActor.crouch + (targetBody.waist[1] - targetBody.torsoTop)) * targetActor.scale] as [number, number],
            b: [targetActor.x + targetBody.halfWidth * targetActor.scale, targetActor.groundY - (targetBody.groundToWaist - targetBody.crouchDrop * targetActor.crouch) * targetActor.scale] as [number, number],
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
        const impulse = drive.force * 680 * delta;
        if (targetActor) {
          targetActor.stagger += impulse;
          targetActor.facing = (-dir) as 1 | -1; // pushed body faces the pusher
        } else if (targetProp) {
          targetProp.vx += dir * impulse * 6;
        }
        // I3 reaction: the pusher leans back against the exertion — easing at
        // the waist rate; a body cannot snap 28° in one substep (the snap
        // yanked the taut hand and froze the whole-body proposal).
        state.lean = approach(state.lean, -dir * REACTION_LEAN * drive.force, WAIST_RATE * delta);
      }
      // Hand motion: accelerate toward the target; brace on contact. The
      // drive hand obeys the same 480 px/s honest-travel cap as every other
      // hand motion (grab/withdraw) — including the vertical aim chase, so
      // the combined diagonal step stays within the cap (a faster stylized
      // speed is not renderable palm motion and the whole-body proposal
      // correctly rejects it).
      if (!inContact || !forcing) {
        drive.speed = Math.min(drive.speed + HAND_ACC * drive.force * delta, Math.min(HAND_MAX * drive.force, 480));
        const targetAimY = targetActor && targetBody
          ? targetActor.groundY - (targetBody.groundToWaist - targetBody.crouchDrop * targetActor.crouch + (targetBody.waist[1] - targetBody.torsoTop) * 0.5) * targetActor.scale
          : targetProp
            ? propAim(targetProp)[1]
            : state.groundY - 300 * state.scale;
        const step = drive.speed * delta;
        const goalX = drive.hand[0] + dir * step;
        const goalY = drive.hand[1] + clamp(targetAimY - drive.hand[1], -step, step);
        const span = Math.hypot(goalX - drive.hand[0], goalY - drive.hand[1]);
        const share = span > step ? step / span : 1;
        drive.hand = [drive.hand[0] + (goalX - drive.hand[0]) * share, drive.hand[1] + (goalY - drive.hand[1]) * share];
      } else {
        drive.speed = Math.max(0, drive.speed - HAND_ACC * drive.force * delta * 2);
        // Brace against the contact: the hand rests just inside the box edge.
        const aim = targetActor ? [targetX, drive.hand[1]] as [number, number] : propAim(targetProp!);
        const held = handTargetAt(state, aim, state.waist, state.crouch);
        drive.hand = travelHand(drive.hand, held, 0, 480, delta);
      }
      // Arm constraint: a taut arm drags the body (I3).
      const k = state.scale;
      if (process.env.WDBG === state.id) console.log("drive", state.id, "x", state.x.toFixed(1), "hand", drive.hand[0].toFixed(0), drive.hand[1].toFixed(0), "phase", drive.phase, "t", drive.t.toFixed(2), "contactT", drive.contactT?.toFixed(2));
      const sh = geometryShoulder(state);
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
        state.walkPhase = (state.walkPhase + delta * nativeCadence(state)) % 1;
      }
      // Keep the reaction lean while the force window holds and the arm is
      // loaded (contact or fully taut — the pusher is bracing either way);
      // the lean eases in at the waist rate, never snaps.
      if (drive.contactT !== null && drive.t - drive.contactT <= drive.sec && (inContact || d >= reach * 0.98)) {
        state.lean = approach(state.lean, -dir * REACTION_LEAN * drive.force, WAIST_RATE * delta);
      }
      state.reach = {tx: drive.hand[0], ty: drive.hand[1], target: drive.target, contact: inContact && forcing};
    }

    const integrateRoot=(state:ActorState)=>{
      const giver=state.pursue?actors.get(state.pursue):undefined;
      const waitingForPickup=!!(state.skeletonViews&&state.grabTarget&&giver&&
        giver.holding!==state.grabTarget&&(giver.grab?.propId===state.grabTarget||giver.grabTarget===state.grabTarget));
      // Pursuit: walk toward an active move target (planted-feet walk), but
      // never step into another body — halt at adjacency (I1).
      if (state.moveTarget !== null && !waitingForPickup) {
        // Native handover: halt once the live carried object lies in the
        // receiver's arm reach. Binding still occurs in the grab controller;
        // this only avoids walking into the giver after reach is available.
        if (state.skeletonViews && state.grabTarget) {
          const targetProp=props.get(state.grabTarget);
          if (targetProp) {
            const box=propBoxWorld(targetProp),sh=geometryShoulder(state);
            const aim=propAim(targetProp,true);
            const reachable=targetProp.grip ? Math.hypot(sh[0]-aim[0],sh[1]-aim[1])<=state.body.armReach*state.scale+targetProp.grip.radius : circleOverlapsBox({center:sh,radius:state.body.armReach*state.scale},box);
            if (reachable) {
              state.moveTarget=null;
              arriveMotorWalk(state,actors,props);
            }
          }
        }
      }
      // Recheck after native arrival, but always run body separation below.
      if (state.moveTarget !== null && !waitingForPickup) {
        // Live pursuit: chase the target's current position (the staged stop
        // point goes stale the moment the target walks).
        if (state.pursue) {
          const live = actors.get(state.pursue);
          if (live) state.moveTarget = live.x;
          else state.pursue = null;
        }
        const distance = state.moveTarget - state.x;
        if (Math.abs(distance) <= WALK_SPEED * delta) {
          // Arrival: same body-edge clamp as the step — a move target inside
          // another body's exclusion zone stops at adjacency, never snaps in.
          let arrival = state.moveTarget;
          for (const other of actors.values()) {
            if (other.id === state.id) continue;
            // A body bounds the walk only in the direction of travel; a body
            // behind the walker must not clamp the arrival (it would reverse
            // the step — the backward correction the walk contract forbids).
            if ((other.x - state.x) * (arrival - state.x) <= 0) continue;
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
          let stepX = state.x + direction * WALK_SPEED * delta;
          let clampedBy: ActorState | null = null;
          for (const other of actors.values()) {
            if (other.id === state.id) continue;
            // Direction-of-travel guard: see the arrival clamp above.
            if ((other.x - state.x) * direction <= 0) continue;
            const required = state.body.halfWidth * state.scale + other.body.halfWidth * other.scale;
            const before = stepX;
            if (direction > 0) stepX = Math.min(stepX, other.x - required);
            else stepX = Math.max(stepX, other.x + required);
            if (stepX !== before) clampedBy = other;
          }
          state.x = stepX;
          state.walkPhase = (state.walkPhase + delta * nativeCadence(state)) % 1;
          // Pinned at another body's edge: if the target is beyond (or IS the
          // body we pressed into), this is as close as bodies allow — arrival.
          if (clampedBy && ((state.moveTarget - state.x) * direction <= 0 || clampedBy.id === state.pursue)) {
            state.moveTarget = null;
            state.pursue = null;
            arriveMotorWalk(state, actors, props);
          }
        }
      } else if (state.fall || (state.fallen && Math.abs(state.stagger) > 1)) {
        // Slice 4 collapse: balance is cut — no stepping, no recovery. The
        // hip sinks through the shared FK crouch, the waist hinges into the
        // fall direction, momentum skids the body until friction kills it,
        // and the feet drag along (support is gone once balance cuts).
        const f = state.fall!;
        f.t += delta;
        const p = smoothstep01(Math.min(1, f.t / f.dur));
        const direction = f.dir;
        // The feet stay PLANTED (the contract: a supported foot never
        // drifts); the root may only slide within what the folding legs
        // still reach, so the slide rate follows the collapse progress.
        const slide = Math.min(Math.abs(state.stagger), (20 + 120 * p) * delta);
        state.x += direction * slide;
        state.stagger -= direction * slide;
        state.lean *= 0.9;
        state.crouch = Math.max(state.crouch, p);
        state.waist = direction * state.facing * FALL_PITCH * p;
        // The envelope holds the down pose; the branch stays alive only
        // while momentum remains to skid.
        if (f.t >= f.dur && Math.abs(state.stagger) <= 1) state.fall = null;
      } else if (Math.abs(state.stagger) > 1 && !state.fallen) {
        // Stagger: momentum slides the body with foot friction; when the
        // slide exceeds the declared step allowance, the feet take a
        // recovery step that catches part of the remaining momentum
        // (capture-point stepping, thresholds from the figure data).
        const direction = Math.sign(state.stagger);
        const slide = Math.min(Math.abs(state.stagger), 140 * delta);
        state.x += direction * slide;
        state.stagger -= direction * slide;
        state.staggerSlide += slide;
        state.walkPhase = (state.walkPhase + delta * 3) % 1;
        state.lean *= 0.96;
        // Recovery step: after ~stepLength of slide the feet reposition and
        // catch catchFraction of the remaining momentum. Once maxSteps are
        // spent and the slide demand still passes stepLength, the imbalance
        // exceeds capture capacity — balance cuts and the figure falls
        // (slice 4).
        if (state.staggerSlide >= state.body.stepLength) {
          if (state.stepsTaken < state.body.maxSteps) {
            state.stagger -= direction * Math.abs(state.stagger) * state.body.catchFraction;
            state.staggerSlide = 0;
            state.stepsTaken += 1;
            state.stepPlanted = true;
          } else {
            startFall(state, direction as 1 | -1);
          }
        }
      } else {
        state.stagger = 0;
        state.staggerSlide = 0;
        state.stepsTaken = 0;
        // A pre-roll holds its own weight shift; the idle decay would fight it.
        if (!state.prep) state.lean *= 0.9;
        if (state.skeletonViews) {
          // Finish the stride at its rest endpoint rather than deleting a
          // nonzero leg target when root travel stops.
          const sk=state.skeleton!,facing=geometryFacing(state);
          const settled=state.feet&&(['l','r'] as const).every(side=>{
            const foot=sk.joints[`foot_${side}`]!;
            const restX=state.x+facing*(foot[0]-sk.space.width/2)*state.scale;
            return Math.abs(state.feet![side].target[0]-restX)<.02&&!state.feet![side].swing;
          });
          const phase=state.walkPhase%1;
          const boundary=phase<.5?.5:1;
          // Do not wrap into the next swing before support has landed and
          // tested the completed stride in this same atomic proposal. A
          // fallen body never steps again (balance is cut).
          state.walkPhase=settled||state.fallen?0:Math.min(boundary,phase+delta*nativeCadence(state));
        } else if (!state.reach) state.walkPhase = 0;
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
    };
    const previousRoots=new Map([...actors].map(([id,a])=>[id,a.x]));
    if(presentationSampling){
      for(const state of actors.values())integrateRoot(state);
      for(const state of actors.values())advanceSupport(state,previousRoots.get(state.id)!,delta);
    }
    // Actor integration.
    for (const state of actors.values()) {
      // M5 anticipation pre-roll: the beat waits while the torso shifts weight
      // opposite the intended motion; the release is the same rate-limited
      // return the waist already obeys (no snap into the beat's first frame).
      if (state.prep) {
        const p = state.prep;
        p.t += delta;
        const goal = p.t < p.dur ? p.sign * p.peak * anticipationEnvelope(p.t, p.dur) : 0;
        state.lean = approach(state.lean, goal, WAIST_RATE * delta);
        if (p.t >= p.dur && state.lean === 0) state.prep = null;
      }
      // Grab controller (I2/I4): bend the waist and crouch — the MINIMUM
      // posture whose fully-extended hand physically touches the object's
      // declared body box — then bind. The posture motion is the body's own
      // motion at real joint rates; the object never moves toward the hand.
      if (state.grab) {
        const g = state.grab;
        g.t += delta;
        const k = state.scale;
        const liveProp = props.get(g.propId)!;
        const box = propBoxWorld(liveProp);
        const aim = propAim(liveProp,true);
        // Face the object: a hand cannot honestly grab what is behind the back.
        if (!state.skeletonViews || !state.reach) state.facing = (Math.sign(aim[0] - state.x) || state.facing) as 1 | -1;
        const contact = (hand: [number,number]) => liveProp.grip
          ? Math.hypot(hand[0]-aim[0],hand[1]-aim[1]) <= Math.min(liveProp.grip.radius,state.skeletonViews?1.6:Infinity)
          : circleOverlapsBox({center:hand,radius:state.body.handRadius*k},box);
        const touches = (pitch: number, crouch: number): boolean => contact(handTargetAt(state,aim,pitch,crouch));
        // Possible posture contact is not actual contact: move the visible hand
        // from its previous target (or rest) before testing the live touch box.
        state.retract = false;
        if(state.skeletonViews){
          // Minimal-touch posture: least crouch, then least |pitch|.
          let goalPitch = SPINE_MAX * ((aim[0] - state.x) * state.facing >= 0 ? 1 : -1);
          let goalCrouch = 1;
          search: for (let c = 0; c <= 1.0001; c += 0.25) {
            for (let p = 0; p <= SPINE_MAX; p += 5) {
              if (touches(p, c)) { goalPitch = p; goalCrouch = c; break search; }
              if (touches(-p, c)) { goalPitch = -p; goalCrouch = c; break search; }
            }
          }
          const onset = state.skeletonViews ? smoothstep01(g.t / .5) : 1;
          state.waist = approach(state.waist, goalPitch, WAIST_RATE * delta * onset);
          state.crouch = approach(state.crouch, Math.max(goalCrouch,state.supportMinimum??0), CROUCH_RATE * delta * onset);
        }
        const targetHand = handTargetAt(state, aim, state.waist, state.crouch);
        const shNow=geometryShoulder(state),shBefore=state.reachShoulder??shNow;
        const previousHand: [number, number] = state.reach
          ? [state.reach.tx+(state.skeletonViews?shNow[0]-shBefore[0]:0),state.reach.ty+(state.skeletonViews?shNow[1]-shBefore[1]:0)] : restHandAt(state);
        // M5 accent: the approach runs slower away from the object and at the
        // full 480 px/s cap through the final approach into the bind (the key
        // pose). The cap itself is unchanged — contrast, not new speed.
        const span = g.span ?? (g.span = Math.hypot(targetHand[0] - previousHand[0], targetHand[1] - previousHand[1]) || 1);
        const approachSpeed = 480 * smoothstep01(g.t / .25)
          * accentSpeed(Math.hypot(targetHand[0] - previousHand[0], targetHand[1] - previousHand[1]), span, g.accent);
        const hand = travelHand(previousHand, targetHand, 0, approachSpeed, delta);
        state.reach = {tx: hand[0], ty: hand[1], target: g.propId, contact: false};
        if (contact(hand) && now >= (g.notBefore ?? 0)) {
          // The grip takes the weight: any previous holder's hand opens.
          for (const other of actors.values()) {
            if (other.id !== state.id && other.holding === g.propId) {
              other.holding = null;
              other.holdRel = null;
              other.retract = other.reach !== null;
              other.grip = null;
              other.gripGoal = null;
            }
          }
          state.wristAtBind = wristDirection(state, hand);
          state.propAngleAtBind = liveProp.rotation;
          state.holding = g.propId;
          state.grab = null;
          const sh = geometryShoulder(state);
          // The grip starts where the hand physically touched, then eases to
          // the CENTER grip: the box center sits at the hand point (small
          // objects are carried at their middle, not by a distant offset).
          state.grip = {ox: liveProp.x - hand[0], oy: liveProp.y - hand[1]};
          state.gripGoal = state.skeletonViews&&!liveProp.grip ? {...state.grip} : {ox: liveProp.x - aim[0], oy: liveProp.y - aim[1]};
          state.holdRel = {from: [hand[0] - sh[0], hand[1] - sh[1]], t: 0, dur: 0.45};
          state.carryShoulder=sh;
        } else if (g.t > 2.5 && now > (g.notBefore ?? 0) + 2.5) {
          // Honest miss: no posture within the puppet model can touch it.
          state.grab = null;
          state.retract = true;
        } else if(!state.skeletonViews) {
          // Minimal-touch posture: least crouch, then least |pitch|.
          let goalPitch = SPINE_MAX * ((aim[0] - state.x) * state.facing >= 0 ? 1 : -1);
          let goalCrouch = 1;
          search: for (let c = 0; c <= 1.0001; c += 0.25) {
            for (let p = 0; p <= SPINE_MAX; p += 5) {
              if (touches(p, c)) { goalPitch = p; goalCrouch = c; break search; }
              if (touches(-p, c)) { goalPitch = -p; goalCrouch = c; break search; }
            }
          }
          const onset = state.skeletonViews ? smoothstep01(g.t / .5) : 1;
          state.waist = approach(state.waist, goalPitch, WAIST_RATE * delta * onset);
          state.crouch = approach(state.crouch, Math.max(goalCrouch,state.supportMinimum??0), CROUCH_RATE * delta * onset);
        }
      }
      // Hold (I4): the bound prop's position IS the hand's position — through
      // walking, staggering, rising from a crouch, everything — until an
      // explicit release.
      if (state.holding) {
        const advance = (dt: number) => {
          if (!state.holding) return;
          const heldProp = props.get(state.holding)!;
          const recipient = state.offer?.prop===state.holding && now<state.offer.until ? actors.get(state.offer.recipient) : undefined;
          let carryGoal=carryHandAt(state);
          if (recipient) {
            const sh=geometryShoulder(state),other=geometryShoulder(recipient);
            carryGoal=handTargetAt(state,[(sh[0]+other[0])/2,Math.max(sh[1],other[1])+state.body.armReach*state.scale*.65],state.waist,state.crouch);
          }
          // The posture returns to neutral at real joint rates; the hand keeps
          // its shoulder-relative shape (the arm holds the object as the body
          // straightens), then relaxes to the carry pose. A fallen holder
          // keeps the down pose; the carried prop rides the hand down (I4).
          if (!state.fallen) {
            state.waist = approach(state.waist, 0, WAIST_RATE * dt);
            state.crouch = recoverCrouch(state, dt);
          }
          if(state.skeletonViews){
            carryGoal=carryHandAt(state);
            if(recipient){
              const sh=geometryShoulder(state),other=geometryShoulder(recipient);
              carryGoal=handTargetAt(state,[(sh[0]+other[0])/2,Math.max(sh[1],other[1])+state.body.armReach*state.scale*.65],state.waist,state.crouch);
            }
          }
          if (state.holdRel) {
            state.holdRel.t += dt;
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
            const sh = geometryShoulder(state);
            const carry = carryGoal;
            const rel: [number, number] = [
              state.holdRel.from[0] + ((carry[0] - sh[0]) - state.holdRel.from[0]) * blend,
              state.holdRel.from[1] + ((carry[1] - sh[1]) - state.holdRel.from[1]) * blend,
            ];
            const desired:[number,number]=[sh[0]+rel[0],sh[1]+rel[1]];
            const hand: [number, number] = desired;
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
            const targetHandY = state.place - supportPoint(heldProp).y - 6 - (state.grip?.oy ?? 0);
            // Rise from the PREVIOUS hand position (the carry pose recomputes
            // every substep and would otherwise swallow the accumulated lift).
            const prevY = state.reach?.ty ?? hand[1];
            const liftY = Math.max(targetHandY, prevY - 260 * dt);
            const liftHand: [number, number] = [hand[0], liftY];
            heldProp.x = liftHand[0] + (state.grip?.ox ?? 0);
            heldProp.y = liftHand[1] + (state.grip?.oy ?? 0);
            heldProp.vx = 0;
            heldProp.falling = false;
            state.reach = {tx: liftHand[0], ty: liftHand[1], target: state.holding, contact: true};
            if (heldProp.y + supportPoint(heldProp).y <= state.place + 2) {
              propOpenHand(state, props);
            }
          } else {
            const sh=geometryShoulder(state),oldSh=state.carryShoulder??sh;
            const previous: [number,number]=state.reach
              ? [state.reach.tx+(state.skeletonViews?sh[0]-oldSh[0]:0),state.reach.ty+(state.skeletonViews?sh[1]-oldSh[1]:0)] : carryGoal;
            const hand = state.skeletonViews||state.offer?.prop===state.holding ? travelHand(previous,carryGoal,0.1,480,dt) : carryGoal;
            heldProp.x = hand[0] + (state.grip?.ox ?? 0);
            heldProp.y = hand[1] + (state.grip?.oy ?? 0);
            heldProp.vx = 0;
            heldProp.falling = false;
            state.reach = {tx: hand[0], ty: hand[1], target: state.holding, contact: true};
          }
          if (state.holding && state.reach) {
            state.carryShoulder=geometryShoulder(state);
            const prop=props.get(state.holding)!;
            if (prop.grip) {
              const hand: [number,number]=[state.reach.tx,state.reach.ty];
              const goal=state.propAngleAtBind+angleDelta(wristDirection(state,hand)-state.wristAtBind);
              prop.rotation += clamp(angleDelta(goal-prop.rotation),-90*dt,90*dt);
              const offset=rotateVector([prop.x-hand[0],prop.y-hand[1]],prop.rotation-state.propAngleAtBind);
              prop.x=hand[0]+offset[0];prop.y=hand[1]+offset[1];
            }
          }
        };
        advance(delta);

      }
      // Gesture intents (slice 3 vocabulary): torso-pitch envelopes and reach
      // gestures are baked motion — planted support, no contact (I1/I2).
      if (state.gesture) {
        const g = state.gesture;
        g.t += delta;
        if (g.t >= g.dur) {
          state.waist = 0;
          state.gesture = null;
        } else if (g.kind === "bow") state.waist = BOW_PITCH * bowEnvelope(g.t, g.dur);
        else if (g.kind === "nod") state.waist = NOD_PITCH * nodEnvelope(g.t, g.dur);
        else state.lean = SHIVER_AMP * Math.sin(SHIVER_HZ * 2 * Math.PI * g.t);
      }
      if (state.handGesture) {
        const g = state.handGesture;
        g.t += delta;
        const sh = geometryShoulder(state);
        const arm = state.body.armReach * state.scale;
        const aim: [number, number] = g.kind === "raise"
          ? [sh[0] + state.facing * arm * 0.28, sh[1] - arm * 0.98]
          : g.kind === "think"
            ? [sh[0] + state.facing * arm * 0.06, sh[1] - arm * 0.42]
            : [sh[0] + state.facing * arm * 0.94, sh[1] + (g.kind === "wave" ? Math.sin(g.t * 14) * arm * 0.05 : 0)];
        // M5 settle: once the key pose is reached the hand carries a decaying
        // overshoot past it (the span's direction, 6% of the span, at most
        // 14 px) and returns exactly to the aim — one overshoot, no oscillation.
        const span = Math.hypot(aim[0] - g.from[0], aim[1] - g.from[1]) || 1;
        const overshoot = settleOffset(span, g.settle, g.keyAt === null ? -1 : g.t - g.keyAt);
        const goal: [number, number] = [aim[0] + (aim[0] - g.from[0]) / span * overshoot,
          aim[1] + (aim[1] - g.from[1]) / span * overshoot];
        const previous: [number, number] = state.reach ? [state.reach.tx, state.reach.ty] : restHandAt(state);
        const remaining = Math.hypot(aim[0] - previous[0], aim[1] - previous[1]);
        // M5 accent: hard acceleration into the key pose, slower elsewhere,
        // inside the unchanged 480 px/s hand cap.
        const hand = travelHand(previous, goal, 0,
          480 * smoothstep01(g.t / 0.25) * accentSpeed(remaining, span, g.accent), delta);
        if (g.keyAt === null && remaining <= 1) g.keyAt = g.t;
        state.reach = {tx: hand[0], ty: hand[1], target: g.target, contact: false};
        if (g.t >= g.dur) {
          state.handGesture = null;
          state.retract = true;
        }
      }
      // Posture return when nothing is held or grabbed. A fallen body keeps
      // the down pose (slice 4: get-up is out of scope).
      if (!state.fallen && !state.grab && !state.holding && !state.gesture && (state.waist !== 0 || state.crouch !== 0)) {
        state.waist = approach(state.waist, 0, WAIST_RATE * delta);
        state.crouch = recoverCrouch(state,delta);
      }
      if (!state.retract) {state.retractInfluence = 1;state.retractElapsed = 0;}
      if (state.retract && !state.grab && !state.holding && !state.handDrive && !state.handGesture) {
        const rest = restHandAt(state);
        if (state.retractElapsed === 0) {
          const span = state.reach ? Math.hypot(state.reach.tx-rest[0],state.reach.ty-rest[1]) : 0;
          state.retractDuration = state.skeletonViews ? Math.max(.65, 1.5*span/240) : .65;
        }
        state.retractElapsed += delta;
        state.retractInfluence = 1 - smoothstep01(state.retractElapsed / state.retractDuration);
        const previous: [number, number] = state.reach ? [state.reach.tx, state.reach.ty] : rest;
        // Decelerate near rest: a constant-speed wrist can make the elbow
        // whip through the final near-straight IK pose before the target clears.
        const hand = travelHand(previous, rest, state.skeletonViews ? .05 : .1, state.skeletonViews ? 240 : 480,delta);
        if (Math.hypot(hand[0] - rest[0], hand[1] - rest[1]) < 0.01 && state.retractInfluence === 0 &&
            (!state.skeletonViews || state.retractElapsed >= state.retractDuration + 1 / FPS)) {
          state.reach = null;
          state.retract = false;
        } else {
          state.reach = {tx: hand[0], ty: hand[1], target: state.reach?.target ?? "", contact: false};
        }
      }
      if (!presentationSampling) integrateRoot(state);
    }

    // Prop integration (I4): a prop moves only by carrying (handled in the
    // hold block), gravity after release, or friction slide from an impulse.
    for (const prop of props.values()) {
      if ([...actors.values()].some(actor=>actor.holding===prop.id)) {
        const previous=previousProps.get(prop.id)!;
        prop.carryVelocity=[(prop.x-previous[0])/(presentationSampling?DT:delta),(prop.y-previous[1])/(presentationSampling?DT:delta)];
      }
      if (prop.falling) {
        prop.x += prop.vx * delta;
        prop.vy += GRAVITY * delta;
        prop.y += prop.vy * delta;
        const point = supportPoint(prop);
        const surface = supportYAt(prop.x + point.x, prop.y - prop.vy * delta + point.y);
        if (prop.vy >= 0 && prop.y + point.y >= surface) {
          prop.y = surface - point.y;
          prop.vy = 0;
          prop.falling = false;
        }
      } else if (Math.abs(prop.vx) > 1) {
        prop.x += prop.vx * delta;
        const friction = Math.sign(prop.vx) * PROP_FRICTION * delta;
        prop.vx = Math.abs(prop.vx) <= Math.abs(friction) ? 0 : prop.vx - friction;
      } else {
        prop.vx = 0;
      }
    }

    };
    if(!presentationSampling) advanceSubstep(DT);
    else {
      const baseline=capture(now-DT);
      const isPresentation=step%SUBSTEPS===0;
      const result=resolveWholeBodyProposal({accepted:baseline,time:now-DT,dt:DT,maxAttempts:12,
        presentationTimes:isPresentation?[DT]:[],
        ...(isPresentation?{presentationReference:{state:lastPresentation??baseline,time:lastPresentationTime??now-DT}}:{}),
      },(snapshot,progress)=>{
        actors=snapshot.controllers.actors;props=snapshot.controllers.props;queues=snapshot.controllers.queues;
        diagnostics=snapshot.controllers.diagnostics;exhaustedActors=snapshot.controllers.exhaustedActors;
        const reduction=-Math.log2(progress);
        const realizedProgress=reduction<8?(8-reduction)/8:2**(4-reduction);
        advanceSubstep(DT*realizedProgress);
        const candidate=capture(now);
        const events:OwnershipEvent[]=Object.entries(candidate.props).flatMap(([id,prop])=>{
          const old=snapshot.props[id]!;
          return old.owner===prop.owner?[]:[{prop:id,from:old.owner,to:prop.owner,
            notBefore:prop.owner?(baseline.controllers.actors.get(prop.owner)?.grab?.notBefore??now):now}];
        });
        return {state:candidate,samples:isPresentation?[candidate]:[],events};
      });
      actors=result.state.controllers.actors;props=result.state.controllers.props;queues=result.state.controllers.queues;
      diagnostics=result.state.controllers.diagnostics;exhaustedActors=result.state.controllers.exhaustedActors;
      if(!result.accepted){
        const v=result.rejections.at(-1)!;
        const key=v.actor??(v.prop?result.state.props[v.prop]?.owner:undefined)??v.prop??'scene';
        if(!exhaustedActors.has(key)){
        exhaustedActors.add(key);
        diagnostics.push(`whole-body proposal exhausted: ${key} at ${now.toFixed(3)}s; ${v.constraint}/${v.joint??''} ${v.measured.toFixed(3)} > ${v.limit.toFixed(3)}; original controllers/ownership retained`);
        }
      }
      if(isPresentation){lastPresentation=structuredClone(result.state);lastPresentationTime=now;}
    }

    // Native contact channels share the indexed presentation timestamp.
    // Preserve historical frame-end sampling for legacy-only motor scenes.
    if ((presentationSampling ? step : step + 1) % SUBSTEPS === 0) {
      for (const [id, frames] of actorFrames) {
        const state = actors.get(id)!;
        const planted = state.stepPlanted;
        state.stepPlanted = false;
        const precision=state.skeletonViews?1e6:100;
        const round=(value:number)=>Math.round(value*precision)/precision;
        frames.push({
          ...(state.feet?{worldFootTargets:{l:state.feet.l.target,r:state.feet.r.target},
            footSupport:{l:!state.feet.l.swing,r:!state.feet.r.swing},
            ...(scene.actors.find(a=>a.id===id)!.poseTracks?{skeletonPose:state.skeletonPose}:{}),
            orientation:state.orientation}:{}),
          x: round(state.x),
          lean: round(state.lean),
          facing: state.facing,
          walk: Math.round(state.walkPhase * 1000) / 1000,
          ...(state.waist ? {waist: round(state.waist)} : {}),
          ...(state.crouch > (state.skeletonViews?0:0.01) ? {crouch: round(state.crouch)} : {}),
          ...(state.holding ? {holds: state.holding, ...(props.get(state.holding)?.grip ? {gripDepth:props.get(state.holding)!.grip!.depth} : {})} : {}),
          ...(planted ? {step: 1} : {}),
          ...(state.reach ? {
            reach: [round(state.reach.tx), round(state.reach.ty)],
            ...(state.retract ? {reachInfluence: state.retractInfluence} : {}),
            ...(state.reach.contact ? { contact: true } : {}),
          } : {}),
        });
      }
      for (const [id, frames] of propFrames) {
        const prop = props.get(id)!;
        frames.push({ ...(prop.grip || prop.solid ? {rotation: prop.rotation} : {}), x: prop.solid ? prop.x : Math.round(prop.x * 100) / 100, y: prop.solid ? prop.y : Math.round(prop.y * 100) / 100, ...(prop.falling ? {falling: true} : {}) });
      }
    }
  }

  return {
    actors: Object.fromEntries(actorFrames),
    props: Object.fromEntries(propFrames),
    ...(diagnostics.length ? {diagnostics} : {}),
  };
}

export interface MotorSceneSource {
  durationSec: number;
  /** Normalized staging positions keyed by instance id. */
  actors: Record<string, {at: readonly [number, number]; facing?: number; scale?: number; skeleton?: Skeleton;skeletonViews?:Record<FigureView,Skeleton>}>;
  /** Global scene start, used by native figures' absolute IR event times. */
  startSec?: number;
  objects: Record<string, {at: readonly [number, number]; size?: [number, number]; scale?: number; solid?: PropSolid; grip?: MotorGrip; rotation?: number; touchBox?: {a: [number, number]; b: [number, number]}}>;
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
    actorInputs.push({id, x: staged.at[0] * video.width, groundY: staged.at[1] * video.height, facing: staged.facing === -1 ? -1 : 1, scale: staged.scale ?? 1, skeleton: staged.skeleton, skeletonViews:staged.skeletonViews, orientations:[], poseTracks:[], intents: []});
    intentsByActor.set(id, []);
  }
  for (const track of source.tracks ?? []) {
    const subject = track.subject;
    for (const event of track.events ?? []) {
      for (const recipe of event.tracks ?? []) {
        if(subject&&source.actors[subject]?.skeletonViews&&recipe.kind!=='motor'){
          const start=Math.round((Number(event.start??0)-(source.startSec??0))*FPS);
          actorInputs.find(a=>a.id===subject)!.poseTracks!.push({kind:recipe.kind??'',
            events:(recipe.events??[]).map(item=>({...item,
              frame:start+Math.round(Number(item.at??0)*FPS),
              endFrame:start+Math.round(Number(item.at??0)*FPS)+Math.max(1,Math.round(Number(item.duration??(Number(event.end??event.start??0)-Number(event.start??0)))*FPS)),
              active:false,progress:0,
            }))});
        }
        if (recipe.kind === "bone" && subject && source.actors[subject]?.skeletonViews) {
          for (const item of recipe.events ?? []) {
            const value=(item.value??item) as Record<string,unknown>;
            if (typeof value.orientation !== 'string') continue;
            figureViewForOrientation(value.orientation);
            actorInputs.find((a)=>a.id===subject)!.orientations!.push({at:Number(event.start??0)-(source.startSec??0)+Number(item.at??item.frame??0),orientation:value.orientation});
          }
          continue;
        }
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
            const at = Number(event.start ?? 0) - (source.actors[holder]?.skeletonViews ? source.startSec??0 : 0) + Number(item.at ?? item.frame ?? 0);
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
          const GESTURE_INTENTS = ["bow", "nod", "shiver", "point", "wave", "raise", "think", "fall"] as const;
          const kind = String(intent.intent);
          if (kind !== "move" && kind !== "push" && kind !== "release" && kind !== "grab" && !(GESTURE_INTENTS as readonly string[]).includes(kind)) continue;
          // An intent may drive an actor other than the invoking subject
          // (e.g. a handover walks the RECEIVER to the giver).
          const driven = typeof intent.actor === "string" && intentsByActor.has(intent.actor) ? intent.actor : subject;
          if (!driven || !intentsByActor.has(driven)) continue;
          intentsByActor.get(driven)!.push({
            at: Number(event.start ?? 0) - (source.actors[driven]?.skeletonViews ? source.startSec??0 : 0) + Number(intent.at ?? 0),
            duration: Number(intent.duration ?? (Number(event.end ?? Number(event.start ?? 0) + 1) - Number(event.start ?? 0))),
            intent: kind as MotorIntent["intent"],
            target: intent.target as string | undefined,
            force: typeof intent.force === "number" ? intent.force : undefined,
            reach: typeof intent.reach === "number" ? intent.reach : undefined,
            forceSec: typeof intent.forceSec === "number" ? intent.forceSec : undefined,
            grab: typeof intent.grab === "string" ? intent.grab : undefined,
            releaseMode: intent.releaseMode === 'free' ? 'free' : 'place',
            // M5 acting shape (docs/SCHEMAS.md): data on the intent, 0 = pre-M5.
            anticipation: typeof intent.anticipation === "number" ? intent.anticipation : undefined,
            accent: typeof intent.accent === "number" ? intent.accent : undefined,
            settle: typeof intent.settle === "number" ? intent.settle : undefined,
          });
        }
      }
    }
  }
  const totalIntents = [...intentsByActor.values()].reduce((sum, list) => sum + list.length, 0);
  if (totalIntents === 0) return undefined;
  const planned: Array<{actor:string;prop:string;cue:number}> = [];
  for (const actor of actorInputs) {
    actor.intents = intentsByActor.get(actor.id)!;
    for (const intent of [...actor.intents].sort((a,b)=>a.at-b.at)) {
      // Redirected move+grab is the existing handover intent, not a new DSL.
      const giver=actorInputs.find(a=>a.id===intent.target);
      if (intent.intent !== 'move' || !intent.grab || !giver || giver.id===actor.id) continue;
      const cue=intent.at;
      const earlier=actor.intents.filter(i=>i!==intent&&(i.contactAt??i.at)<cue);
      const earliest=Math.max(0,...earlier.map(i=>(i.contactAt??i.at)+i.duration));
      const lead=Math.abs(actor.x-giver.x)/(actor.skeletonViews?WALK_SPEED/2:WALK_SPEED) + .85
        // A prepared receiver spends his pre-roll before he walks: the lead
        // carries the anticipation so the plan stays honest to the cue.
        + Math.min(ANTICIPATION_MAX_SEC, Math.max(0, Number(intent.anticipation ?? 0)));
      intent.at=Math.max(earliest,cue-lead);
      intent.contactAt=cue;
      planned.push({actor:actor.id,prop:intent.grab,cue});
      const priorGiver=(intentsByActor.get(giver.id)??[]).filter(i=>(i.contactAt??i.at)<cue);
      const giverEarliest=Math.max(0,...priorGiver.map(i=>(i.contactAt??i.at)+i.duration));
      intentsByActor.get(giver.id)!.push({intent:'grab',target:intent.grab,offerTo:actor.id,at:Math.max(giverEarliest,cue-.95),contactAt:cue,duration:intent.duration});
    }
  }
  const movie = simulateScene({
    durationSec: source.durationSec,
    actors: actorInputs,
    props: Object.entries(source.objects ?? {}).map(([id, staged]) => ({id, x: staged.at[0] * video.width, y: staged.at[1] * video.height, size: staged.size ?? [80, 120] as [number, number], touchBox: staged.touchBox, solid: staged.solid, grip: staged.grip, rotation: staged.rotation, intents: []})),
    supports: source.supports,
    groundY: actorInputs[0]?.groundY,
    resolveX: (id) => {
      const actor = source.actors?.[id];
      if (actor) return actor.at[0] * video.width;
      const object = source.objects?.[id];
      return object ? object.at[0] * video.width : undefined;
    },
  });
  const diagnostics: string[]=[...(movie.diagnostics ?? [])];
  for (const plan of planned) {
    const frames=movie.actors[plan.actor]!;
    const cueFrame=Math.ceil(plan.cue*FPS);
    const contact=frames.findIndex((f,i)=>i>=cueFrame&&f.holds===plan.prop);
    if (contact<0 || contact>cueFrame+1) diagnostics.push(`contact cue missed: ${plan.actor} receiving ${plan.prop} at ${plan.cue.toFixed(3)}s; ${contact<0?'no contact':`contact at ${(contact/FPS).toFixed(3)}s`}. Provide sufficient scene pre-roll or free earlier motor motion; no snapping was applied.`);
  }
  if (diagnostics.length) movie.diagnostics=diagnostics;
  return movie;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value));
}
