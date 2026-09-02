import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {loadAssetRegistry} from "../src/assets/registry";
import {createProcedureResolver, loadProcedureDefinitions} from "../src/procedures";
import type {ProcedureCatalog, ProcedureDefinition} from "../src/procedures";
import {parseProcedureCalls} from "../src/schemas/narrowEpisode";
import type {ProcedureCall} from "../src/schemas/narrowEpisode";
import type {ProcedureResolveContext} from "../src/compiler";

const libraryRoot = join(process.cwd(), "library");

let DEFINITIONS: ProcedureCatalog | undefined;
async function definitions(): Promise<ProcedureCatalog> {
  return (DEFINITIONS ??= await loadProcedureDefinitions(libraryRoot));
}
function definition(id: string): ProcedureDefinition {
  return DEFINITIONS![id] as ProcedureDefinition;
}

function context(subject: string, call: ProcedureCall): ProcedureResolveContext {
  return {
    sceneId: "procedure-test",
    subject,
    source: "inline",
    start: 0,
    call,
    episode: {} as ProcedureResolveContext["episode"],
  };
}

function sampleArg(type: string): string {
  if (type === "actor") return "Alice";
  if (type === "dressing") return "Screen";
  if (type === "object") return "Cup";
  return "Alice";
}

function authoredCall(id: string, args: string[] = []): ProcedureCall {
  const [namespace, ...terminal] = id.split(".");
  const subject = id.startsWith("camera.") || id.startsWith("effect.") || id.startsWith("sound.") || id.startsWith("music.") ? namespace! : "Alice";
  const path = `${subject}.${id}`;
  const raw = `${path}(${args.join(", ")})`;
  return {raw, subject, namespace: namespace! as ProcedureCall["namespace"], terminal: terminal.join("."), path, args: args.map((value) => ({kind: "ref" as const, value})), kwargs: {}};
}

test("has a deterministic authored implementation for every registered procedure", async () => {
  const raw = JSON.parse(await readFile(join(libraryRoot, "action/manifest.json"), "utf8")) as {
    procedures: Array<{id: string; params: Array<{name: string; type: string}>; subjects: string[]}>;
  };
  const registry = await loadAssetRegistry(libraryRoot);
  const resolver = createProcedureResolver({registry, definitions: await definitions()});

  assert.equal(raw.procedures.length, 66);
  assert.equal(new Set(raw.procedures.map((procedure) => procedure.id)).size, 66);
  assert.deepEqual(Object.keys(await definitions()).sort(), raw.procedures.map((procedure) => procedure.id).sort());
  for (const procedure of raw.procedures) {
    const id = procedure.id;
    const procedureCall = authoredCall(id, procedure.params.map((param) => sampleArg(param.type)));
    const subject = id.startsWith("camera.") || id.startsWith("effect.") || id.startsWith("sound.") || id.startsWith("music.") ? id.split(".")[0]! : "Alice";
    const first = resolver.resolve(procedureCall, context(subject, procedureCall));
    const second = resolver.resolve(procedureCall, context(subject, procedureCall));
    assert.deepEqual(second, first, id);
    assert.equal(first.performance.id, id);
    assert.equal(first.durationSec, definition(id)!.durationSec);
    assert.ok(first.performance.phases.length >= 2, id);
    assertRecipeIsConcrete(first.performance.recipe, id);
    assert.deepEqual(first.tracks, first.performance.recipe.tracks, id);
    const expectedKinds = id.startsWith("emotion.") ? ["expression"]
      : id.startsWith("gaze.") ? ["gaze"]
        : id.startsWith("movement.") ? ["movement", "transform"]
          : id.startsWith("camera.") ? ["camera"]
            : id.startsWith("effect.") ? ["vfx"]
              : id.startsWith("sound.") ? ["sound"]
                : id.startsWith("music.") ? ["music"]
                  : id.startsWith("voice.") ? ["expression"]
                    : ["bone"];
    for (const kind of expectedKinds) assert.ok(first.tracks.some((track) => track.kind === kind), `${id}: missing ${kind} track`);
  }
});

test("audits every procedure call used by the AI work adventure", async () => {
  const episode = await readFile(join(process.cwd(), "episodes/ai-work-adventure/episode.yml"), "utf8");
  const calls = new Map<string, ProcedureCall>();
  for (const match of episode.matchAll(/(?:[a-z][a-z0-9_]*\.)?(?:action|emotion|gaze|movement|voice|prop|camera|effect|sound|music)\.[a-z][a-z0-9_]*\([^)]*\)/g)) {
    for (const parsed of parseProcedureCalls(match[0]) ?? []) {
      calls.set(`${parsed.namespace}.${parsed.terminal}`, parsed);
    }
  }
  assert.equal(calls.size, 65);
  const resolver = createProcedureResolver({definitions: await definitions()});
  for (const procedureCall of calls.values()) {
    const result = resolver.resolve(procedureCall, context(procedureCall.subject, procedureCall));
    assertRecipeIsConcrete(result.performance.recipe, result.performance.id);
  }
});

