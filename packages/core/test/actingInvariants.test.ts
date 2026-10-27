/**
 * M5 acting invariants (evidence/art/ART_ACTING_M5.md "Invariants", docs/8_MOTOR.md
 * "Body geometry SSOT"): the classes of defect the WP3 review found, expressed
 * so that a regression fails the suite instead of reaching a reviewer.
 *
 * (a) no actored episode draws one actor's torso or head inside another's;
 * (b) a placed prop's DRAWN base sits on the declared support at its x, and the
 *     support's top art is composited below the prop plane;
 * (c) acting joint angles stay inside the figure's documented envelope, a low
 *     grab spends the crouch before it spends the waist, and a point's drawn
 *     elbow keeps a shaped bend.
 *
 * The drawn-body geometry is recomputed here from `test/helpers/actedBodies.ts`
 * (the ArtFigure transform), never read back from the motor's own beliefs.
 */
import {test} from "node:test";
import assert from "node:assert/strict";
import {readdirSync, readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {compileEpisode, loadAssetRegistry, loadNarrowEpisode, loadPlugins} from "../src/index";
import {simulateScene} from "../src/motor";
import {solidSupport, thermosSolid, transformSolid} from "../src/motor/propGeometry";
import {bodyOverlap, drawnElbowAngle, type BakedActorFrame} from "./helpers/actedBodies";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
const STAGE_HEIGHT = 1080;
/** A drawn-body intersection under this is ink touching ink, not a staged collision. */
const OVERLAP_TOLERANCE = 25;

type MotorFrame = BakedActorFrame & {lean?: number; reach?: [number, number]; holds?: string; crouch?: number};

async function compile(slug: string) {
  const registry = await loadAssetRegistry(resolve(REPO, "library"));
  const plugins = await loadPlugins(resolve(REPO, "library"));
  return compileEpisode(resolve(REPO, "episodes", slug, "episode.yml"), {
    registry, plugins, speechTiming: () => ({durationSec: 1, markers: {}}),
  });
}

interface MotorSceneShape {
  staging: {actors: Record<string, {at: [number, number]; scale: number}>};
  supportSurfaces?: Array<{name: string; x: [number, number]; y: number}>;
  motor: {actors: Record<string, MotorFrame[]>; props: Record<string, Array<{x: number; y: number; rotation?: number}>>; diagnostics?: string[]};
}

const frontSkeleton = (compiled: Awaited<ReturnType<typeof compile>>, id: string) => {
  const resolved = (compiled as unknown as {assets: {actors: Record<string, {use: {resolved: {artwork?: {views: {front: {skeleton: never}}}; skeleton?: never}}}>}}).assets.actors[id]!.use.resolved;
  return (resolved.artwork ? resolved.artwork.views.front.skeleton : resolved.skeleton) as never;
};

test("invariant: no actored episode draws one actor's torso or head inside another's", async (t) => {
  const slugs = readdirSync(resolve(REPO, "episodes"), {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  let checked = 0;
  const skipped: string[] = [];
  for (const slug of slugs) {
    let actorsInScript: string[];
    try {
      const episode = await loadNarrowEpisode(resolve(REPO, "episodes", slug, "episode.yml"));
      actorsInScript = [...new Set(episode.scenes.flatMap((scene) => Object.keys(scene.actors ?? {})))];
    } catch (error) {
      skipped.push(`${slug}: ${(error as Error).message}`);
      continue;
    }
    if (actorsInScript.length < 2) continue;
    let compiled: Awaited<ReturnType<typeof compile>>;
    try {
      compiled = await compile(slug);
    } catch (error) {
      // Two demonstration episodes need authored speech alignment before they
      // compile at all; their motor geometry is not exercised here.
      skipped.push(`${slug}: ${(error as Error).message}`);
      continue;
    }
    for (const scene of compiled.sceneTrack as unknown as MotorSceneShape[]) {
      if (!scene.motor) continue;
      const ids = Object.keys(scene.motor.actors).sort();
      if (ids.length < 2) continue;
      checked++;
      const frames = Math.min(...ids.map((id) => scene.motor.actors[id]!.length));
      let worst = {frame: -1, area: 0, pair: ""};
      for (let frame = 0; frame < frames; frame++) {
        for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i]!, b = ids[j]!;
          const overlap = bodyOverlap(
            {skeleton: frontSkeleton(compiled, a), frame: scene.motor.actors[a]![frame]!, scale: scene.staging.actors[a]!.scale, groundY: scene.staging.actors[a]!.at[1] * STAGE_HEIGHT},
            {skeleton: frontSkeleton(compiled, b), frame: scene.motor.actors[b]![frame]!, scale: scene.staging.actors[b]!.scale, groundY: scene.staging.actors[b]!.at[1] * STAGE_HEIGHT},
          );
          const area = overlap.torso + overlap.head;
          if (area > worst.area) worst = {frame, area, pair: `${a}/${b}`};
        }
      }
      assert.ok(worst.area <= OVERLAP_TOLERANCE,
        `${slug}: ${worst.pair} drawn bodies overlap ${worst.area.toFixed(0)}px² at frame ${worst.frame} (tolerance ${OVERLAP_TOLERANCE})`);
    }
  }
  assert.ok(checked >= 4, `expected at least 4 actored scenes, checked ${checked}; skipped ${skipped.join("; ")}`);
  if (skipped.length) t.diagnostic(`not exercised: ${skipped.join("; ")}`);
});

test("invariant: a placed prop's drawn base sits on the declared support, above its top art", async () => {
  const compiled = await compile("m5-acting");
  const objects = (compiled as unknown as {assets: {objects: Record<string, {resolved?: {placement?: {size?: [number, number]; base?: number}}}>}}).assets.objects;
  for (const scene of compiled.sceneTrack as unknown as MotorSceneShape[]) {
    if (!scene.motor) continue;
    for (const [id, frames] of Object.entries(scene.motor.props)) {
      const placement = objects[id]?.resolved?.placement;
      const staged = (scene as unknown as {staging: {objects: Record<string, {scale: number}>}}).staging.objects[id];
      if (!placement || !staged || staged.scale === undefined) continue;
      const solid = transformSolid(thermosSolid, placement.size ?? [200, 160], placement.base ?? 160, staged.scale);
      const rest = frames.at(-1)!;
      const base = rest.y + solidSupport(solid, rest.rotation ?? 0).y;
      const at = rest.x + solidSupport(solid, rest.rotation ?? 0).x;
      // Compiled supports are normalized (SCHEMAS.md "Set world declarations").
      const support = (scene.supportSurfaces ?? []).find((surface) => at >= surface.x[0] * 1920 && at <= surface.x[1] * 1920);
      assert.ok(support, `${id} rests at x ${rest.x.toFixed(1)} off every declared support`);
      const supportY = support.y * STAGE_HEIGHT;
      assert.ok(Math.abs(base - supportY) <= 0.5,
        `${id} drawn base ${base.toFixed(2)} is not on the declared support ${supportY} at x ${rest.x.toFixed(1)}`);

      // Composite order: the layer that paints the support's top is drawn
      // before the prop plane, so the prop is above the art it rests on.
      const locations = (compiled as unknown as {assets: {locations: Record<string, {ref: string}>}}).assets.locations;
      const setRef = locations[(scene as unknown as {location: string}).location]!.ref;
      const setDir = resolve(REPO, "library", setRef);
      const setManifest = JSON.parse(readFileSync(resolve(setDir, "manifest.json"), "utf8")) as {
        source: string; layers: Array<string | {id: string; foreground?: boolean}>; supports: Array<{name: string; paint: string}>;
      };
      const painted = setManifest.supports.find((entry) => entry.name === support.name)!.paint;
      const svg = readFileSync(resolve(setDir, setManifest.source), "utf8");
      const owner = owningGroup(svg, `id="${painted}"`);
      const declared = setManifest.layers.find((layer) => (typeof layer === "string" ? layer : layer.id) === owner);
      assert.ok(declared !== undefined, `support art "${painted}" is not inside a declared set layer (${owner})`);
      assert.notEqual(typeof declared === "string" ? false : declared.foreground === true, true,
        `support art "${painted}" is painted by foreground layer "${owner}", above the prop plane`);
    }
  }
});

/** Innermost declared <g id> that encloses the first occurrence of `needle`.
 *  Nested anonymous <g> groups are part of the art, not declared layers. */
function owningGroup(svg: string, needle: string): string | undefined {
  const at = svg.indexOf(needle);
  if (at < 0) return undefined;
  const stack: Array<string | undefined> = [];
  const pattern = /<g\b[^>]*>|<\/g>/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(svg)) && match.index < at) {
    if (match[0] === "</g>") stack.pop();
    else stack.push(/\bid="([^"]+)"/.exec(match[0])?.[1]);
  }
  return stack.reverse().find((id) => id !== undefined);
}

