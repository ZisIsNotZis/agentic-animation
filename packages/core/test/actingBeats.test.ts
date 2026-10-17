import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {simulateScene, type MotorActorInput, type MotorScene} from "../src/motor";
import {solidSupport, thermosSolid, transformSolid} from "../src/motor/propGeometry";

/** Stage space the compiled actor/prop frames are in; `supportSurfaces` is
 *  stored normalized in stage width/height. */
const STAGE_WIDTH = 1920;
const STAGE_HEIGHT = 1080;
const SKELETON: MotorActorInput["skeleton"] = JSON.parse(readFileSync(new URL("../../../library/figure/lin/skeleton.json", import.meta.url), "utf8"));
const VIEWS: NonNullable<MotorActorInput["skeletonViews"]> = {
  front: SKELETON!, quarter: SKELETON!, side: SKELETON!, back: SKELETON!, quarter_back: SKELETON!,
};
const actor = (extra: Partial<MotorActorInput> = {}): MotorActorInput => ({
  id: "aqiang", x: 700, groundY: 691, facing: 1, scale: 1, skeleton: SKELETON, intents: [], ...extra,
});
const scene = (input: Partial<MotorScene> & {actors: MotorActorInput[]}): MotorScene => ({
  durationSec: 4, props: [], ...input,
  resolveX: input.resolveX ?? ((id) => input.actors.find((a) => a.id === id)?.x),
});
const heldFrames = (trajectory: ReturnType<typeof simulateScene>, actorId: string, prop: string): number[] =>
  (trajectory.actors[actorId] ?? []).map((frame, index) => (frame.holds === prop ? index : -1)).filter((index) => index >= 0);
const angleRange = (trajectory: ReturnType<typeof simulateScene>, actorId: string, from: number, to: number): number => {
  const values = (trajectory.actors[actorId] ?? []).slice(from, to + 1)
    .flatMap((frame) => frame.skeletonPose?.armR ? [frame.skeletonPose.armR.upper + frame.skeletonPose.armR.lower] : []);
  return Math.max(...values) - Math.min(...values);
};

test("M5 carrying step-back: a holder sent behind its facing steps back without turning", () => {
  const trajectory = simulateScene(scene({
    actors: [actor({intents: [
      {at: 0.1, duration: 1.5, intent: "move", target: "thermos", grab: "thermos"},
      {at: 2.2, duration: 1.4, intent: "move", target: "mark"},
    ]})],
    props: [{id: "thermos", x: 900, y: 560, size: [80, 120], intents: []}],
    resolveX: (id) => (id === "thermos" ? 900 : id === "mark" ? 600 : undefined),
  }));
  const frames = trajectory.actors.aqiang!;
  const stepStart = frames.findIndex((frame, index) => index > 0 && frames[index - 1]!.holds === "thermos" && frame.x < frames[index - 1]!.x - 1);
  assert.ok(stepStart > 0, "the carrying step-back never moved the body");
  assert.ok(frames.slice(stepStart).every((frame) => frame.facing === 1), "a carrying step-back must not turn (the held prop would mirror)");
  assert.ok(frames.at(-1)!.x <= 601, `the step-back did not reach the mark: ${frames.at(-1)!.x}`);
  const held = heldFrames(trajectory, "aqiang", "thermos");
  assert.ok(held.length > 0, "the prop was never held");
  // The prop is carried, never mirrored/teleported: a bounded per-frame move.
  const prop = trajectory.props.thermos!;
  // Ignore the bind's grip settle (the prop eases to the hand's center grip);
  // during the step-back itself the carried prop must be continuous.
  const maxJump = Math.max(...prop.slice(stepStart).map((frame, index) => Math.hypot(frame.x - prop[stepStart + index - 1]!.x, frame.y - prop[stepStart + index - 1]!.y)));
  assert.ok(maxJump <= 20, `the carried prop jumped ${maxJump.toFixed(1)}px during the step-back`);
  assert.equal(trajectory.diagnostics ?? null, null);
});

