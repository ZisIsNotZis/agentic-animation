import type {Skeleton} from '../schemas/libraryMeta';
import type {SkeletonPose} from './skeleton';
export interface PoseTrackEvent {
  progress:number;
  active:boolean;
  [key:string]:unknown;
}
export interface PoseActor {
  id:string;x:number;y:number;scale:number;flip:boolean;
  pose?:string;motor?:boolean;lean?:number;walk?:number;facing?:1|-1;
  orientation?:string;reach?:[number,number];reachInfluence?:number;
  /** The OFF hand's world point (R7). Present only while the left hand holds
   *  or reaches; the left arm is then solved onto it, exactly as `reach`
   *  drives the right one. Inert on every pre-R7 actor. */
  reachLeft?:[number,number];contactLeft?:boolean;
  waist?:number;crouch?:number;contact?:boolean;skeleton?:Skeleton;artwork?:unknown;
  /** Hanging from a support's grip: both hands hold the one grip point
   *  (the reach model is single-hand, so the left arm mirrors the right). */

  worldFootTargets?:{l:[number,number];r:[number,number]};
  skeletonPose?:SkeletonPose;
  expression:{name?:string;brow?:unknown;eyes?:unknown;mouth?:unknown;eyeOpen?:number;
    gaze:[number,number];lipsPart:number;smile:number};
  tracks:Array<{kind:string;events:PoseTrackEvent[]}>;
}
import {solveSkeleton, plantedLegAngles, type SolvedSkeleton} from "./skeleton";
import {nativeCrouchDrop} from "./skeleton";
import {solveReach, solveArmOntoReach, designHandToWorld} from "./reach";

export type Side = "left" | "right";
export type HandShape = "rest" | "open" | "point" | "fist" | "splayed";
export type FaceFamily =
  | "shock"
  | "fear"
  | "desperate"
  | "confused"
  | "skeptical"
  | "embarrassed"
  | "relief"
  | "excited"
  | "proud"
  | "somber"
  | "calm";
export interface ActorArmPose {
  upper: number;
  lower: number;
  hand: HandShape;
}
export interface ActorLegPose {
  upper: number;
  lower: number;
}
export interface ActorPose {
  torsoTilt: number;
  torsoY: number;
  torsoScaleY: number;
  headTilt: number;
  headY: number;
  armLeft: ActorArmPose;
  armRight: ActorArmPose;
  legLeft: ActorLegPose;
  legRight: ActorLegPose;
  gaze: [number, number];
  eyeOpen: number;
  browLift: number;
  mouthOpen: number;
  smile: number;
  speechActive: boolean;
  speechOpen: boolean;
  slamPeak: boolean;
}
type SemanticEvent = {
  event: PoseTrackEvent;
  value: Record<string, unknown>;
  text: string;
  parts: Set<string>;
  progress: number;
  trackKind: string;
};
const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));
const number = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const record = (v: unknown): Record<string, unknown> =>
  v !== null && typeof v === "object" ? (v as Record<string, unknown>) : {};
