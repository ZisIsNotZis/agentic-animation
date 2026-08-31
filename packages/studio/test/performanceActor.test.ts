import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {deriveActorPose, faceFamily} from "../src/components/performance/Actor";
import type {EvaluatedActor} from "../src/performance";

function actor(events: Array<{kind?: string; value?: Record<string, unknown>; parts?: string[]; progress?: number; active?: boolean; frame?: number; endFrame?: number}>, expression: Record<string, unknown> = {}): EvaluatedActor {
  return {
    id: "test-actor", x: 0, y: 0, scale: 1, rotation: 0, flip: false, z: 0, present: true,
    expression: {name: "neutral", smile: 0, brow: 0, eyeOpen: 1, lipsPart: 0, gaze: [0, 0], ...expression}, anchors: {},
    tracks: [{kind: "bone", events: events.map((event, index) => ({frame: event.frame ?? index, endFrame: event.endFrame ?? (event.frame ?? index) + 1, progress: event.progress ?? 0.7, active: event.active ?? true, ...event}))}],
  } as EvaluatedActor;
}

function pose(action: string, parts: string[] = [], progress = 0.7): ReturnType<typeof deriveActorPose> {
  return deriveActorPose(actor([{value: {action, phase: action, parts}, progress}]));
}

test("semantic raise is eased, articulated, and establishes an eyeline", () => {
  const raised = pose("raise the hand above shoulder height", ["arm_u_r", "arm_l_r", "hand_r", "head"]);
  assert.ok(raised.armRight.upper <= -59);
  assert.notEqual(raised.armRight.hand, "rest");
  assert.notDeepEqual(raised.gaze, [0, 0]);
  assert.ok(Math.abs(pose("raise", ["arm_u_r"], 0.25).armRight.upper) < Math.abs(raised.armRight.upper));
});

test("the requested actions have materially different silhouette signatures", () => {
  const names = ["point", "pat", "sip", "type", "write", "count", "scatter", "present", "bow", "nod", "shiver", "think", "scratch", "touch", "slam", "walk"];
  const signatures = names.map((name) => {
    const p = pose(name, ["arm_u_r", "arm_l_r", "hand_r", "torso", "head", "leg_u_l", "leg_u_r"]);
    return [p.torsoTilt, p.torsoY, p.headTilt, p.headY, p.armLeft.upper, p.armRight.upper, p.armRight.lower, p.legLeft.upper, p.legRight.upper, p.armRight.hand, p.slamPeak].join(",");
  });
  assert.equal(new Set(signatures).size, names.length);
});

test("motion is seek-safe and has no old shared sinusoidal twitch recipe", () => {
  const samples = [0, 0.1, 0.25, 0.5, 0.75, 1].map((progress) => pose("walk", ["leg_u_l", "leg_u_r"], progress));
  assert.deepEqual(samples[2], pose("walk", ["leg_u_l", "leg_u_r"], 0.25));
  assert.notDeepEqual(samples[1].legLeft, samples[0].legLeft);
  assert.notDeepEqual(samples[4].legLeft, samples[2].legLeft);
});

test("slam semantics produce an unmistakable peak pose", () => {
  const peak = pose("drive it down on the surface", ["arm_u_r", "arm_l_r", "hand_r", "torso"], 0.7);
  assert.equal(peak.slamPeak, true);
  assert.equal(peak.armRight.hand, "fist");
  assert.ok(peak.armRight.upper < -60 && peak.armRight.lower > 0);
  assert.ok(peak.torsoY > 0 && peak.torsoTilt > 0);
});

test("speech alternates open and closed at a deterministic fixed cadence", () => {
  const samples = [0, 0.2, 0.4, 0.6, 0.8].map((progress) => deriveActorPose(actor([{kind: "speech", value: {text: "hello"}, progress, frame: 0, endFrame: 25}])));
  assert.equal(samples[0].speechActive, true);
  assert.ok(new Set(samples.map((sample) => sample.speechOpen)).size > 1);
  assert.equal(samples[1].speechOpen, deriveActorPose(actor([{kind: "speech", value: {text: "hello"}, progress: 0.2, frame: 0, endFrame: 25}])).speechOpen);
});

test("face families cover distinct eyes, pupils/gaze, brows, and mouth semantics", () => {
  const names = ["shock", "fear", "desperate", "confused", "skeptical", "embarrassed", "relief", "excited", "proud", "somber", "calm"];
  assert.deepEqual(names.map(faceFamily), names);
});

test("gaze tracks and target direction affect eye contact", () => {
  const left = deriveActorPose(actor([{kind: "gaze", value: {target: "Bob", direction: "left"}, progress: 1}]));
  const right = deriveActorPose(actor([{kind: "gaze", value: {target: "Bob", direction: "right"}, progress: 1}]));
  const explicit = deriveActorPose(actor([{kind: "gaze", value: {targetX: -30, targetY: 12}, progress: 1}]));
  assert.ok(left.gaze[0] < 0 && right.gaze[0] > 0);
  assert.deepEqual(explicit.gaze, [-30, 12]);
});

test("puppet geometry keeps the head attached and removes visible joint markers", () => {
  const source = readFileSync(new URL("../src/components/performance/Actor.tsx", import.meta.url), "utf8");
  assert.match(source, /articulated head and neck/);
  assert.match(source, /aria-label="neck connection"/);
  assert.doesNotMatch(source, /<circle[^>]+cx=\{(?:elbow|knee)\}/);
  assert.match(source, /strokeWidth=\{LIMB_OUTLINE\}/);
  assert.match(source, /strokeWidth=\{LIMB_FILL\}/);
  assert.match(source, /stroke=\{DARKS\[role\]\} strokeWidth=\{LIMB_OUTLINE\}/);
});

test("future semantic events do not alter the current frame", () => {
  const inactive = deriveActorPose(actor([{value: {action: "raise the hand", parts: ["arm_u_r", "hand_r"]}, active: false, progress: 0}]));
  assert.equal(inactive.armRight.upper, 0);
  assert.equal(inactive.armRight.hand, "rest");
});
