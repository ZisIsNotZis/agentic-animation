import {existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync} from "node:fs";
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
import {DECLARED_CAPABILITIES, assertCapabilityImplemented, declaredCapability} from "../src/compiler/capabilities";
import {compileEpisode} from "../src/compiler/index";

// Wave 0 capability contract (docs/0_ROADMAP.md). These tests pin the
// DECLARATIONS only: the shapes three slices must share, that every existing
// flat support and prop manifest still parses unchanged, and that an episode
// asking for an unimplemented intent fails loud instead of compiling.

const FLAT_SUPPORT = {name: "counter", x: [120, 840], y: 390};
/** The repository root, so the emitter search reads the real `packages/**`. */
const packagesRoot = new URL("../../../", import.meta.url);
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
  // Declared, emitted by nothing: narrowed until the package that bakes slice
  // B's shot restores the names WITH their emission (see the emitter test).
  assert.deepEqual(DECLARED_CAPABILITIES.swing.events, []);
  assert.deepEqual(DECLARED_CAPABILITIES.pour.events, ["pour.tilt", "pour.stream_start", "pour.stream_end"]);
  assert.deepEqual(DECLARED_CAPABILITIES.projectile.events, ["projectile.struck", "projectile.settled"]);
  assert.deepEqual(DECLARED_CAPABILITIES.hanging.events, []);
});

test("a declared event of an implemented capability has an emitter in packages/**", () => {
  // A declaration is a promise, and `implemented: true` promises the beat is
  // real. `swing.grip` and `swing.release` were declared and emitted by
  // nothing — the same lie the fail-loud gate closed for a capability with no
  // implementation, and one a per-slice test cannot see.
  const packages = join(packagesRoot.pathname, "packages");
  const dirs = readdirSync(packages, {withFileTypes: true})
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(packages, entry.name, "src"))
    .filter((dir) => existsSync(dir));
  const sources = dirs.flatMap((dir) => readdirSync(dir, {recursive: true, withFileTypes: true})
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts") && !entry.parentPath.endsWith("compiler"))
    .map((entry) => readFileSync(join(entry.parentPath, entry.name), "utf8")));
  assert.ok(sources.length > 20, `the emitter search read only ${sources.length} source files`);
  for (const [name, capability] of Object.entries(DECLARED_CAPABILITIES)) {
    const {implemented, events} = capability as {implemented?: boolean; events: readonly string[]};
    if (!implemented) continue; // the gate refuses it by name instead
    for (const event of events) {
      assert.ok(sources.some((source) => source.includes(`"${event}"`)),
        `${name} declares ${event}, which no file in packages/** emits`);
    }
  }
});