test("M5 acted hold: a shaped hold keeps the carried prop moving instead of locking", () => {
  const run = (settle: number) => simulateScene(scene({
    durationSec: 5,
    actors: [actor({intents: [{at: 0.1, duration: 1.5, intent: "move", target: "thermos", grab: "thermos", settle}]})],
    props: [{id: "thermos", x: 900, y: 560, size: [80, 120], intents: []}],
    resolveX: (id) => (id === "thermos" ? 900 : undefined),
  }));
  const still = run(0), shaped = run(1);
  const holdX = (trajectory: ReturnType<typeof simulateScene>) => trajectory.props.thermos!.slice(100, 119).map((frame) => frame.x);
  const range = (values: number[]) => Math.max(...values) - Math.min(...values);
  assert.ok(range(holdX(still)) < 0.5, `an unshaped hold must be still: ${range(holdX(still)).toFixed(2)}px`);
  assert.ok(range(holdX(shaped)) > 4, `a shaped hold must keep the prop alive: ${range(holdX(shaped)).toFixed(2)}px`);
  assert.equal(shaped.diagnostics ?? null, null);
});

test("M5 putdown visibility: a shaped placing release rests the prop clear of the holder", () => {
  const run = (settle: number) => simulateScene(scene({
    durationSec: 5,
    actors: [actor({intents: [
      {at: 0.1, duration: 1.5, intent: "move", target: "thermos", grab: "thermos"},
      {at: 2.4, duration: 0.8, intent: "release", target: "thermos", releaseMode: "place", settle},
    ]})],
    props: [{id: "thermos", x: 900, y: 691, size: [80, 120], intents: []}],
    supports: [{x0: 500, x1: 1500, y: 400}],
    groundY: 691,
    resolveX: (id) => (id === "thermos" ? 900 : undefined),
  }));
  const plain = run(0), shaped = run(1);
  const rest = (trajectory: ReturnType<typeof simulateScene>) => {
    const prop = trajectory.props.thermos!;
    const held = heldFrames(trajectory, "aqiang", "thermos");
    const release = held.length ? trajectory.actors.aqiang!.findIndex((f, index) => index > held.at(-1)! && f.holds !== "thermos") : -1;
    return {x: prop.at(-1)!.x, y: prop.at(-1)!.y, release};
  };
  const a = rest(plain), b = rest(shaped);
  assert.ok(a.release > 0 && b.release > 0, "the release never opened the hand");
  assert.ok(Math.abs(a.y - 400) <= 8 && Math.abs(b.y - 400) <= 8, `the prop must come to rest on the support: ${a.y}/${b.y}`);
  assert.ok(b.x - a.x > 30, `a shaped placement must clear the holder: ${a.x.toFixed(1)} -> ${b.x.toFixed(1)}`);
  assert.equal(shaped.diagnostics ?? null, null);
});

test("M5 push: the approach follows the target's live mark, so a moved target is still reached", () => {
  const target = actor({id: "awei", x: 998, facing: -1, intents: []});
  const trajectory = simulateScene(scene({
    actors: [actor({x: 672, intents: [{at: 0.5, duration: 1.4, intent: "push", target: "awei", reach: 0.35, forceSec: 0.25, force: 1.2}]}), target],
    // The staged mark is stale: the live target is at 998, not 1248.
    resolveX: (id) => (id === "awei" ? 1248 : undefined),
  }));
  const contacts = trajectory.actors.aqiang!.map((frame, index) => (frame.contact ? index : -1)).filter((index) => index >= 0);
  assert.ok(contacts.length > 0, "the push never reached the moved target");
  assert.ok(trajectory.actors.awei!.at(-1)!.x > 998 + 10, "the moved target was never staggered");
  assert.equal(trajectory.diagnostics ?? null, null);
});