export function roleFor(id: string): number {
  return [...id].reduce((n, c) => n + c.charCodeAt(0), 0) % 3;
}
function eventStart(e: PoseTrackEvent): number {
  return number(e.frame ?? e.startFrame ?? e.t ?? e.at, 0);
}
function easeOut(p: number): number {
  const t = clamp(p, 0, 1);
  return 1 - (1 - t) ** 3;
}
function smooth(p: number): number {
  const t = clamp(p, 0, 1);
  return t * t * (3 - 2 * t);
}
function bell(p: number): number {
  const t = clamp(p, 0, 1);
  return 4 * t * (1 - t);
}
function alternating(p: number, cycles = 1): number {
  const t = clamp(p, 0, 1) * cycles;
  const f = t - Math.floor(t);
  return (
    (Math.floor(t) % 2 ? -1 : 1) * (f < 0.5 ? smooth(f * 2) : smooth(2 - f * 2))
  );
}
function hasPart(e: SemanticEvent, ...parts: string[]): boolean {
  return parts.some((part) => e.parts.has(part));
}
function sideOf(e: SemanticEvent, side: Side): boolean {
  return hasPart(
    e,
    ...(side === "left"
      ? ["arm_u_l", "arm_l_l", "hand_l"]
      : ["arm_u_r", "arm_l_r", "hand_r"]),
  );
}
function eachSide(e: SemanticEvent): Side[] {
  if (e.trackKind === 'bone' && isFacialPredicate(e.text)) return [];
  // A gaze beat aims the eyes; it is not an arm claim, so it may not splay the
  // arms. The handover's `offer` phase is an eyeline lead (`lead: head`) of a
  // physical transfer whose arm preparation the motor owns; read as a present
  // it splayed both actors' arms across the bind (docs/WORLD_PUPPET_MOTOR.md,
  // m7 transfer). A gaze event that names an arm part explicitly still acts.
  if (e.trackKind === 'gaze' &&
      ![...e.parts].some((part) => /^(?:arm_[ul]|hand)_[lr]$/.test(part))) return [];
  const sides = (["left", "right"] as Side[]).filter((side) => sideOf(e, side));
  return sides.length ? sides : e.parts.size ? [] : ["left", "right"];
}
function handFor(text: string, amount: number): HandShape {
  if (/point|index|direct|aim|count/.test(text)) return "point";
  if (
    /open|release|offer|present|wave|dismiss|splay|scatter|pat|touch|type|write/.test(
      text,
    )
  )
    return "splayed";
  if (/grip|grasp|fist|slam|impact|press|close|hold/.test(text))
    return amount > 0.4 ? "fist" : "rest";
  return "open";
}
// Classify predicates, not declared parts: a lip pressing is not a hand press.
// Keep hand-to-face contact and ingestion, whose effector is genuinely bodily.
function bodyOperationText(text: string): string {
  const facial = /\b(?:brows?|eyebrows?|eyes?|eyelids?|cheeks?|mouth|lips?|chin|jaw|teeth|gaze|breath)\b/;
  const effector = /\b(?:arms?|hands?|wrists?|palms?|fingers?|torso|body|shoulders?)\b/;
  return text.split(/\b(?:and|then|while|but)\b|[;,]/).filter(clause => {
    if (!facial.test(clause) || /\b(?:sip|drink)\b/.test(clause)) return true;
    const anatomy = clause.match(/\b(?:brows?|eyebrows?|eyes?|eyelids?|cheeks?|mouth|lips?|chin|jaw|teeth|gaze|breath|arms?|hands?|wrists?|palms?|fingers?|torso|body|shoulders?)\b/);
    // The first anatomical subject/object owns the predicate. A later relaxed
    // arm is not permission for 'raise eyebrow'; explicit hand contact is.
    return Boolean(anatomy && effector.test(anatomy[0])) ||
      (/\b(?:touch|tap|press|pat|scratch)\b/.test(clause) &&
       /\bwith (?:the |a |one |left |right )*(?:hand|finger|palm)\b/.test(clause));
  }).join(' ');
}
function isFacialPredicate(text: string): boolean {
  return text.trim() !== '' && bodyOperationText(text).trim() === '';
}
function actionOf(text: string, bonePredicate = true): string {
  if (bonePredicate) text = bodyOperationText(text);
  // Qualified names are metadata, not natural-language operation tokens.
  text = text.replace(/\S*[.:/_]\S*/g, ' ');
  if (/\b(?:slam|impact|drive(?: it)? down)\b/.test(text)) return "slam";
  if (/\b(?:scatter|sprinkle|throw wide)\b/.test(text)) return "scatter";
  if (/\b(?:present|offer|handover|show)\b/.test(text) && !/remain.*present/.test(text)) return "present";
  if (/\b(?:sip|drink|cup)\b/.test(text)) return "sip";
  if (/\b(?:type|keyboard)\b/.test(text)) return "type";
  if (/\b(?:write|scribble|pen)\b/.test(text)) return "write";
  if (/\b(?:count|enumerate)\b/.test(text)) return "count";
  if (/\b(?:pat|palm)\b/.test(text)) return "pat";
  if (/\b(?:scratch|itch)\b/.test(text)) return "scratch";
  if (/\b(?:touch|tap|press)\b/.test(text)) return "touch";
  if (/\b(?:walk|step|travel|stride|plant|arrive|depart)\b/.test(text)) return "walk";
  return "generic";
}
function semanticAction(semantic: SemanticEvent): string {
  const phase = String(semantic.value.phase ?? "").toLowerCase();
  const operationalPhases: Record<string,string> = {
    slam:"slam",scatter:"scatter",present:"present",offer:"present",
    sip:"sip",type:"type",write:"write",count:"count",pat:"pat",scratch:"scratch",
    touch:"touch",walk:"walk",
  };
  const textAction = actionOf(semantic.text, semantic.trackKind === 'bone');
  // Existing action recipes sometimes name the operation in their exact phase
  // field. Emotion labels and facial-only prose cannot claim that operation.
  const facialOnly = isFacialPredicate(semantic.text);
  return textAction === "generic" && semantic.trackKind === "bone" && !facialOnly
    ? operationalPhases[phase] ?? textAction : textAction;
}
function setArm(
  arm: ActorArmPose,
  side: Side,
  upper: number,
  lower: number,
  hand: HandShape,
): void {
  const sign = side === "left" ? 1 : -1;
  arm.upper = sign * upper;
  arm.lower = sign * lower;
  arm.hand = hand;
}
function gazeDirection(
  value: Record<string, unknown>,
  text: string,
  current: [number, number],
): [number, number] {
  const x = number(value.gazeX ?? value.targetX, Number.NaN);
  const y = number(value.gazeY ?? value.targetY, Number.NaN);
  if (Number.isFinite(x) || Number.isFinite(y))
    return [
      Number.isFinite(x) ? clamp(x, -34, 34) : current[0],
      Number.isFinite(y) ? clamp(y, -24, 24) : current[1],
    ];
  const direction = String(value.direction ?? value.side ?? "").toLowerCase();
  if (/left/.test(direction) || /left|off-axis/.test(text))
    return [-18, current[1]];
  if (/right/.test(direction) || /right|speaker|target|audience/.test(text))
    return [18, current[1]];
  if (/up|above/.test(direction)) return [current[0], -14];
  if (/down|below/.test(direction)) return [current[0], 14];
  return current;
}
function semanticEvents(actor: PoseActor): SemanticEvent[] {
  const result: SemanticEvent[] = [];
  for (const track of actor.tracks) {
    // Facial state is evaluated separately; its metadata cannot claim body bones.
    if (track.kind === "expression") continue;
    const active = track.events.filter(item => item.active)
      .sort((a, b) => eventStart(a) - eventStart(b));
    const selected = track.kind === "bone" ? active : active.slice(-1);
    for (const event of selected) {
    const value: Record<string, unknown> = {
      ...record(event.value),
      ...(event.target ? { target: event.target } : {}),
    };
    if (event.kind === "speech") value.text = event.text;
    const parts = new Set<string>();
    for (const part of Array.isArray(value.parts)
      ? value.parts
      : Array.isArray(event.parts)
        ? event.parts
        : [])
      if (typeof part === "string") parts.add(part);
    const text = (track.kind === "bone"
      ? [value.action ?? value.operation ?? value.name]
      : [value.action,value.phase,value.name,value.operation,value.target,track.kind])
      .filter((v): v is string => typeof v === "string")
      .join(" ")
      .toLowerCase();
    if (track.kind === "bone" && event !== active.at(-1)) {
      // A newer claim only supersedes the arm chains it actually owns.
      const later = active.filter(item => eventStart(item) > eventStart(event));
      for (const suffix of ["l", "r"]) {
        const chain = [`arm_u_${suffix}`, `arm_l_${suffix}`, `hand_${suffix}`];
        if (later.some(item => {
          const v = record(item.value);
          const predicate = String(v.action ?? v.operation ?? v.name ?? '').toLowerCase();
          if (isFacialPredicate(predicate)) return false;
          const claimed = Array.isArray(v.parts) ? v.parts : item.parts;
          return Array.isArray(claimed) && chain.some(part => claimed.includes(part));
        })) for (const part of chain) parts.delete(part);
      }
      if (![...parts].some(part => /^(arm_[ul]|hand)_[lr]$/.test(part))) continue;
    }
    result.push({
      event,
      value,
      text,
      parts,
      progress: clamp(event.progress, 0, 1),
      trackKind: track.kind,
    });
  }
    }
  return result;
}

