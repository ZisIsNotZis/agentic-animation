import {readFile} from "node:fs/promises";
import {join} from "node:path";
import {test} from "node:test";
import assert from "node:assert/strict";
import {loadAssetRegistry} from "../src/assets/registry";
import {createProcedureResolver, PROCEDURE_DEFINITIONS, PROCEDURE_IDS} from "../src/procedures";
import {parseProcedureCalls} from "../src/schemas/narrowEpisode";
import type {ProcedureCall} from "../src/schemas/narrowEpisode";
import type {ProcedureResolveContext} from "../src/compiler";

const libraryRoot = join(process.cwd(), "library");

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

function call(raw: string): ProcedureCall {
  const match = raw.match(/^([^.(]+)\.([^.(]+)\.([^.(]+)\((.*)\)$/);
  if (!match) throw new Error(`invalid test call: ${raw}`);
  const [subject, namespace, terminal] = match.slice(1, 4);
  const args = match[4] ? match[4].split(", ").map((value) => ({kind: "ref" as const, value})) : [];
  return {raw, subject: subject!, namespace: namespace! as ProcedureCall["namespace"], terminal: terminal!, path: `${subject}.${namespace}.${terminal}`, args, kwargs: {}};
}

function authoredCall(id: string, args: string[] = []): ProcedureCall {
  const [namespace, ...terminal] = id.split(".");
  const path = namespace === "camera" || namespace === "vfx" || namespace === "sfx" || namespace === "music"
    ? `${namespace}.${namespace === "sfx" || namespace === "music" ? "play" : "use"}.${terminal.join(".")}`
    : `actor.${namespace === "acting" || namespace === "gesture" || namespace === "prop" || namespace === "interaction" ? "act" : namespace === "gaze" ? "look" : namespace === "speech" ? "voice" : namespace}.${terminal.join(".")}`;
  const parsed = call(`${path}(${args.join(", ")})`);
  return parsed;
}

test("has a deterministic authored implementation for every registered procedure", async () => {
  const raw = JSON.parse(await readFile(join(libraryRoot, "registry/manifest.json"), "utf8")) as {
    procedures: Array<{id: string; params: Array<{name: string; type: string}>; subjects: string[]}>;
  };
  const registry = await loadAssetRegistry(libraryRoot);
  const resolver = createProcedureResolver({registry});

  assert.equal(raw.procedures.length, 65);
  assert.equal(new Set(raw.procedures.map((procedure) => procedure.id)).size, 65);
  assert.deepEqual([...PROCEDURE_IDS].sort(), raw.procedures.map((procedure) => procedure.id).sort());
  for (const procedure of raw.procedures) {
    const subject = procedure.subjects[0]!;
    const procedureCall = authoredCall(procedure.id, procedure.params.map((param) => sampleArg(param.type)));
    const first = resolver.resolve(procedureCall, context(subject, procedureCall));
    const second = resolver.resolve(procedureCall, context(subject, procedureCall));
    assert.deepEqual(second, first, procedure.id);
    assert.equal(first.performance.id, procedure.id);
    assert.equal(first.durationSec, PROCEDURE_DEFINITIONS[procedure.id]!.durationSec);
    assert.ok(first.performance.phases.length >= 2, procedure.id);
    assertRecipeIsConcrete(first.performance.recipe, procedure.id);
    assert.deepEqual(first.tracks, first.performance.recipe.tracks, procedure.id);
    const expectedKinds = procedure.id.startsWith("face.") ? ["expression"]
      : procedure.id.startsWith("look.") ? ["gaze"]
        : procedure.id.startsWith("move.") ? ["movement", "transform"]
          : procedure.id.startsWith("use.") && procedure.subjects[0] === "camera" ? ["camera"]
            : procedure.id.startsWith("use.") ? ["vfx"]
              : procedure.id.startsWith("play.") ? [procedure.subjects[0] === "music" ? "music" : "sfx"]
                : procedure.id.startsWith("voice.") ? ["expression"]
                  : ["bone"];
    for (const kind of expectedKinds) assert.ok(first.tracks.some((track) => track.kind === kind), `${procedure.id}: missing ${kind} track`);
  }
});

test("audits every procedure call used by the AI work adventure", async () => {
  const episode = await readFile(join(process.cwd(), "episodes/ai-work-adventure/episode.yml"), "utf8");
  const calls = new Map<string, ProcedureCall>();
  for (const match of episode.matchAll(/(?:[a-z][a-z0-9_]*\.)?(?:face|look|move|act|voice|use|play)\.[a-z][a-z0-9_]*\([^)]*\)/g)) {
    for (const parsed of parseProcedureCalls(match[0]) ?? []) {
      const normalized = parsed.subject === "camera" || parsed.subject === "vfx" || parsed.subject === "sfx" || parsed.subject === "music"
        ? `${parsed.subject}.${parsed.terminal}`
        : parsed.namespace === "face" ? `face.${parsed.terminal}`
          : parsed.namespace === "look" ? `gaze.${parsed.terminal}`
            : parsed.namespace === "move" ? `move.${parsed.terminal}`
              : parsed.namespace === "voice" ? `speech.${parsed.terminal}`
                : PROCEDURE_IDS.find((id) => id.endsWith(`.${parsed.terminal}`)) ?? parsed.path;
      calls.set(normalized, parsed);
    }
  }
  assert.equal(calls.size, 65);
  const resolver = createProcedureResolver();
  for (const procedureCall of calls.values()) {
    const result = resolver.resolve(procedureCall, context(procedureCall.subject, procedureCall));
    assertRecipeIsConcrete(result.performance.recipe, result.performance.id);
  }
});

test("emits prop lifecycle markers at authored grasp, transfer, and release beats", () => {
  const resolver = createProcedureResolver();
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

test("retains representative body, face, gaze, camera, manga VFX, and audio intent", () => {
  const resolver = createProcedureResolver();
  const resolve = (name: string, args: string[], subject: string) => {
    const procedureCall = authoredCall(name, args);
    return resolver.resolve(procedureCall, context(subject, procedureCall)).performance;
  };

  const gesture = resolve("gesture.slam", ["Cup"], "Alice");
  assert.ok(gesture.body.some((event) => event.parts.includes("hand_r") && event.phase === "slam"));
  assert.equal(gesture.vfx[0]!.style, "manga-impact-star");
  assert.equal(gesture.audio[0]!.cue, "desk-slam");

  const face = resolve("face.shocked", [], "Alice");
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

test("resolves procedure parameters inside the generic recipe without renderer vocabulary", () => {
  const call = authoredCall("gesture.point", ["Bob"]);
  const result = createProcedureResolver().resolve(call, context("Alice", call));
  assert.ok(result.tracks.some((track) => track.kind === "bone"));
  assert.equal(result.performance.recipe.tracks.find((track) => track.kind === "bone")?.events[0]?.target, "Bob");
  assert.equal((result.performance.recipe.tracks.find((track) => track.kind === "bone")?.events[0]?.value as {target?: string}).target, "Bob");
});

test("rejects empty and semantically insufficient explicit recipes", () => {
  const call = authoredCall("gesture.nod");
  const base = PROCEDURE_DEFINITIONS["act.nod"]!;
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
  const resolver = createProcedureResolver({registry});
  const unknown = authoredCall("gesture.unknown");
  assert.throws(() => resolver.resolve(unknown, context("Alice", unknown)), /no authored implementation/i);
  const wrong = authoredCall("gesture.nod", ["Cup"]);
  assert.throws(() => resolver.resolve(wrong, context("Alice", wrong)), /expects 0 arguments/i);
  const wrongSubject = authoredCall("gesture.nod");
  assert.throws(() => resolver.resolve(wrongSubject, context("camera", wrongSubject)), /does not allow subject/i);
});