test("M5 episode bake: support, ownership and the open putdown rest hold through every beat", async () => {
  const {loadAssetRegistry, loadPlugins, compileEpisode} = await import("../src/index");
  const repo = new URL("../../../", import.meta.url);
  const registry = await loadAssetRegistry(fileURLToPath(new URL("library", repo)));
  const plugins = await loadPlugins(fileURLToPath(new URL("library", repo)));
  const compiled = await compileEpisode(fileURLToPath(new URL("episodes/m5-acting/episode.yml", repo)), {
    registry, plugins, speechTiming: () => ({durationSec: 1, markers: {}}),
  });
  const motor = compiled.sceneTrack[0]!.motor!;
  assert.equal(motor.diagnostics ?? null, null, "the acting episode must bake without a motor diagnostic");
  const frames = motor.actors.awei!.length;
  for (const id of Object.keys(motor.actors)) {
    for (let i = 0; i < frames; i++) {
      const support = motor.actors[id]![i]!.footSupport;
      assert.ok(support && (support.l || support.r), `${id} has no supported foot at frame ${i}`);
    }
  }
  // Exactly one holder while carried, and the prop only moves while held or falling.
  const owners = Object.keys(motor.actors).map((id) => ({id, frames: heldFrames(motor as never, id, "thermos")}));
  const held = owners.find((entry) => entry.frames.length > 0);
  assert.ok(held, "the thermos is never held");
  const prop = motor.props.thermos!;
  for (let i = 1; i < prop.length; i++) {
    const jump = Math.hypot(prop[i]!.x - prop[i - 1]!.x, prop[i]!.y - prop[i - 1]!.y);
    assert.ok(jump <= 60, `the thermos jumped ${jump.toFixed(1)}px at frame ${i}`);
  }
  // The putdown rest is the released prop's settled frame: after the last time
  // the prop moved (a released prop only falls or slides, never drifts).
  const release = owners.every((entry) => entry.frames.length > 0)
    ? Math.max(...owners.map((entry) => entry.frames.at(-1)!)) : -1;
  assert.ok(release > 0, "the thermos is never released");
  const restFrame = prop.findIndex((frame, index) => index > release
    && Math.abs(frame.x - prop.at(-1)!.x) < 0.01 && Math.abs(frame.y - prop.at(-1)!.y) < 0.01);
  const rest = prop[restFrame]!;
  assert.ok(restFrame > release, "the prop never comes to rest");
  // The rest is the DRAWN base on the painted top, not the prop's anchor: the
  // anchor is the art's base point inside a rotated solid, so comparing it with
  // the surface measures the object's origin and goes blind to the object
  // (an upright prop hides that; a rotated one does not). Same derivation as
  // `actingInvariants` and the render-truth keys — `propGeometry.ts` is the one
  // authority for the drawn contour.
  const episodeScene = compiled.sceneTrack[0]!;
  const placement = (compiled as unknown as {
    assets: {objects: Record<string, {resolved?: {placement?: {size?: [number, number]; base?: number}}}>};
  }).assets.objects.thermos?.resolved?.placement;
  const solid = transformSolid(thermosSolid, placement?.size ?? [200, 160], placement?.base ?? 160,
    episodeScene.staging.objects.thermos!.scale);
  const lowest = solidSupport(solid, rest.rotation ?? 0);
  const base = rest.y + lowest.y;
  const surface = episodeScene.supportSurfaces?.find((entry) =>
    rest.x + lowest.x >= entry.x[0] * STAGE_WIDTH && rest.x + lowest.x <= entry.x[1] * STAGE_WIDTH);
  assert.ok(surface, `the putdown rest is off every declared support: x=${(rest.x + lowest.x).toFixed(2)}`);
  assert.ok(Math.abs(base - surface.y * STAGE_HEIGHT) <= 1,
    `the putdown rest's drawn base ${base.toFixed(2)} is not on the painted top ${(surface.y * STAGE_HEIGHT).toFixed(2)}`);
  const aweiX = motor.actors.awei![restFrame]!.x;
  assert.ok(rest.x - aweiX > 110, `the rest is not clear of the holder: ${(rest.x - aweiX).toFixed(1)}px`);
  // The handover hold is shaped: the elbow and forearm keep moving.
  const holder = owners.find((entry) => entry.id === "awei")!;
  const angles = motor.actors.awei!.slice(holder.frames[0]!, holder.frames.at(-1)! + 1)
    .flatMap((frame) => frame.skeletonPose?.armR ? [frame.skeletonPose.armR.upper + frame.skeletonPose.armR.lower] : []);
  assert.ok(Math.max(...angles) - Math.min(...angles) > 20, "the handover bind still locks the elbow and forearm");
});
