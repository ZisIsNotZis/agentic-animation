import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {
  PropPlacementSchema,
  SetSupportSurfaceSchema,
  SupportSurfaceSchema,
} from "../src/schemas/libraryMeta";
import {normalizeSetWorld} from "../src/assets/setWorld";
import {DECLARED_CAPABILITIES} from "../src/compiler/capabilities";
import {compileEpisode} from "../src/compiler/index";

// Wave 0 capability contract (docs/ART_ASSET_PROGRAM.md). These tests pin the
// DECLARATIONS only: the shapes three slices must share, that every existing
// flat support and prop manifest still parses unchanged, and that an episode
// asking for an unimplemented intent fails loud instead of compiling.

const FLAT_SUPPORT = {name: "counter", x: [120, 840], y: 390};
const HANGING_SUPPORT = {
  name: "bar",
  x: [860, 1060],
  y: 240,
  kind: "hanging",
  grip: {x: [900, 1020], y: 240},
  rotationLimit: {forward: 360, back: 30},
};

test("a flat support is unchanged: no kind, no hanging geometry", () => {
  assert.deepEqual(SupportSurfaceSchema.parse(FLAT_SUPPORT), FLAT_SUPPORT);
  assert.deepEqual(SetSupportSurfaceSchema.parse({...FLAT_SUPPORT, paint: "counter-top"}), {...FLAT_SUPPORT, paint: "counter-top"});
});

test("a hanging support declares a grip line and a rotation limit", () => {
  assert.deepEqual(SupportSurfaceSchema.parse(HANGING_SUPPORT), HANGING_SUPPORT);
  assert.deepEqual(SetSupportSurfaceSchema.parse({...HANGING_SUPPORT, paint: "bar"}), {...HANGING_SUPPORT, paint: "bar"});
});

/** First issue message a schema rejects with, or "" when it accepts. */
const rejection = (schema: {safeParse: (value: unknown) => {success: boolean; error?: {issues: Array<{message: string}>}}}, value: unknown): string => {
  const result = schema.safeParse(value);
  return result.success ? "" : result.error!.issues.map((issue) => issue.message).join("; ");
};

test("a hanging support missing either declared part fails validation", () => {
  const {grip: _grip, ...withoutGrip} = HANGING_SUPPORT;
  const {rotationLimit: _limit, ...withoutLimit} = HANGING_SUPPORT;
  assert.match(rejection(SupportSurfaceSchema, withoutGrip), /kind "hanging" needs a grip line/);
  assert.match(rejection(SupportSurfaceSchema, withoutLimit), /kind "hanging" needs a rotationLimit/);
  assert.match(rejection(SetSupportSurfaceSchema, {...withoutLimit, paint: "bar"}), /kind "hanging" needs a rotationLimit/);
});

test("hanging geometry on a flat surface fails rather than being ignored", () => {
  const {kind: _kind, ...withoutKind} = HANGING_SUPPORT;
  assert.match(rejection(SupportSurfaceSchema, withoutKind), /declares hanging geometry without kind "hanging"/);
});

test("rotation limits stay within one turn and are declared, never defaulted", () => {
  assert.match(rejection(SupportSurfaceSchema, {...HANGING_SUPPORT, rotationLimit: {forward: 361, back: 0}}), /less than or equal to 360/);
  assert.match(rejection(SupportSurfaceSchema, {...HANGING_SUPPORT, rotationLimit: {forward: 360}}), /Required/);
});

test("normalization carries a hanging declaration through and leaves flat ones untouched", () => {
  const svg = [
    '<svg viewBox="0 0 1920 1080">',
    '<g id="floor"/>',
    '<g id="counter"><path id="counter-top" data-support-top="390"/></g>',
    '<g id="bar"><path id="bar-grip" data-support-top="240"/></g>',
    "</svg>",
  ].join("");
  const manifest = {
    coordinateSpace: "1920x1080",
    layers: ["floor", "counter", "bar"],
    supports: [
      {...FLAT_SUPPORT, paint: "counter-top"},
      {...HANGING_SUPPORT, paint: "bar-grip"},
    ],
  };
  const world = normalizeSetWorld({manifest, sceneSvg: svg});
  assert.deepEqual(world.supports[0], {name: "counter", x: [120 / 1920, 840 / 1920], y: 390 / 1080});
  assert.deepEqual(world.supports[1], {
    name: "bar",
    x: [860 / 1920, 1060 / 1920],
    y: 240 / 1080,
    kind: "hanging",
    grip: {x: [900 / 1920, 1020 / 1920], y: 240 / 1080},
    rotationLimit: {forward: 360, back: 30},
  });
});