test("the gate selects a declaration by the field the episode asked through", () => {
  // The defect E1 opened with: selecting on `intent` alone meant a
  // `prop.kind` or `support.kind` was validated by zod and never gated.
  assert.equal(declaredCapability("intent", "swing")?.intent, "swing");
  assert.equal(declaredCapability("support", "hanging")?.support, "hanging");
  assert.equal(declaredCapability("prop", "projectile")?.prop, "projectile");
  // Cross-field names do not select: "swing" is an intent, not a prop kind.
  assert.equal(declaredCapability("prop", "swing"), undefined);
  assert.equal(declaredCapability("support", "projectile"), undefined);
  // The selection is what the error names, so the owner travels with it.
  assert.equal(declaredCapability("prop", "projectile")?.owner, "Wave 2 (E1 projectile + struck contact)");
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

test("swing is admitted by the gate once slice B implements it", () => {
  assert.doesNotThrow(() => assertCapabilityImplemented("intent", "swing", "action.swing(lin)"));
  // Negative control: the declaration still exists, so the admission is the
  // slice implementing it, not the name silently disappearing.
  assert.equal(DECLARED_CAPABILITIES.swing.implemented, true);
});

test("pour fails loud naming the missing capability, not a missing export", async () => {
  await assert.rejects(
    compileCall("action.pour(lin)"),
    /action\.pour\(lin\) needs the "pour" capability, which is declared but not implemented — Wave 2 \(slice C, pouring tea\) implements it/,
  );
});

/** A prop placement declaring flight physics, and a set whose only support is
 *  hanging: the two `kind` fields the gate had to learn to select on. */
const PROJECTILE_PLACEMENT = {base: 142, size: [200, 160], supports: [], kind: "projectile",
  projectile: {mass: 0.05, restitution: 0.5, struck: "instant"}};
const HANGING_WORLD = {
  coordinateSpace: {width: 960, height: 540},
  layers: [],
  supports: [{name: "bar", x: [0.45, 0.55], y: 0.25, kind: "hanging",
    grip: {x: [0.46, 0.54], y: 0.25}, rotationLimit: {forward: 360, back: 0}}],
};

/** Compile the shared fixture episode with one asset declaring `resolved`, so a
 *  `prop.kind` / `support.kind` reaches the compiler as the registry hands it
 *  over (the same seam library/ manifests arrive through). */
async function compileDeclaring(select: (ref: string) => unknown): Promise<unknown> {
  const root = mkdtempSync(join(tmpdir(), "anim-capability-kind-"));
  try {
    const dir = join(root, "episodes", "demo");
    mkdirSync(dir, {recursive: true});
    const episodePath = join(dir, "episode.yml");
    writeFileSync(episodePath, EPISODE("action.raise(lin)"));
    return await compileEpisode(episodePath, {
      registry: (ref: string) => select(ref),
      plugins: [{category: "action", manifest: {}, namespace: {raise: () => ({durationSec: 0.4, mode: "block", run: function* () { yield 0.4; }})}}],
      speechTimingProvider: (request: {inlineTokens: readonly string[]}) => ({durationSec: 0.5, inline: Object.fromEntries(request.inlineTokens.map((token) => [token, 0]))}),
    });
  } finally {
    rmSync(root, {recursive: true, force: true});
  }
}

/** Temporarily flip one declaration, so the gate — not zod, not the fixture —
 *  is what refuses the episode. Restored before the test returns. */
async function whileUnimplemented(capability: {implemented?: boolean}, run: () => Promise<void>): Promise<void> {
  const implemented = capability.implemented;
  capability.implemented = false;
  try {
    await run();
  } finally {
    capability.implemented = implemented;
  }
}

test("a projectile prop fails to compile while no slice implements the capability", async () => {
  await whileUnimplemented(DECLARED_CAPABILITIES.projectile as {implemented?: boolean}, async () => {
    await assert.rejects(
      compileDeclaring((ref) => (ref.startsWith("prop/") ? {placement: PROJECTILE_PLACEMENT} : {})),
      /object mug \(prop\/x\/mug\) needs the "projectile" prop capability, which is declared but not implemented — Wave 2 \(E1 projectile \+ struck contact\) implements it/,
    );
  });
  // Negative control: the same episode — same kind, same placement — compiles
  // once the capability is implemented, so the refusal was the gate.
  assert.ok((await compileDeclaring((ref) => (ref.startsWith("prop/") ? {placement: PROJECTILE_PLACEMENT} : {}))) !== undefined);
  assert.equal(DECLARED_CAPABILITIES.projectile.implemented, true);
});

test("a hanging support fails to compile while no slice implements the capability", async () => {
  await whileUnimplemented(DECLARED_CAPABILITIES.hanging as {implemented?: boolean}, async () => {
    await assert.rejects(
      compileDeclaring((ref) => (ref.startsWith("set/") ? {world: HANGING_WORLD} : {})),
      /location stage \(set\/x\/stage\) support "bar" needs the "hanging" support capability, which is declared but not implemented — Wave 2 \(slice B, giant swing on a high bar\) implements it/,
    );
  });
  // Negative control: an implemented hanging support compiles, so the support
  // selection is wired and not merely declared.
  assert.ok((await compileDeclaring((ref) => (ref.startsWith("set/") ? {world: HANGING_WORLD} : {}))) !== undefined);
});
