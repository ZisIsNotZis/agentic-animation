import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PluginSchema,
  WorldSchema,
  NormalizedPointSchema,
} from "../src/schemas/world";

test("world schema accepts normalized figures, props, camera, and timeline primitives", () => {
  const result = WorldSchema.safeParse({
    canvas: {aspect: 16 / 9,
    layers: [{id: "back", order: 0}],
    nodes: [
      {id: "hero", kind: "figure", asset: "figure/hero", at: [0.5, 0.7], size: [0.2, 0.4], layer: "back", face: {smile: 0.4, gaze: [0.7, 0.3]}},
      {id: "lamp", kind: "prop", asset: "prop/lamp", at: [0.8, 0.8], size: [0.1, 0.2], bind: "hero.hand_r"},
    ],
    tracks: [{node: "hero", move: [{at: 0, to: [0.55, 0.7], duration: 1}], gaze: [{at: 0, to: [0.7, 0.3]}]}],
    camera: [{at: 0, center: [0.5, 0.5], zoom: 1}],
    effects: [{at: 0.2, name: "glow", area: {at: [0.5, 0.5], size: [0.2, 0.2]}}],
    sound: [{at: 0, asset: "sound/step", volume: 0.8}],
    captions: [{at: 0, duration: 1.2, text: "Hello"}]},
    plugins: {},
  });
  assert.equal(result.success, true);
});

test("world schema rejects out-of-range coordinates and non-JSON values", () => {
  assert.equal(NormalizedPointSchema.safeParse([1.01, 0.5]).success, false);
  assert.equal(WorldSchema.safeParse({canvas: {aspect: 1, nodes: [{id: "x", kind: "prop", asset: "x", at: [0, 0], size: [0.1, 0.1], extra: undefined}]}, plugins: {}}).success, false);
});

test("plugin schema is strict and describes public contributions without procedures", () => {
  assert.equal(PluginSchema.safeParse({priority: 1, before: "camera"}).success, true);
  assert.equal(PluginSchema.safeParse({id: "x"}).success, false);
});
