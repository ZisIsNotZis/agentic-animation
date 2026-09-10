// Pose-aware 45-degree views: every direction consumes the same ActorPose as
// the front view — motor actions (reach, walk, speech) must be visible in
// markup, and BOTH hands must exist (the far arm foreshortened, not missing).
import {test} from "node:test";
import assert from "node:assert/strict";
import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {QuarterFrontView, SideView, BackView, QuarterBackView} from "../src/components/performance/views45";
import type {ActorPose} from "../src/components/performance/Actor";

const restPose: ActorPose = {
  torsoTilt: 0, torsoY: 0, torsoScaleY: 1, headTilt: 0, headY: 0,
  armLeft: {upper: 0, lower: 0, hand: "rest"}, armRight: {upper: 0, lower: 0, hand: "rest"},
  legLeft: {upper: 0, lower: 0}, legRight: {upper: 0, lower: 0},
  gaze: [0, 0], eyeOpen: 1, browLift: 0, mouthOpen: 0, smile: 0,
  speechActive: false, speechOpen: false, slamPeak: false,
};
// A motor reach: the drive hand extends hard, walk cycle mid-swing, fist.
const reachPose: ActorPose = {
  ...restPose,
  armRight: {upper: -84, lower: -6, hand: "fist"},
  armLeft: {upper: 12, lower: 4, hand: "rest"},
  legLeft: {upper: -18, lower: 8}, legRight: {upper: 14, lower: -6},
  torsoTilt: -9, speechActive: true, speechOpen: true, mouthOpen: 22,
};

const views: Array<[string, React.ReactElement]> = [
  ["QuarterFrontView", <QuarterFrontView role={0} label="f1" pose={reachPose} solved={undefined} expression="calm" />],
  ["SideView", <SideView role={0} label="f1" pose={reachPose} solved={undefined} expression="calm" />],
  ["BackView", <BackView role={0} label="f1" pose={reachPose} solved={undefined} expression="calm" />],
  ["QuarterBackView", <QuarterBackView role={0} label="f1" pose={reachPose} solved={undefined} expression="calm" />],
];

test("views45: every view is pose-reactive (rotations from the pose appear in markup)", () => {
  for (const [name, element] of views) {
    const reach = renderToStaticMarkup(element);
    const rest = renderToStaticMarkup(React.cloneElement(element as React.ReactElement<{pose: ActorPose}>, {pose: restPose}));
    assert.notEqual(reach, rest, `${name} must render differently for different poses`);
    assert.ok(reach.includes("rotate(-84"), `${name} must contain the near-arm reach rotation`);
    assert.ok(reach.includes("rotate(12"), `${name} must contain the far-arm rotation`);
    assert.ok(reach.includes("rotate(-25") || reach.includes("rotate(-18"), `${name} must contain the walk-swing leg rotation`);
  }
});

test("views45: both hands exist in every direction (near + far, never missing)", () => {
  for (const [name, element] of views) {
    const markup = renderToStaticMarkup(element);
    assert.ok(markup.includes('aria-label="near hand"'), `${name} must render a near hand`);
    assert.ok(markup.includes('aria-label="far hand"'), `${name} must render a far hand (foreshortened, not missing)`);
  }
});

test("views45: speech shows on faces that are visible (quarter/side), not on the back", () => {
  const quarter = renderToStaticMarkup(<QuarterFrontView role={0} label="f1" pose={reachPose} solved={undefined} expression="calm" />);
  assert.ok(quarter.includes("#7a2e2e"), "quarter front must draw the open mouth");
  const side = renderToStaticMarkup(<SideView role={0} label="f1" pose={reachPose} solved={undefined} expression="calm" />);
  assert.ok(side.includes("#7a2e2e"), "side profile must draw the open mouth");
  const back = renderToStaticMarkup(<BackView role={0} label="f1" pose={reachPose} solved={undefined} expression="calm" />);
  assert.ok(!back.includes("#7a2e2e"), "back view shows no facial features");
});

test("views45: torso lean from the pose reaches the markup", () => {
  const markup = renderToStaticMarkup(<QuarterFrontView role={0} label="f1" pose={reachPose} solved={undefined} expression="calm" />);
  assert.ok(markup.includes("rotate(-9 212 500)"), "torso transform must include the pose lean");
});
