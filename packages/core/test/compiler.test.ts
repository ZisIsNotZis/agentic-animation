import {test} from "node:test";
import assert from "node:assert/strict";
import {mkdtempSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {compileEpisode, type ProcedureResolution} from "../src/compiler/index";
import type {ProcedureCall} from "../src/schemas/narrowEpisode";

function episodeFile(source: string): string {
  const dir = mkdtempSync(join(tmpdir(), "anim-compiler-"));
  const path = join(dir, "episode.yml");
  writeFileSync(path, source);
  return path;
}

const header = `
episode: {id: compiler_test, title: Compiler test, language: en}
actors:
  alice: {use: figure.test.alice.v1, voice: voice.test.alice.v1}
  bob: {use: figure.test.bob.v1, voice: voice.test.bob.v1}
locations:
  room: {use: set.test.room.v1}
objects:
  cup: {use: prop.test.cup.v1}
  desk: {use: prop.test.desk.v1}
`;

const resolved = new Map<string, ProcedureResolution>();
const registry = {
  resolveAsset(ref: string) { return {ref}; },
  validateProcedureCall(call: {id: string}) {
    const id = call.id.split(".").slice(1).join(".");
    return {procedure: {procedureKind: id.startsWith("face.") ? "state" : "timed", timing: {defaultDuration: resolved.get(id)?.durationSec ?? 0.5, scalable: true}}};
  },
};

function procedureName(call: ProcedureCall): string { return `${call.namespace}.${call.terminal}`; }
function resolver(call: ProcedureCall): ProcedureResolution {
  const name = procedureName(call);
  return resolved.get(name) ?? {durationSec: name === "act.slam" ? 1 : 0.25};
}
const timing = (request: {text: string}) => ({durationSec: request.text.length ? 2 : 0});

test("compiles direct dialogue, concurrent brace groups, and stageScene output", async () => {
  resolved.clear();
  resolved.set("face.shocked", {durationSec: 0.3});
  resolved.set("use.punch_in", {durationSec: 0.4});
  const path = episodeFile(`${header}
scenes:
  - id: reveal
    location: room
    actors:
      alice: {facing: bob}
      bob: {facing: alice}
    objects: {desk: center, cup: on(desk)}
    script:
      - alice: "hello"
      - alice: "{bob.face.shocked(), camera.use.punch_in(bob)}"
`);
  const compiled = await compileEpisode(path, {registry, resolver, speechTiming: timing});
  const scene = compiled.sceneTrack[0]!;
  assert.equal(scene.location, "room");
  assert.equal(scene.staging.camera.framing, "two-shot");
  assert.deepEqual(scene.performanceTracks.flatMap((track) => track.events).map((event) => [event.kind, event.start, event.end]), [
    ["speech", 0, 2], ["call", 2, 2], ["call", 2, 2.4],
  ]);
  assert.ok(compiled.performanceTracks.some((track) => track.subject === "camera"));
});

test("blocks timed calls by default, supports nonblock and duration, and keeps state persistent", async () => {
  resolved.clear();
  resolved.set("act.slam", {durationSec: 1});
  resolved.set("face.shocked", {durationSec: 9});
  const path = episodeFile(`${header}
scenes:
  - id: timing
    location: room
    actors: {alice: {facing: audience}}
    objects: {desk: center}
    script:
      - alice: "{alice.act.slam(desk)}after"
      - alice: '{alice.act.slam(desk, mode="nonblock"), alice.face.shocked(), alice.act.slam(desk, duration=2)}done'
`);
  const compiled = await compileEpisode(path, {registry, resolver, speechTiming: timing});
  const events = compiled.sceneTrack[0]!.performanceTracks.flatMap((track) => track.events);
  const calls = events.filter((event) => event.kind === "call");
  assert.deepEqual(calls.map((event) => [event.start, event.end]), [[0, 1], [3, 4], [3, 3], [3, 5]]);
  assert.equal(events.filter((event) => event.kind === "speech").at(-1)!.start, 5);
  assert.equal(compiled.sceneTrack[0]!.final.actors.alice!.face, "shocked");
});

test("normalizes and closes a span across dialogue speakers with strict span errors", async () => {
  resolved.clear();
  resolved.set("act.throw", {durationSec: 0.2});
  const valid = episodeFile(`${header}
scenes:
  - id: span
    location: room
    actors:
      alice: {facing: bob}
      bob: {facing: alice}
    objects: {cup: center}
    script:
      - alice: '{alice.act.throw(cup, mode="begin")}'
      - bob: "holding"
      - bob: '{alice.act.throw(cup, mode="end")}'
`);
  const compiled = await compileEpisode(valid, {registry, resolver, speechTiming: timing});
  const span = compiled.performanceTracks.find((track) => track.subject === "alice")!.events.find((event) => event.kind === "call")!;
  assert.deepEqual([span.start, span.end], [0, 2]);
  for (const script of [
    `      - alice: '{alice.act.throw(cup, mode="end")}'`,
    `      - alice: '{alice.act.throw(cup, mode="begin")}'\n      - alice: '{alice.act.throw(cup, mode="begin")}'`,
    `      - alice: '{alice.act.throw(cup, mode="begin", duration=1)}'`,
  ]) {
    const invalid = episodeFile(`${header}
scenes:
  - id: invalid_span
    location: room
    actors: {alice: {facing: audience}}
    objects: {cup: center}
    script:
${script}
`);
    await assert.rejects(() => compileEpisode(invalid, {registry, resolver, speechTiming: timing}), /span|duration/i);
  }
});

test("uses silent ellipsis beats and emits actor.say interruption events", async () => {
  const path = episodeFile(`${header}
scenes:
  - id: silence
    location: room
    actors: {alice: {facing: audience}}
    objects: {cup: center}
    script:
      - alice: "… …"
      - alice: '{alice.say("wait!")}'
`);
  const compiled = await compileEpisode(path, {registry, resolver, speechTiming: () => ({durationSec: 0.4})});
  const events = compiled.performanceTracks.find((track) => track.subject === "alice")!.events;
  const interruption = events.find((event) => event.kind === "speech");
  assert.equal(interruption?.start, 1.1);
  assert.equal(interruption?.end, 1.5);
  assert.equal(interruption?.kind === "speech" && interruption.interruption, true);
});

test("empty brace-boundary text does not consume an audio chunk id", async () => {
  const seen: string[] = [];
  const path = episodeFile(`${header}
scenes:
  - id: boundary
    location: room
    actors: {alice: {facing: audience}}
    objects: {cup: center}
    script:
      - alice: "first{alice.face.shocked()}second{alice.face.relief()}"
`);
  await compileEpisode(path, {registry, resolver, speechTimingProvider: (request) => {
      seen.push(request.lineId);
      return {durationSec: 1, markers: Object.fromEntries(request.inlineTokens.map((token) => [token, 1]))};
    }});
  assert.deepEqual(seen, ["boundary.0.0", "boundary.0.1"]);
});

test("global speech speed reaches timing and renderer metadata while inline speed wins", async () => {
  const path = episodeFile(`${header}
scenes:
  - id: speed
    location: room
    actors: {alice: {facing: audience}}
    objects: {cup: center}
    script:
      - alice: "first{alice.voice.speed(2)}second"
`);
  const speeds: number[] = [];
  const compiled = await compileEpisode(path, {registry, resolver, voiceSpeed: 1.25, speechTiming: (request) => {
    speeds.push(request.speed);
    return {durationSec: 1, boundaries: [{kind: "character", text: request.text[0], startSec: 0, endSec: 0.5}]};
  }});
  const speeches = compiled.performanceTracks[0]!.events.filter((event) => event.kind === "speech");
  assert.deepEqual(speeds, [1.25, 2]);
  assert.deepEqual(speeches.map((event) => event.speed), [1.25, 2]);
  assert.equal(speeches[0]!.boundaries?.[0]?.text, "f");
});

test("passes typed calls and normalized kwargs to registry validation", async () => {
  const calls: Array<{id: string; subject: string}> = [];
  const path = episodeFile(`${header}
scenes:
  - id: validation
    location: room
    actors: {alice: {facing: audience}}
    objects: {cup: center}
    script:
      - alice: "{alice.act.slam(cup, speed=1.5)}"
`);
  const typedRegistry = {
    resolveAsset(ref: string) { return {ref}; },
    validateProcedureCall(call: {id: string; subject: string}, locals: {actors: Record<string, unknown>}) {
      if (!locals.actors.alice) throw new Error("missing typed actor locals");
      calls.push({id: call.id, subject: call.subject});
      return {procedure: {kind: "timed", timing: {defaultDuration: 0.5, scalable: true}}};
    },
  };
  await compileEpisode(path, {registry: typedRegistry, resolver, speechTiming: timing});
  assert.deepEqual(calls, [{id: "alice.act.slam", subject: "alice"}]);
});
