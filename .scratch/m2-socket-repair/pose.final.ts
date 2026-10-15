import type {EvaluatedActor, EvaluatedTrackEvent} from "../../performance/types";
import {solveSkeleton, plantedLegAngles, type SolvedSkeleton} from "@anim/core/skeleton";
import {nativeCrouchDrop} from "@anim/core/motor";
import {solveReach} from "./reach";

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
  event: EvaluatedTrackEvent;
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
function eventStart(e: EvaluatedTrackEvent): number {
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
  const sides = (["left", "right"] as Side[]).filter((side) => sideOf(e, side));
  return sides.length ? sides : ["left", "right"];
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
function actionOf(text: string): string {
  if (/slam|impact|drive(?: it)? down/.test(text)) return "slam";
  if (/scatter|sprinkle|throw wide/.test(text)) return "scatter";
  if (/present|offer|handover|show/.test(text)) return "present";
  if (/point|index|direct|aim/.test(text)) return "point";
  if (/sip|drink|cup/.test(text)) return "sip";
  if (/type|keyboard/.test(text)) return "type";
  if (/write|scribble|pen/.test(text)) return "write";
  if (/count|enumerate/.test(text)) return "count";
  if (/pat|palm/.test(text)) return "pat";
  if (/scratch|itch/.test(text)) return "scratch";
  if (/touch|tap|press/.test(text)) return "touch";
  if (/walk|step|travel|stride|plant|arrive|depart/.test(text)) return "walk";
  if (/bow|hinge/.test(text)) return "bow";
  if (/nod|dip|chin/.test(text)) return "nod";
  if (/shiver|trembl|shake|cold/.test(text)) return "shiver";
  if (/think|thought|ponder/.test(text)) return "think";
  return "generic";
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
function semanticEvents(actor: EvaluatedActor): SemanticEvent[] {
  const result: SemanticEvent[] = [];
  for (const track of actor.tracks) {
    const event = track.events
      .filter((item) => item.active)
      .sort((a, b) => eventStart(a) - eventStart(b))
      .at(-1);
    if (!event) continue;
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
    const text = [
      value.action,
      value.phase,
      value.name,
      value.operation,
      value.target,
      track.kind,
    ]
      .filter((v): v is string => typeof v === "string")
      .join(" ")
      .toLowerCase();
    result.push({
      event,
      value,
      text,
      parts,
      progress: clamp(event.progress, 0, 1),
      trackKind: track.kind,
    });
  }
  return result;
}

export function deriveActorPose(actor: EvaluatedActor): ActorPose {
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
    const eased = easeOut(p) * amount;
    const action = actionOf(text);
    const sides = eachSide(semantic);
    const hand = handFor(text, amount);
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
    if (action === "walk") {
      const stride = alternating(p, 2) * Math.max(amount, 0.75);
      legLeft.upper += 25 * stride;
      legRight.upper -= 25 * stride;
      legLeft.lower -= 14 * stride;
      legRight.lower += 14 * stride;
      torsoTilt -= 4 * stride;
      // The head follows the body: same lean direction, damped — the neck
      // never counter-bends against the torso (docs/WORLD_PUPPET_MOTOR.md).
      headTilt += -1.5 * stride;
    } else if (action === "bow") {
      torsoTilt += 29 * bell(p) * Math.max(amount, 0.7);
      torsoY += 24 * easeOut(p);
      torsoScaleY -= 0.1 * eased;
      headTilt += 12 * bell(p);
      headY += 10 * eased;
      legLeft.upper -= 18 * eased;
      legRight.upper += 18 * eased;
    } else if (action === "nod") {
      const nod = bell(p);
      headTilt += 18 * nod;
      headY += 7 * nod;
      gaze[1] += 8 * nod;
    } else if (action === "shiver") {
      const shake = alternating(p, 4) * amount;
      torsoTilt += 7 * shake;
      headTilt += 5 * shake;
      armLeft.upper += 8 * shake;
      armRight.upper -= 8 * shake;
      armLeft.lower -= 5 * shake;
      armRight.lower += 5 * shake;
    } else if (action === "slam") {
      const peak = p >= 0.42;
      slamPeak ||= peak;
      armRight.hand = "fist";
      armRight.upper = peak ? -108 : -122 * (0.35 + 0.65 * p);
      armRight.lower = peak ? 18 : -12;
      torsoTilt += peak ? 16 : -8 * p;
      torsoY += peak ? 16 : 0;
    } else if (action === "point") {
      for (const side of sides)
        setArm(
          side === "left" ? armLeft : armRight,
          side,
          34 * eased,
          18 * eased,
          "point",
        );
      torsoTilt += (sides.includes("left") ? -1 : 1) * 5 * eased;
      gaze = sides.includes("left") ? [-18, -2] : [18, -2];
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
      for (const side of sides)
        setArm(
          side === "left" ? armLeft : armRight,
          side,
          48 * eased,
          34 * eased,
          "open",
        );
      torsoTilt += 4 * eased;
      gaze = [0, -5];
    } else if (action === "think") {
      const side = sides.includes("right") ? "right" : "left";
      setArm(
        side === "left" ? armLeft : armRight,
        side,
        78 * eased,
        -42 * eased,
        "open",
      );
      headTilt += (side === "left" ? -1 : 1) * 12 * eased;
      gaze = [side === "left" ? -10 : 10, -12];
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
      if (/raise|lift|signal|reach|extend/.test(text)) {
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
      if (/lower|sink|collapse|crouch|drop/.test(text)) {
        torsoY += 28 * eased;
        torsoScaleY -= 0.1 * eased;
        headY += 16 * eased;
      }
      if (/turn|rotate|orient|away/.test(text))
        torsoTilt += 16 * (p - 0.5) * amount;
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
export function activeSpeech(actor: EvaluatedActor): boolean {
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
  flipped: boolean;
  waistPitch: number;
  space: { width: number; height: number };
  skeleton: EvaluatedActor["skeleton"];
}
/** Single pose+FK source for the drawn figure: the renderer and the physics
 * debug overlay both consume this, so what is drawn and what is measured are
 * the same computation by construction (docs/WORLD_PUPPET_MOTOR.md). */
export function solveActorFigure(actor: EvaluatedActor): ActorFigure {
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
    if (actor.motor && semanticEvents(actor).some(event => actionOf(event.text) === 'present')) {
      // Physical right-hand interactions do not imply a two-arm presentation.
      // Keep unclaimed arms relaxed; any explicit arm-chain bone claim wins.
      const authoredParts = semanticEvents(actor)
        .filter(event => event.trackKind === 'bone' && actionOf(event.text) !== 'present')
        .flatMap(event => [...event.parts]);
      const claimsArm = (side: 'l' | 'r') =>
        [`arm_u_${side}`, `arm_l_${side}`, `hand_${side}`].some(part => authoredParts.includes(part));
      if (!claimsArm('l')) {
        pose.armLeft = {upper: 0, lower: 0, hand: 'rest'};
      }
      if (!actor.reach && !claimsArm('r')) {
        pose.armRight = {upper: 0, lower: 0, hand: 'rest'};
      }
    }
    if (actor.motor) pose.torsoY = nativeCrouchDrop(sk) * (actor.crouch ?? 0);
    const phase = actor.motor ? actor.walk ?? 0 : 0;
    if (pose.torsoY !== 0 || phase > 0) {
      const wave = Math.sin(phase*Math.PI*2);
      for (const side of ["l","r"] as const) {
        const foot = sk.joints[`foot_${side}`]!;
        const swing = side === "l" ? wave : -wave;
        const target: [number,number] = [foot[0]+swing*40,foot[1]-Math.max(0,swing)*22];
        const leg = plantedLegAngles(sk,side,pose.torsoY,target);
        if (side === "r") pose.legRight=leg;else pose.legLeft=leg;
      }
    }
  }
  if (actor.motor && actor.reach && sk) {
    // Two-bone IK onto the motor's reach point (pure helper, geometrically
    // tested): the drawn hand lands on the same world point the physics uses
    // (grab, push, carry).
    const reachActor = actor.artwork ? {...actor,y:actor.y+pose.torsoY*actor.scale} : actor;
    const reachResult = solveReach(reachActor);
    const authoredRight = semanticEvents(actor).some(event => event.trackKind === 'bone' &&
      ['arm_u_r','arm_l_r','hand_r'].some(part => event.parts.has(part)));
    const weight = authoredRight ? actor.reachInfluence ?? 1 : 1;
    pose.armRight = {
      upper: pose.armRight.upper + (reachResult.armRight.upper - pose.armRight.upper) * weight,
      lower: pose.armRight.lower + (reachResult.armRight.lower - pose.armRight.lower) * weight,
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
  const solved = sk
    ? solveSkeleton(sk, {
        waistPitch,
        facing: (actor.artwork ? 1 : flipped ? -1 : 1) as 1 | -1,
        armR: pose.armRight,
        armL: pose.armLeft,
        ...(actor.artwork ? {waistY:pose.torsoY,torsoScaleY:pose.torsoScaleY,legR:pose.legRight,legL:pose.legLeft} : {}),
      })
    : undefined;
  return { pose, solved, flipped, waistPitch, space, skeleton: sk };
}