function eventEnd(event: PoseTrackEvent): number {
  const start = eventStart(event);
  return number(event.endFrame ?? event.end,
    start + number(event.durationFrames ?? event.duration, 1));
}
function poseSample(actor: PoseActor, frame: number, before?: number): PoseActor {
  return {...actor, tracks: actor.tracks.map(track => ({...track,
    events: track.events.filter(event => before === undefined || track.kind !== "bone" || eventStart(event) < before)
      .map(event => {
        const start = eventStart(event), end = eventEnd(event);
        return {...event, active: frame >= start && frame < end,
          progress: clamp((frame-start)/Math.max(1,end-start),0,1)};
      })}))};
}

export function deriveActorPose(actor: PoseActor, continuity = true): ActorPose {
  const expression = actor.expression;
  const expressionText = [
    expression.name,
    expression.brow,
    expression.eyes,
    expression.mouth,
  ]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
  const armLeft: ActorArmPose = { upper: 0, lower: 0, hand: "rest" };
  const armRight: ActorArmPose = { upper: 0, lower: 0, hand: "rest" };
  const legLeft: ActorLegPose = { upper: 0, lower: 0 };
  const legRight: ActorLegPose = { upper: 0, lower: 0 };
  let torsoTilt = 0;
  let torsoY = 0;
  let torsoScaleY = 1;
  let headTilt = 0;
  let headY = 0;
  let gaze: [number, number] = [
    clamp(expression.gaze[0], -1, 1) * 20,
    clamp(expression.gaze[1], -1, 1) * 13,
  ];
  let mouthOpen = clamp(expression.lipsPart, 0, 1) * 24;
  let smile = clamp(expression.smile, -1, 1);
  let speechActive = false;
  let speechOpen = false;
  let slamPeak = false;
  for (const semantic of semanticEvents(actor)) {
    const { text, progress: p } = semantic;
    const amount = clamp(number(semantic.value.intensity, 1), 0, 1);
    const action = semanticAction(semantic);
    const timedNative = actor.artwork && semantic.trackKind === "bone";
    const envelope = smooth(p / .5) * (1 - smooth((p - .5) / .5));
    // Native timed gestures return to rest within the authored interval.
    const eased = (timedNative && action !== "present"
      ? envelope : easeOut(p)) * amount;
    const before = {armLeft:{...armLeft},armRight:{...armRight}};
    const sides = eachSide(semantic);
    const hand = handFor(text, amount);
    // A channel that names no body part poses no body: a gaze/eyeline beat aims
    // the eyes and leaves the torso and arms to the motor (docs/WORLD_PUPPET_MOTOR.md).
    const posesBody = sides.length > 0 || semantic.parts.size > 0;
    if (
      semantic.trackKind === "gaze" ||
      semantic.event.kind === "gaze" ||
      /gaze|look|eyeline|attention|speaker|target/.test(text)
    )
      gaze = gazeDirection(semantic.value, text, gaze);
    if (
      semantic.trackKind === "speech" ||
      semantic.event.kind === "speech" ||
      "text" in semantic.value ||
      "line" in semantic.value
    ) {
      speechActive = true;
      const start = eventStart(semantic.event);
      const end = number(semantic.event.endFrame, start + 18);
      const sampleFrame = start + p * Math.max(18, end - start);
      const speed = Math.max(0.01, number(semantic.value.speed, 1));
      // Rhubarb viseme cues (docs/WORLD_PUPPET_MOTOR.md): real mouth shapes
      // when analysis exists; the alternating flap remains the fallback.
      const mouthCues = semantic.value.mouth as
        | ReadonlyArray<{ start: number; end: number; viseme: string }>
        | undefined;
      if (Array.isArray(mouthCues) && mouthCues.length) {
        const sampleSec = (sampleFrame - start) / 24;
        const cue =
          mouthCues.find(
            (cue) => sampleSec >= cue.start && sampleSec < cue.end,
          ) ?? (sampleSec < mouthCues[0]!.start ? mouthCues[0]! : undefined);
        const viseme = cue?.viseme ?? "X";
        const openness: Record<string, number> = {
          A: 1,
          E: 0.78,
          H: 0.6,
          C: 0.5,
          G: 0.42,
          D: 0.34,
          F: 0.28,
          L: 0.22,
          B: 0.1,
          X: 0,
        };
        mouthOpen = Math.max(
          mouthOpen,
          (openness[viseme] ?? 0.4) * 34 * amount,
        );
        speechOpen = (openness[viseme] ?? 0) > 0.15;
      } else {
        speechOpen =
          (Math.floor((sampleFrame * speed) / 5) + roleFor(actor.id)) % 2 === 0;
        mouthOpen = speechOpen ? Math.max(mouthOpen, 10 + 12 * amount) : 0;
      }
    }
    if (!posesBody) {
      // Eyes only: the gaze branch above already aimed them.
    } else if (action === "walk") {
      const stride = alternating(p, 2) * Math.max(amount, 0.75);
      legLeft.upper += 25 * stride;
      legRight.upper -= 25 * stride;
      legLeft.lower -= 14 * stride;
      legRight.lower += 14 * stride;
      torsoTilt -= 4 * stride;
      // The head follows the body: same lean direction, damped — the neck
      // never counter-bends against the torso (docs/WORLD_PUPPET_MOTOR.md).
      headTilt += -1.5 * stride;
    } else if (action === "slam") {
      const peak = p >= 0.42;
      slamPeak ||= peak;
      armRight.hand = "fist";
      armRight.upper = timedNative ? -108 * eased : peak ? -108 : -122 * (0.35 + 0.65 * p);
      armRight.lower = timedNative ? 18 * eased : peak ? 18 : -12;
      torsoTilt += timedNative ? 16 * eased : peak ? 16 : -8 * p;
      torsoY += timedNative ? 16 * eased : peak ? 16 : 0;
    } else if (action === "pat") {
      for (const side of sides)
        setArm(
          side === "left" ? armLeft : armRight,
          side,
          72 * eased,
          -34 * eased,
          "open",
        );
      torsoY += 5 * eased;
      headTilt += 3 * bell(p);
    } else if (action === "sip") {
      for (const side of sides)
        setArm(
          side === "left" ? armLeft : armRight,
          side,
          92 * eased,
          -50 * eased,
          "open",
        );
      headTilt += 5 * eased;
      gaze[1] += 3 * eased;
    } else if (action === "type") {
      for (const side of sides)
        setArm(
          side === "left" ? armLeft : armRight,
          side,
          38 * eased,
          30 * eased,
          "splayed",
        );
      torsoTilt += 7 * eased;
      torsoY += 4 * eased;
    } else if (action === "write") {
      const side = sides.includes("right") ? "right" : "left";
      setArm(
        side === "left" ? armLeft : armRight,
        side,
        64 * eased,
        24 * eased,
        "point",
      );
      torsoTilt += side === "right" ? 7 * eased : -7 * eased;
      gaze[1] += 8 * eased;
    } else if (action === "count") {
      const side = sides.includes("right") ? "right" : "left";
      setArm(
        side === "left" ? armLeft : armRight,
        side,
        112 * eased,
        8 * eased,
        "point",
      );
      gaze = side === "left" ? [-12, -10] : [12, -10];
    } else if (action === "scatter") {
      for (const side of sides)
        setArm(
          side === "left" ? armLeft : armRight,
          side,
          -46 * eased,
          22 * eased,
          "splayed",
        );
      torsoTilt += 9 * bell(p);
      torsoY += 8 * eased;
    } else if (action === "present") {
      const present = actor.artwork ? eased * (1 - smooth((p - .5) / .5)) : eased;
      for (const side of sides)
        setArm(
          side === "left" ? armLeft : armRight,
          side,
          48 * present,
          34 * present,
          "open",
        );
      torsoTilt += 4 * present;
      gaze = [0, -5];
    } else if (action === "scratch") {
      const side = sides.includes("right") ? "right" : "left";
      setArm(
        side === "left" ? armLeft : armRight,
        side,
        118 * eased,
        32 * eased,
        "splayed",
      );
      headTilt += (side === "left" ? -1 : 1) * 9 * bell(p);
    } else if (action === "touch") {
      for (const side of sides)
        setArm(
          side === "left" ? armLeft : armRight,
          side,
          54 * eased,
          -18 * eased,
          "open",
        );
      torsoTilt += (sides.includes("left") ? -1 : 1) * 9 * eased;
    } else {
      const bodyText = (semantic.trackKind === 'bone' ? bodyOperationText(text) : text).replace(/\S*[.:/_]\S*/g, ' ');
      if (/\b(?:raise|lift|signal|reach|extend)\b/.test(bodyText) &&
          !/\bsternum\b/.test(bodyText)) {
        for (const side of sides)
          setArm(
            side === "left" ? armLeft : armRight,
            side,
            106 * eased,
            0,
            hand,
          );
        gaze = [sides.includes("left") ? -14 : 14, -3];
      }
      if (/\b(?:lower|sink|collapse|crouch|drop)\b/.test(bodyText) &&
          (semantic.parts.size === 0 || hasPart(semantic,"torso"))) {
        torsoY += 28 * eased;
        torsoScaleY -= 0.1 * eased;
        headY += 16 * eased;
      }
      const gesture = bell(p) * amount;
      if (hasPart(semantic, "head") && /\b(?:cant|chin)\b/.test(text)) {
        headTilt += (/back|rise|rises/.test(text) ? -3 : 3) * gesture;
      }
      if (hasPart(semantic, "torso") && /\bsternum\b/.test(text))
        torsoTilt -= 2 * gesture;
      if (hasPart(semantic, "torso") && /\bbreath\b/.test(text))
        torsoY += 1.5 * gesture;
      if (/turn|rotate|orient|away/.test(text) &&
          !/front|back|left|right|orient/.test(text))
        torsoTilt += 16 * (p - 0.5) * amount * bell(p);
    }
    if (timedNative && semantic.parts.size) {
      if (!sideOf(semantic,"left")) Object.assign(armLeft,before.armLeft);
      if (!sideOf(semantic,"right")) Object.assign(armRight,before.armRight);
    }
    if (/smile|laugh|excited|relief|satisfied|proud|brighten/.test(text))
      smile = Math.max(smile, 0.7 * amount);
    if (
      /open|laugh|speak|talk|plead|cutoff|drink|sip/.test(text) &&
      !speechActive
    )
      mouthOpen = Math.max(mouthOpen, 12 + 15 * amount);
    if (/somber|tight|pressed|flat|closed/.test(text))
      mouthOpen = Math.min(mouthOpen, 5 + 4 * (1 - amount));
    if (/wide|raised|high|bright/.test(text)) gaze[1] -= 7 * amount;
    if (/downcast|down|narrow|knit/.test(text)) gaze[1] += 7 * amount;
  }
  if (continuity) {
    const claims = semanticEvents(actor).filter(e => e.trackKind === "bone");
    const takeovers = claims.filter(e => actor.tracks.some(track => track.kind === "bone" &&
      track.events.some(old => eventStart(old) < eventStart(e.event) &&
        eventEnd(old) > eventStart(e.event))));
    const corrected = new Set<Side>();
    let bodyCorrected = false;
    for (const claim of takeovers.sort((a,b) => eventStart(b.event)-eventStart(a.event))) {
      const weight = 1-smooth(claim.progress/.5);
      if (weight === 0) continue;
      const start = eventStart(claim.event);
      const seed = deriveActorPose(poseSample(actor,start,start));
      for (const side of eachSide(claim)) {
        if (corrected.has(side)) continue;
        corrected.add(side);
        const arm = side === "left" ? armLeft : armRight;
        const from = side === "left" ? seed.armLeft : seed.armRight;
        // Crossfade the claimed chain, not an additive onset offset: adding
        // the full successor envelope to the seed doubles takeover velocity.
        arm.upper += (from.upper-arm.upper)*weight;
        arm.lower += (from.lower-arm.lower)*weight;
      }
      if (!bodyCorrected) {
        torsoScaleY += (seed.torsoScaleY-torsoScaleY)*weight;
        torsoTilt += (seed.torsoTilt-torsoTilt)*weight;
        torsoY += (seed.torsoY-torsoY)*weight;
        headTilt += (seed.headTilt-headTilt)*weight;
        headY += (seed.headY-headY)*weight;
        bodyCorrected = true;
      }
    }
  }
  if (actor.pose === "collapsed") {
    torsoY += 48;
    torsoScaleY = 0.84;
    torsoTilt += 16;
    headTilt += 15;
    legLeft.upper -= 28;
    legRight.upper += 28;
  }
  if (/shock|panic|fear|desperate|error|urgent|surpris/.test(expressionText)) {
    gaze[1] -= 5;
    mouthOpen = Math.max(mouthOpen, 22);
  }
  const eyeOpen = clamp(
    number(expression.eyeOpen, 1) *
      (/narrow|crinkle|downcast/.test(expressionText)
        ? 0.72
        : /wide|bright/.test(expressionText)
          ? 1.3
          : 1),
    0.15,
    1.5,
  );
  const browLift =
    number(expression.brow, 0) ||
    (/raised|high|wide/.test(expressionText)
      ? -18
      : /low|knit/.test(expressionText)
        ? 10
        : 0);
  return {
    torsoTilt: clamp(torsoTilt, -34, 42),
    torsoY: clamp(torsoY, 0, 72),
    torsoScaleY: clamp(torsoScaleY, 0.78, 1),
    headTilt: clamp(headTilt, -28, 30),
    headY: clamp(headY, -16, 42),
    armLeft: {
      upper: clamp(armLeft.upper, -150, 150),
      lower: clamp(armLeft.lower, -90, 90),
      hand: armLeft.hand,
    },
    armRight: {
      upper: clamp(armRight.upper, -150, 150),
      lower: clamp(armRight.lower, -90, 90),
      hand: armRight.hand,
    },
    legLeft: {
      upper: clamp(legLeft.upper, -42, 42),
      lower: clamp(legLeft.lower, -42, 42),
    },
    legRight: {
      upper: clamp(legRight.upper, -42, 42),
      lower: clamp(legRight.lower, -42, 42),
    },
    gaze: [clamp(gaze[0], -34, 34), clamp(gaze[1], -24, 24)],
    eyeOpen,
    browLift,
    mouthOpen: clamp(mouthOpen, 0, 34),
    smile: clamp(smile, -1, 1),
    speechActive,
    speechOpen,
    slamPeak,
  };
}