test("emits prop lifecycle markers at authored grasp, transfer, and release beats", async () => {
  const resolver = createProcedureResolver({definitions: await definitions()});
  const pickupCall = authoredCall("prop.pickup", ["Cup"]);
  const pickupResolution = resolver.resolve(pickupCall, context("Alice", pickupCall));
  const pickup = pickupResolution.performance;
  const handoverCall = authoredCall("prop.handover", ["Cup", "Bob"]);
  const handoverResolution = resolver.resolve(handoverCall, context("Alice", handoverCall));
  const handover = handoverResolution.performance;
  const putdownCall = authoredCall("prop.putdown", ["Cup", "Desk"]);
  const putdownResolution = resolver.resolve(putdownCall, context("Alice", putdownCall));
  const putdown = putdownResolution.performance;

  assert.deepEqual(pickupResolution.markers, {bind: 0.58, grasp: 0.58});
  assert.deepEqual(handoverResolution.markers, {handover: 0.68});
  assert.deepEqual(putdownResolution.markers, {release: 0.62, settle: 0.94});
  assert.equal(pickup.params.target, "Cup");
  assert.equal(handover.params.target, "Bob");
  assert.equal(putdown.params.target, "Desk");
  assert.ok(pickup.body.some((event) => event.phase === "grasp"));
  assert.ok(handover.gaze.some((event) => event.target === "target"));
  for (const result of [pickup, handover, putdown]) {
    assert.ok(result.recipe.tracks.some((track) => track.kind === "binding"));
    assert.ok(result.recipe.tracks.some((track) => track.kind === "object"));
    assert.ok(result.recipe.tracks.some((track) => track.kind === "lifecycle"));
  }
  assert.equal(pickup.recipe.tracks.find((track) => track.kind === "binding")?.events[0]?.holder, "Alice");
  assert.equal(handover.recipe.tracks.find((track) => track.kind === "binding")?.events[1]?.holder, "Bob");
  assert.equal(putdown.recipe.tracks.find((track) => track.kind === "object")?.events[0]?.support, "Desk");
});

test("retains representative body, face, gaze, camera, manga VFX, and audio intent", async () => {
  const resolver = createProcedureResolver({definitions: await definitions()});
  const resolve = (name: string, args: string[], subject: string) => {
    const procedureCall = authoredCall(name, args);
    return resolver.resolve(procedureCall, context(subject, procedureCall)).performance;
  };

  const gesture = resolve("action.slam", ["Cup"], "Alice");
  assert.ok(gesture.body.some((event) => event.parts.includes("hand_r") && event.phase === "slam"));
  assert.equal(gesture.vfx[0]!.style, "manga-impact-star");
  assert.equal(gesture.audio[0]!.cue, "desk-slam");

  const face = resolve("emotion.shocked", [], "Alice");
  assert.equal(face.expression[0]!.emotion, "shocked");
  assert.equal(face.expression[0]!.mouth, "round-open");

  const gaze = resolve("gaze.at", ["Bob"], "Alice");
  assert.equal(gaze.gaze[0]!.target, "target");
  assert.equal(gaze.gaze[0]!.lead, "eyes");

  const camera = resolve("camera.punch_in", ["Alice"], "camera");
  assert.equal(camera.camera[0]!.operation, "push");
  assert.equal(camera.camera[0]!.target, "target");

  const music = resolve("music.ending", [], "music");
  assert.equal(music.audio[0]!.kind, "music");
  assert.equal(music.audio[0]!.cue, "ending-cadence");
  assert.ok(music.recipe.tracks.some((track) => track.kind === "music"));
  assert.ok(!music.recipe.tracks.some((track) => track.kind === "sfx"));
});

test("resolves procedure parameters inside the generic recipe without renderer vocabulary", async () => {
  const call = authoredCall("action.point", ["Bob"]);
  const result = createProcedureResolver({definitions: await definitions()}).resolve(call, context("Alice", call));
  assert.ok(result.tracks.some((track) => track.kind === "bone"));
  assert.equal(result.performance.recipe.tracks.find((track) => track.kind === "bone")?.events[0]?.target, "Bob");
  assert.equal((result.performance.recipe.tracks.find((track) => track.kind === "bone")?.events[0]?.value as {target?: string}).target, "Bob");
});

test("rejects empty and semantically insufficient explicit recipes", () => {
  const call = authoredCall("action.nod");
  const base = definition("action.nod");
  const empty = {...base, recipe: {tracks: []}};
  assert.throws(() => createProcedureResolver({definitions: {[base.id]: empty}}).resolve(call, context("Alice", call)), /empty generic recipe/i);
  const insufficient = {...base, recipe: {tracks: [{kind: "bone" as const, events: []}]}};
  assert.throws(() => createProcedureResolver({definitions: {[base.id]: insufficient}}).resolve(call, context("Alice", call)), /insufficient.*bone/i);
  const meaningless = {...base, recipe: {tracks: [{kind: "bone" as const, events: [{at: 0, value: {}}]}]}};
  assert.throws(() => createProcedureResolver({definitions: {[base.id]: meaningless}}).resolve(call, context("Alice", call)), /semantically insufficient.*bone/i);
});

function assertRecipeIsConcrete(recipe: {tracks: readonly {kind: string; events: readonly Record<string, unknown>[]; target?: string}[]}, id: string): void {
  assert.ok(recipe.tracks.length > 0, `${id}: recipe must not be empty`);
  for (const track of recipe.tracks) {
    assert.ok(track.events.length > 0, `${id}: ${track.kind} track must not be empty`);
    for (const event of track.events) {
      assert.equal(typeof event.at, "number", `${id}: ${track.kind} event needs at`);
      assert.ok(event.value && typeof event.value === "object", `${id}: ${track.kind} event needs semantic value`);
    }
  }
}

test("honors the registry contract instead of silently accepting unknown procedures or arity", async () => {
  const registry = await loadAssetRegistry(libraryRoot);
  const resolver = createProcedureResolver({registry, definitions: await definitions()});
  const unknown = authoredCall("action.unknown");
  assert.throws(() => resolver.resolve(unknown, context("Alice", unknown)), /no authored implementation/i);
  const wrong = authoredCall("action.nod", ["Cup"]);
  assert.throws(() => resolver.resolve(wrong, context("Alice", wrong)), /expects 0 arguments/i);
});