test("invariant: acting joint angles stay inside the documented envelopes", async () => {
  const compiled = await compile("m5-acting");
  for (const scene of compiled.sceneTrack as unknown as MotorSceneShape[]) {
    if (!scene.motor) continue;
    assert.equal(scene.motor.diagnostics ?? null, null, "the acting episode must bake without a motor diagnostic");
    for (const [id, frames] of Object.entries(scene.motor.actors)) {
      const pitchMax = (frontSkeleton(compiled, id) as unknown as {waist: {pitchMax: number}}).waist.pitchMax;
      for (const [index, frame] of frames.entries()) {
        // Acting (posture held without a reach) stays inside the envelope the
        // figure's artwork declares; a reach posture is a physical necessity
        // and is bounded by the crouch-first rule asserted below.
        if (frame.reach) continue;
        const pitch = Math.abs(frame.skeletonPose?.waistPitch ?? 0);
        assert.ok(pitch <= pitchMax + 1e-6,
          `${id} acting waist pitch ${pitch.toFixed(1)}° at frame ${index} exceeds the declared ${pitchMax}°`);
      }
      // A low grab squats first: the crouch capacity is spent before the waist
      // is asked to fold the drawn figure over (the WP3 ragdoll contortion).
      const bind = frames.findIndex((frame, index) => index > 0 && frame.holds !== undefined && frames[index - 1]!.holds === undefined);
      if (bind > 0) {
        const frame = frames[bind]!;
        const propId = frame.holds!;
        const aimY = scene.motor.props[propId]![bind]!.y;
        const waistY = scene.staging.actors[id]!.at[1] * STAGE_HEIGHT - 274.3 * scene.staging.actors[id]!.scale;
        if (aimY > waistY + 40) {
          assert.ok((frame.crouch ?? 0) >= 0.85,
            `${id} grabs a low object at frame ${bind} with crouch ${(frame.crouch ?? 0).toFixed(2)} — the crouch must be spent first`);
        }
      }
    }
  }
});