export function faceFamily(expression: string): FaceFamily {
  const value = expression.toLowerCase();
  if (/cry|sob|weep|bawl/.test(value)) return "somber";
  if (/shock|surpris|astonish/.test(value)) return "shock";
  if (/fear|panic|terrifi/.test(value)) return "fear";
  if (/desperate|plead|beg/.test(value)) return "desperate";
  if (/confus|puzzl|uncertain/.test(value)) return "confused";
  if (/skeptic|doubt|disbel/.test(value)) return "skeptical";
  if (/embarrass|shy|flush/.test(value)) return "embarrassed";
  if (/relief|relieved|exhale/.test(value)) return "relief";
  if (/excited|delight|joy|thrill/.test(value)) return "excited";
  if (/proud|smug|triumph/.test(value)) return "proud";
  if (/somber|sad|grief|serious/.test(value)) return "somber";
  return "calm";
}
export function activeSpeech(actor: PoseActor): boolean {
  return actor.tracks.some((track) =>
    track.events.some(
      (event) =>
        event.active &&
        (typeof event.text === "string" || String(event.kind) === "speech"),
    ),
  );
}

export interface ActorFigure {
  pose: ActorPose;
  solved: SolvedSkeleton | undefined;
  skeletonPose: SkeletonPose;
  flipped: boolean;
  waistPitch: number;
  space: { width: number; height: number };
  skeleton: PoseActor["skeleton"];
}
/** Single pose+FK source for the drawn figure: the renderer and the physics
 * debug overlay both consume this, so what is drawn and what is measured are
 * the same computation by construction (docs/WORLD_PUPPET_MOTOR.md). */