test("an existing prop placement parses to exactly what it did before the declaration", () => {
  assert.deepEqual(PropPlacementSchema.parse({base: 160}), {base: 160, size: [200, 160], stageWidth: 320, supports: []});
});

test("a projectile prop declares mass, restitution and a struck rule", () => {
  const placement = {base: 160, kind: "projectile", projectile: {mass: 0.05, restitution: 0.6, struck: "instant"}};
  assert.deepEqual(PropPlacementSchema.parse(placement), {...placement, size: [200, 160], stageWidth: 320, supports: []});
});

test("projectile geometry without the kind, or the kind without its physics, fails", () => {
  const {kind: _kind, ...withoutKind} = {base: 160, kind: "projectile", projectile: {mass: 0.05, restitution: 0.6, struck: "instant"}};
  assert.match(rejection(PropPlacementSchema, withoutKind), /declares projectile physics without kind "projectile"/);
  assert.match(rejection(PropPlacementSchema, {base: 160, kind: "projectile"}), /needs mass, restitution and a struck rule/);
  assert.match(rejection(PropPlacementSchema, {base: 160, kind: "projectile", projectile: {mass: 0, restitution: 0.6, struck: "instant"}}), /greater than 0/);
  assert.match(rejection(PropPlacementSchema, {base: 160, kind: "projectile", projectile: {mass: 0.05, restitution: 1.2, struck: "instant"}}), /less than or equal to 1/);
  assert.match(rejection(PropPlacementSchema, {base: 160, kind: "projectile", projectile: {mass: 0.05, restitution: 0.6, struck: "sometime"}}), /Invalid enum value/);
});

test("the capability vocabulary names one intent and one event spelling per capability", () => {
  assert.deepEqual(Object.keys(DECLARED_CAPABILITIES), ["hanging", "projectile", "swing", "pour"]);
  assert.equal(DECLARED_CAPABILITIES.swing.intent, "swing");
  assert.equal(DECLARED_CAPABILITIES.pour.intent, "pour");
  assert.equal(DECLARED_CAPABILITIES.swing.support, "hanging");
  assert.equal(DECLARED_CAPABILITIES.projectile.prop, "projectile");
  assert.deepEqual(DECLARED_CAPABILITIES.swing.events, ["swing.grip", "swing.release"]);
  assert.deepEqual(DECLARED_CAPABILITIES.pour.events, ["pour.tilt", "pour.stream_start", "pour.stream_end"]);
  assert.deepEqual(DECLARED_CAPABILITIES.projectile.events, ["projectile.struck", "projectile.settled"]);
  assert.deepEqual(DECLARED_CAPABILITIES.hanging.events, []);
});

const EPISODE = (call: string): string => `
episode: {id: capability, title: Capability, language: en}
actors: {lin: {use: figure/x/lin, voice: voice/x/lin}}
locations: {stage: {use: set/x/stage}}
objects: {mug: {use: prop/x/mug}}
scenes:
  - id: beat
    location: stage
    actors: {lin: {facing: audience}}
    objects: {mug: center}
    script:
      - lin: "hello {${call}}"
`;

async function compileCall(call: string): Promise<unknown> {
  const root = mkdtempSync(join(tmpdir(), "anim-capability-"));
  try {
    const dir = join(root, "episodes", "demo");
    mkdirSync(dir, {recursive: true});
    const episodePath = join(dir, "episode.yml");
    writeFileSync(episodePath, EPISODE(call));
    return await compileEpisode(episodePath, {
      registry: () => ({}),
      plugins: [{
        category: "action",
        manifest: {},
        // The implemented beat the gate must let through (negative control).
        namespace: {raise: () => ({durationSec: 0.4, mode: "block", run: function* () { yield 0.4; }})},
      }],
      // One marker per inline call, as a measured track would supply.
      speechTimingProvider: (request: {inlineTokens: readonly string[]}) => ({durationSec: 0.5, inline: Object.fromEntries(request.inlineTokens.map((token) => [token, 0]))}),
    });
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
}

test("an implemented beat still compiles through the capability gate", async () => {
  const compiled = await compileCall("action.raise(lin)");
  assert.ok(compiled !== undefined);
});

test("swing fails loud naming the missing capability, not a missing export", async () => {
  await assert.rejects(
    compileCall("action.swing(lin)"),
    /action\.swing\(lin\) needs the "swing" capability, which is declared but not implemented — Wave 2 \(slice B, giant swing on a high bar\) implements it; the contract is docs\/ART_ASSET_PROGRAM\.md/,
  );
});

test("pour fails loud naming the missing capability, not a missing export", async () => {
  await assert.rejects(
    compileCall("action.pour(lin)"),
    /action\.pour\(lin\) needs the "pour" capability, which is declared but not implemented — Wave 2 \(slice C, pouring tea\) implements it/,
  );
});