test("invariant: a point's drawn elbow keeps a shaped bend and reaches its aim", () => {
  const skeleton = JSON.parse(readFileSync(resolve(REPO, "library/figure/lin_b_draft/skeleton.json"), "utf8"));
  const views = Object.fromEntries(["front", "quarter", "side", "back", "quarter_back"].map((view) => [view, skeleton])) as Record<"front" | "quarter" | "side" | "back" | "quarter_back", typeof skeleton>;
  const movie = simulateScene({
    durationSec: 3,
    actors: [
      // A short authored interval is legal; the hand's accent-shaped travel
      // still has to arrive and hold the key pose, or the beat ends mid-travel
      // with a folded arm and never draws a point.
      {id: "giver", x: 700, groundY: 691, facing: 1, scale: 0.88, skeleton, skeletonViews: views, poseTracks: [], intents: [{at: 0.1, duration: 0.35, intent: "point", target: "target"}]},
      {id: "target", x: 1100, groundY: 691, facing: -1, scale: 0.88, skeleton, skeletonViews: views, poseTracks: [], intents: []},
    ],
    props: [],
    resolveX: (id) => (id === "target" ? 1100 : undefined),
  });
  const frames = movie.actors.giver!;
  // The point aims along the arm's bone reach (POINT_BONE_EXTENSION = 0.94):
  // the shoulder sits 0.88*38 right of the root, 0.88*128.8 above the waist.
  const bone = (skeleton.arm.upper + skeleton.arm.fore) * 0.88;
  const aimX = 700 + 38 * 0.88 + bone * 0.94;
  const reachX = Math.max(...frames.map((frame) => frame.reach?.[0] ?? -Infinity));
  assert.ok(reachX >= aimX - 3, `the point never reaches its aim: ${reachX.toFixed(1)} of ${aimX.toFixed(1)}`);
  const keyFrames = frames.map((frame, index) => ({frame, index})).filter((entry) => entry.frame.reach && Math.abs(entry.frame.reach[0] - reachX) < 2);
  assert.ok(keyFrames.length >= 3, `the point must hold its key pose, got ${keyFrames.length} frames`);
  for (const {frame, index} of keyFrames) {
    const arm = frame.skeletonPose?.armR;
    assert.ok(arm, `frame ${index} has no drawn arm pose`);
    const elbow = drawnElbowAngle(skeleton, {upper: arm.upper, lower: arm.lower});
    assert.ok(elbow <= 165, `frame ${index}: the point's elbow is a straight rod (${elbow.toFixed(1)}°)`);
    assert.ok(elbow >= 100, `frame ${index}: the point's elbow is folded (${elbow.toFixed(1)}°)`);
  }
  assert.equal(movie.diagnostics ?? null, null);
});