export function solveActorFigure(actor: PoseActor): ActorFigure {
  const pose = deriveActorPose(actor);
  // Motor trajectory (docs/WORLD_PUPPET_MOTOR.md): physical lean, planted-feet
  // walk cycle, and a reaching/exerting arm override the heuristics.
  if (actor.motor) {
    pose.torsoTilt += actor.lean ?? 0;
    // Head follow-through: without an authored head action the head continues
    // the body's lean (same direction, damped) — the neck stays a living
    // hinge, not a spring pulling the head upright.
    pose.headTilt += (actor.lean ?? 0) * 0.45;
    const phase = actor.walk ?? 0;
    if (phase > 0) {
      const swing = Math.sin(phase * Math.PI * 2) * 26;
      pose.legLeft.upper += swing;
      pose.legRight.upper -= swing;
      pose.legLeft.lower -= Math.max(0, swing) * 0.9;
      pose.legRight.lower -= Math.max(0, -swing) * 0.9;
      pose.torsoY += Math.abs(Math.sin(phase * Math.PI * 2)) * 6;
      pose.headTilt += -1.5 * Math.sin(phase * Math.PI * 2);
    }
  }
  // Forward kinematics from the declared skeleton: the drawn joints are THE
  // physics joints (docs/WORLD_PUPPET_MOTOR.md Slice 1).
  const sk = actor.skeleton;
  const space = sk?.space ?? { width: 400, height: 720 };
  const orientation = actor.orientation ?? "front";
  const flipped =
    orientation === "front" || orientation === "back"
      ? actor.flip
      : orientation === "left" || orientation.endsWith("-left")
        ? true
        : false;
  let waistPitch = pose.torsoTilt + (actor.motor ? (actor.waist ?? 0) : 0);
  if (actor.artwork && sk) {
    if (actor.motor && semanticEvents(actor).some(event => semanticAction(event) === 'present')) {
      // Physical right-hand interactions do not imply a two-arm presentation.
      // Keep unclaimed arms relaxed; any explicit arm-chain bone claim wins.
      const authoredParts = semanticEvents(actor)
        .filter(event => event.trackKind === 'bone' && semanticAction(event) !== 'present')
        .flatMap(event => [...event.parts]);
      const claimsArm = (side: 'l' | 'r') =>
        [`arm_u_${side}`, `arm_l_${side}`, `hand_${side}`].some(part => authoredParts.includes(part));
      if (!claimsArm('l')) {
        pose.armLeft = {upper: 0, lower: 0, hand: 'rest'};
      }
      if (!claimsArm('r')) {
        pose.armRight = {upper: 0, lower: 0, hand: 'rest'};
      }
    }
    if (actor.motor) pose.torsoY = nativeCrouchDrop(sk) * (actor.crouch ?? 0);
    const phase = actor.motor ? actor.walk ?? 0 : 0;
    if (actor.worldFootTargets || pose.torsoY !== 0 || phase > 0) {
      const wave = Math.sin(phase*Math.PI*2);
      for (const side of ["l","r"] as const) {
        const foot = sk.joints[`foot_${side}`]!;
        const swing = side === "l" ? wave : -wave;
        const world=actor.worldFootTargets?.[side];
        const target: [number,number] = world
          ? [space.width/2+(flipped?-1:1)*(world[0]-actor.x)/actor.scale,space.height+(world[1]-actor.y)/actor.scale]
          : [foot[0]+swing*40,foot[1]-Math.max(0,swing)*22];
        const leg = plantedLegAngles(sk,side,pose.torsoY,target);
        if (side === "r") pose.legRight=leg;else pose.legLeft=leg;
      }
    }
  }
  if (actor.motor && actor.reach && sk) {
    // Two-bone IK onto the motor's reach point (pure helper, geometrically
    // tested): the drawn hand lands on the same world point the physics uses
    // (grab, push, carry).
    const weight = actor.reachInfluence ?? 1;
    const reachActor = actor.artwork ? {...actor,y:actor.y+pose.torsoY*actor.scale,
      // Loaded contact owns the torso. Unloaded withdrawal restores authored
      // acting with the same continuous influence as the returning arm.
      waist:(actor.waist??0)+(pose.torsoTilt-(actor.lean??0))*(1-weight)} : actor;
    let reachResult = solveReach(reachActor);
    if (actor.artwork && weight < 1) {
      const authored = solveSkeleton(sk,{waistPitch,facing:1,armR:pose.armRight,
        waistY:pose.torsoY,torsoScaleY:1});
      const rest = designHandToWorld(actor,authored.joints.hand_r!,space,flipped);
      const target: [number,number] = [rest[0]+(actor.reach[0]-rest[0])*weight,
        rest[1]+(actor.reach[1]-rest[1])*weight];
      reachResult = solveReach({...reachActor,reach:target});
    }
    const angleWeight = actor.artwork ? 1 : weight;
    pose.armRight = {
      upper: pose.armRight.upper + (reachResult.armRight.upper - pose.armRight.upper) * angleWeight,
      lower: pose.armRight.lower + (reachResult.armRight.lower - pose.armRight.lower) * angleWeight,
      hand: weight > .5 ? reachResult.armRight.hand : pose.armRight.hand,
    };
    pose.torsoTilt += reachResult.torsoTiltBoost;
    if (actor.artwork) {
      // Asset palms use the authoritative motor frame, not extra heuristic
      // breathing/bobbing that would translate the hand off its contact point.
      waistPitch = reachResult.waistPitch;
      pose.torsoScaleY = 1;
    }
  }
  if (actor.motor && actor.reachLeft && sk) {
    // The off hand (R7): the same two-bone solve on the LEFT rest chain. The
    // torso is the right arm's to load (torsoTiltBoost is not added twice), so
    // a left hold leaves the striking arm's composition untouched.
    const leftActor = actor.artwork
      ? {...actor, y: actor.y + pose.torsoY * actor.scale, reach: actor.reachLeft, contact: actor.contactLeft === true}
      : {...actor, reach: actor.reachLeft, contact: actor.contactLeft === true};
    const left = solveArmOntoReach(leftActor, "l");
    pose.armLeft = {upper: left.arm.upper, lower: left.arm.lower, hand: left.arm.hand};
  }
  const skeletonPose: SkeletonPose = actor.skeletonPose ?? {
    waistPitch,
    facing: (actor.artwork ? 1 : flipped ? -1 : 1) as 1|-1,
    armR: pose.armRight, armL:pose.armLeft,
    ...(actor.artwork ? {waistY:pose.torsoY,torsoScaleY:pose.torsoScaleY,
      legR:pose.legRight,legL:pose.legLeft} : {}),
  };
  if(actor.skeletonPose){
    waistPitch=skeletonPose.waistPitch??0;
    pose.torsoY=skeletonPose.waistY??0;
    pose.torsoScaleY=skeletonPose.torsoScaleY??1;
    if(skeletonPose.armR)Object.assign(pose.armRight,skeletonPose.armR);
    if(skeletonPose.armL)Object.assign(pose.armLeft,skeletonPose.armL);
    if(skeletonPose.legR)Object.assign(pose.legRight,skeletonPose.legR);
    if(skeletonPose.legL)Object.assign(pose.legLeft,skeletonPose.legL);
  }
  const solved=sk?solveSkeleton(sk,skeletonPose):undefined;
  return {pose,solved,skeletonPose,flipped,waistPitch,space,skeleton:sk};
}
