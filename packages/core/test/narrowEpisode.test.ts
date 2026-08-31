import {test} from "node:test";
import assert from "node:assert/strict";
import {NarrowEpisodeSchema, parseProcedureCall, parseProcedureCalls} from "../src/schemas/narrowEpisode";

const valid = {
  episode: {id: "ai_work", title: "AI 打工奇遇记", language: "zh-CN"},
  actors: {
    aqiang: {use: "figure.office.aqiang.v1", voice: "voice.zh.aqiang.v1"},
    awei: {use: "figure.office.awei.v1", voice: "voice.zh.awei.v1"},
  },
  locations: {office: {use: "set.office.agent-stage.v1"}},
  objects: {coffee: {use: "prop.office.thermos.v1"}, desk: {use: "prop.office.desk.v1"}},
  scenes: [{
    id: "opening", location: "office",
    actors: {aqiang: {facing: "awei"}, awei: {facing: "aqiang"}},
    objects: {desk: "center", coffee: "on(desk)"},
    script: [
      {aqiang: "这杯咖啡，{aqiang.act.pick_up(coffee)}它不是老板的。{awei.face.shocked(), camera.use.punch_in(awei)}"},
    ],
  }],
};

test("accepts the single canonical authoring form", () => {
  assert.ok(NarrowEpisodeSchema.safeParse(valid).success);
});

test("rejects legacy source fields and renderer fields", () => {
  const ambiguous = structuredClone(valid) as any;
  ambiguous.cast = {aqiang: valid.actors.aqiang};
  assert.equal(NarrowEpisodeSchema.safeParse(ambiguous).success, false);
  const coordinates = structuredClone(valid) as any;
  coordinates.scenes[0].x = 100;
  assert.equal(NarrowEpisodeSchema.safeParse(coordinates).success, false);
});

test("parses typed scalars and rejects malformed or nested calls", () => {
  const call = parseProcedureCall('aqiang.act.throw(cpu, awei, arc="high", speed=1.4, enabled=true)');
  assert.deepEqual(call?.args, [{kind: "ref", value: "cpu"}, {kind: "ref", value: "awei"}]);
  assert.deepEqual(call?.kwargs, {
    arc: {kind: "string", value: "high"},
    speed: {kind: "number", value: 1.4},
    enabled: {kind: "boolean", value: true},
  });
  assert.deepEqual(parseProcedureCalls("awei.face.shocked(), camera.use.punch_in(awei)")?.map(({path}) => path), ["awei.face.shocked", "camera.use.punch_in"]);
  assert.equal(parseProcedureCall("aqiang.act.throw(cpu, other.act.pick_up(coffee))"), null);
  assert.equal(parseProcedureCall("aqiang.act.throw(cpu, arc=\"high\", awei)"), null);
});

test("rejects unknown references and malformed source calls", () => {
  for (const script of [
    [{aqiang: "{拿起coffee}错。"}],
    [{aqiang: "{aqiang.act.pick_up(unknown)}"}],
    [{aqiang: "{aqiang.act.pick_up(coffee, bad=true, other)}"}],
  ]) {
    const episode = structuredClone(valid) as any;
    episode.scenes[0].script = script;
    assert.equal(NarrowEpisodeSchema.safeParse(episode).success, false);
  }
});

test("rejects unknown semantic setup references", () => {
  const episode = structuredClone(valid) as any;
  episode.scenes[0].actors.aqiang.facing = "unknown_actor";
  assert.equal(NarrowEpisodeSchema.safeParse(episode).success, false);
  episode.scenes[0].actors.aqiang.facing = "awei";
  episode.scenes[0].objects.coffee = "on(unknown_object)";
  assert.equal(NarrowEpisodeSchema.safeParse(episode).success, false);
});
