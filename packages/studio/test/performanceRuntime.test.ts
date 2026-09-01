import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluatePerformance,
  performanceMetadata,
  type PerformanceManifest,
} from "../src/performance";

const manifest: PerformanceManifest = {
  version: 1,
  video: { width: 640, height: 360, fps: 10 },
  duration: 4,
  placements: {
    "desk.left": { at: [100, 220], scale: 0.5 },
    "desk.right": { at: [500, 220], scale: 0.75 },
  },
  camera: [
    { frame: 0, x: 0, y: 0, z: 1 },
    { frame: 20, x: 50, y: 10, z: 1.5, ease: "linear" },
  ],
  actors: [
    {
      id: "alice",
      placement: { mark: "desk.left", offset: [10, 0] },
      anchors: { hand_r: [40, -50] },
      expressionTrack: [
        { frame: 0, value: { name: "neutral", eyeOpen: 1 } },
        { frame: 10, value: { name: "surprised", eyeOpen: 1.5 } },
      ],
      gestureTrack: [{ frame: 5, value: { name: "point" }, endFrame: 15 }],
      z: 2,
    },
  ],
  props: [
    {
      id: "tablet",
      label: "Tablet",
      at: [0, 0],
      size: [50, 30],
      boundTo: { actor: "alice", hand: "hand_r", offset: [2, 3] },
    },
  ],
  subtitles: [{ id: "line-1", startFrame: 5, endFrame: 15, text: "hello" }],
  vfx: [{ id: "flash-1", type: "flash", startFrame: 12, endFrame: 16, color: "#fff" }],
};

test("evaluates semantic placement, expression, gesture, hand-bound props, subtitles, camera, and VFX", () => {
  const state = evaluatePerformance(manifest, 10);
  const actor = state.actors[0]!;
  const prop = state.props[0]!;

  assert.deepEqual([actor.x, actor.y, actor.scale], [110, 220, 0.5]);
  assert.equal(actor.expression.name, "surprised");
  assert.equal(actor.expression.eyeOpen, 1.5);
  assert.equal(actor.gesture?.name, "point");
  assert.equal(actor.gesture?.progress, 0.5);
  assert.deepEqual([prop.x, prop.y], [132, 198]);
  assert.deepEqual(state.camera, { x: 25, y: 5, z: 1.25, rotation: 0 });
  assert.deepEqual(state.subtitles.map((cue) => cue.text), ["hello"]);
  assert.equal(state.vfx[0], undefined);
  assert.equal(state.vfx.length, 0);

  const later = evaluatePerformance(manifest, 13);
  assert.equal(later.vfx[0]?.type, "flash");
  assert.equal(later.vfx[0]?.progress, 0.25);
});

test("frame evaluation is seek-safe: revisiting a frame returns the same state", () => {
  const expected = evaluatePerformance(manifest, 10);
  for (const frame of [0, 39, 6, 20, 10, 2, 10]) evaluatePerformance(manifest, frame);
  assert.deepEqual(evaluatePerformance(manifest, 10), expected);
});

test("metadata is derived from the compiled manifest timing and video spec", () => {
  assert.deepEqual(performanceMetadata(manifest), {
    durationInFrames: 40,
    fps: 10,
    width: 640,
    height: 360,
  });
});

test("accepts a direct placement object and interpolates sparse camera channels independently", () => {
  const direct: PerformanceManifest = {
    version: 1,
    video: { width: 320, height: 180, fps: 10 },
    duration: 2,
    placements: {},
    camera: [
      { frame: 0, x: 10 },
      { frame: 10, y: 20 },
      { frame: 20, x: 30 },
    ],
    actors: [{ id: "direct", placement: { x: 40, y: 50 } }],
  };

  assert.deepEqual([evaluatePerformance(direct, 0).actors[0]!.x, evaluatePerformance(direct, 0).actors[0]!.y], [40, 50]);
  assert.deepEqual(evaluatePerformance(direct, 15).camera, { x: 20, y: 20, z: 1, rotation: 0 });
});

test("evaluates generic transform, expression, binding, camera, and VFX tracks", () => {
  const generic: PerformanceManifest = {
    video: {width: 320, height: 180, fps: 10},
    durationInFrames: 20,
    placements: {},
    actors: [{id: "actor", placement: {at: [10, 20]}, anchors: {hand_r: [5, -5]}, tracks: [
      {kind: "transform", events: [{frame: 0, endFrame: 10, x: 30, y: 40}]},
      {kind: "expression", events: [{frame: 0, value: {name: "alert"}}]},
    ]}],
    props: [{id: "object", at: [0, 0], tracks: [{kind: "binding", events: [{frame: 0, endFrame: 10, actor: "actor", hand: "hand_r"}]}]}],
    tracks: [
      {kind: "camera", subject: "camera", events: [{frame: 0, x: 3, y: 4, z: 2}]},
      {kind: "vfx", subject: "vfx", events: [{frame: 2, endFrame: 6, type: "flash"}]},
    ],
  };
  const state = evaluatePerformance(generic, 4);
  assert.deepEqual([state.actors[0]!.x, state.actors[0]!.y], [30, 40]);
  assert.equal(state.actors[0]!.expression.name, "alert");
  assert.deepEqual([state.props[0]!.x, state.props[0]!.y], [35, 35]);
  assert.deepEqual(state.camera, {x: 3, y: 4, z: 2, rotation: 0});
  assert.equal(state.vfx[0]?.type, "flash");
});

test("semantic push centers its target instead of cropping from the world origin", () => {
  const manifest: PerformanceManifest = {
    video: {width: 1920, height: 1080, fps: 24},
    duration: 2,
    placements: {},
    actors: [
      {id: "left", placement: {at: [672, 691], scale: 0.88}},
      {id: "right", placement: {at: [1248, 691], scale: 0.88}},
    ],
    tracks: [{kind: "camera", subject: "camera", target: "right", events: [
      {frame: 0, endFrame: 16, operation: "push", target: "right", x: 0, y: 0, z: 1, value: {operation: "push", target: "right", x: 0, y: 0, z: 1}},
      {frame: 16, operation: "hold", target: "right", x: 0, y: 0, z: 1.35, value: {operation: "hold", target: "right", x: 0, y: 0, z: 1.35}},
    ]}],
  };
  const state = evaluatePerformance(manifest, 16);
  assert.equal(state.camera.z, 1.35);
  for (const actor of state.actors) {
    assert.ok((actor.x - 200 * actor.scale - state.camera.x) * state.camera.z >= 0);
    assert.ok((actor.x + 200 * actor.scale - state.camera.x) * state.camera.z <= manifest.video!.width);
  }
});

test("semantic focus fits all present actors before choosing the largest useful zoom", () => {
  const manifest: PerformanceManifest = {
    video: {width: 1280, height: 720, fps: 24},
    durationInFrames: 48,
    actors: [
      {id: "aqiang", placement: {at: [672, 691.2], scale: 0.88}},
      {id: "awei", placement: {at: [1248, 691.2], scale: 0.88}},
    ],
    tracks: [{kind: "camera", subject: "camera", events: [{frame: 0, endFrame: 24, value: {operation: "push", zoom: 1.35, target: "awei"}}]}],
  };
  const state = evaluatePerformance(manifest, 24);
  for (const actor of state.actors) {
    assert.ok((actor.x - 200 * actor.scale - state.camera.x) * state.camera.z >= 0);
    assert.ok((actor.x + 200 * actor.scale - state.camera.x) * state.camera.z <= manifest.video!.width);
  }
  assert.ok(state.camera.z < 1.35);
});

test("runtime evaluation deterministically repels actors whose movement tracks coincide", () => {
  const manifest: PerformanceManifest = {
    video: {width: 1280, height: 720, fps: 24},
    durationInFrames: 48,
    actors: [
      {id: "zeta", placement: {at: [900, 691.2], scale: 0.88}, tracks: [{kind: "movement", events: [{frame: 0, x: 1078, y: 691.2}]}]},
      {id: "alpha", placement: {at: [700, 691.2], scale: 0.88}, tracks: [{kind: "movement", events: [{frame: 0, x: 1078, y: 691.2}]}]},
    ],
  };
  const state = evaluatePerformance(manifest, 24);
  const alpha = state.actors.find((actor) => actor.id === "alpha")!;
  const zeta = state.actors.find((actor) => actor.id === "zeta")!;
  assert.ok(alpha.x < zeta.x);
  assert.ok(zeta.x - alpha.x >= 400 * 0.88);
  assert.deepEqual(evaluatePerformance(manifest, 24).actors, state.actors);
});

test("projects target-bound VFX at the evaluated actor or prop position", () => {
  const targetManifest: PerformanceManifest = {
    video: {width: 640, height: 360, fps: 10},
    durationInFrames: 10,
    actors: [{id: "left", placement: {at: [100, 240], scale: 1}}, {id: "right", placement: {at: [500, 240], scale: 1}}],
    props: [{id: "screen", at: [320, 180], size: [100, 60]}],
    vfx: [
      {id: "left-glitch", type: "glitch", target: "left", startFrame: 0, endFrame: 2},
      {id: "screen-error", type: "screen-error", target: "screen", startFrame: 0, endFrame: 2},
    ],
  };
  const state = evaluatePerformance(targetManifest, 1);

  assert.deepEqual(state.vfx.map((effect) => effect.targetPosition), [[100, -120], [320, 180]]);
  assert.deepEqual(state.vfx[0]?.targetMeta, {id: "left", kind: "actor", position: [100, -120], x: 100, y: 240, scale: 1});
  assert.deepEqual(state.vfx[1]?.targetMeta, {id: "screen", kind: "prop", position: [320, 180], x: 320, y: 180, scale: 1, size: [100, 60]});
});

test("compiled recipe VFX are projected once and preserve full-stage lighting", () => {
  const compiled = {
    video: {width: 640, height: 360, fps: 10},
    assets: {actors: {}, objects: {}, layouts: {}},
    sceneTrack: [],
    performanceTracks: [{
      subject: "vfx", kind: "world", events: [{
        kind: "call", subject: "vfx", start: 0, end: 1,
        call: {path: "vfx.lights_down"},
        performance: {style: "lighting-dim", intensity: 0.9},
        tracks: [{kind: "vfx", events: [{at: 0, duration: 1, style: "lighting-dim", intensity: 0.9}]}],
      }],
    }],
    totalDuration: 1,
  } as unknown as PerformanceManifest;

  const state = evaluatePerformance(compiled, 5);
  assert.equal(state.vfx.length, 1);
  assert.equal(state.vfx[0]?.style, "lighting-dim");
  assert.equal(state.vfx[0]?.targetPosition, undefined);
});

test("semantic movement travels toward its target instead of only walking in place", () => {
  const moving: PerformanceManifest = {
    video: {width: 640, height: 360, fps: 10}, durationInFrames: 20,
    actors: [
      {id: "walker", placement: {at: [100, 280]}, tracks: [{kind: "movement", target: "friend", events: [{frame: 0, durationFrames: 10, value: {operation: "move", target: "friend", to: "friend"}}]}]},
      {id: "friend", placement: {at: [500, 280]}},
    ],
  };
  assert.equal(evaluatePerformance(moving, 0).actors[0]!.x, 100);
  assert.ok(evaluatePerformance(moving, 5).actors[0]!.x > 100);
  assert.ok(evaluatePerformance(moving, 10).actors[0]!.x > 100);
});

test("projects generic procedure tracks into actors, speech, semantic placement, camera, VFX, and interval bindings", () => {
  const compiled = {
    episode: { id: "compiled", title: "Compiled", language: "en" },
    assets: {
      actors: {
        alice: {
          use: { instance: "alice", ref: "figure.test.alice.v1", resolved: { anchors: { hand_r: [10, -20] }, src: "alice.png" } },
          voice: { instance: "alice", ref: "voice.test.alice.v1", resolved: {} },
        },
      },
      sets: {},
      objects: {
        cup: { instance: "cup", ref: "prop.test.cup.v1", resolved: { src: "cup.png", size: [20, 30] } },
      },
      dressing: {},
      layouts: {
        "layout.test.room.v1": { instance: "layout.test.room.v1", ref: "layout.test.room.v1", resolved: { marks: { desk: { at: [100, 200], scale: 0.5 } } } },
      },
    },
    sceneTrack: [{
      id: "room",
      index: 0,
      set: "Room",
      layout: "layout.test.room.v1",
      start: 0,
      end: 2,
      duration: 2,
      initial: {
        actors: { alice: { present: true, pose: "standing", placement: "desk", face: "neutral", heldProps: [] } },
        props: { cup: { status: "loose", placement: "desk" } },
      },
      final: {
        actors: { alice: { present: true, pose: "standing", placement: "desk", face: "surprised", heldProps: ["cup"] } },
        props: { cup: { status: "held", holder: "alice", heldBy: "alice" } },
      },
      performanceTracks: [],
      activeBindingConstraints: [],
      staging: {actors: {alice: {at: [120, 210], scale: 0.6, flip: true}}},
    }],
    performanceTracks: [
      {
        subject: "alice",
        kind: "actor",
        events: [
          { kind: "speech", subject: "alice", start: 0, end: 1, text: "hello" },
          {
            kind: "call",
            subject: "alice",
            start: 0.25,
            end: 0.75,
            source: "run",
            call: { raw: "gesture.point()", name: "gesture.point", args: [] },
            tracks: [{ kind: "bone", events: [{ at: 0, duration: 0.5, value: { name: "point" } }] }],
          },
          {
            kind: "call",
            subject: "alice",
            start: 0.5,
            end: 0.5,
            source: "cue",
            call: { raw: "face.surprised()", name: "face.surprised", args: [] },
            tracks: [{ kind: "expression", events: [{ at: 0, duration: 0, value: { name: "surprised", eyeOpen: 1.5 } }] }],
          },
        ],
      },
      {
        subject: "camera",
        kind: "world",
        events: [{
          kind: "call",
          subject: "camera",
          start: 0,
          end: 2,
          source: "run",
          call: { raw: "camera.move()", name: "camera.move", args: [] },
          performance: { camera: { x: 20, y: 10, z: 1.5 } },
        }],
      },
      {
        subject: "vfx",
        kind: "world",
        events: [{
          kind: "call",
          subject: "vfx",
          start: 0.5,
          end: 1,
          source: "cue",
          call: { raw: "vfx.flash()", name: "vfx.flash", args: [] },
          performance: { type: "flash", color: "#fff" },
        }],
      },
    ],
    bindingConstraints: [{ object: "cup", holder: "alice", start: 0.25, end: 1, sceneId: "room", continuous: true as const }],
    totalDuration: 2,
  } as unknown as PerformanceManifest;

  const state = evaluatePerformance(compiled, 12);
  const actor = state.actors.find((item) => item.id === "alice")!;
  const prop = state.props.find((item) => item.id === "cup")!;

  assert.deepEqual([actor.x, actor.y, actor.scale, actor.flip], [120, 210, 0.6, true]);
  assert.equal(actor.expression.name, "surprised");
  assert.equal(actor.tracks.find((track) => track.kind === "bone")?.events[0]?.value && (actor.tracks.find((track) => track.kind === "bone")?.events[0]?.value as {name?: string}).name, "point");
  assert.equal(actor.tracks.some((track) => track.kind === "expression"), true);
  assert.deepEqual([prop.x, prop.y], [126, 198]);
  assert.equal(state.subtitles[0]?.text, "hello");
  assert.equal(state.vfx[0]?.type, "flash");
  assert.deepEqual(state.camera, { x: 20, y: 10, z: 1.5, rotation: 0 });
});

test("projects compiled staging and semantic camera procedures into visible runtime transforms", () => {
  const compiled = {
    video: {width: 1920, height: 1080, fps: 24},
    assets: {
      actors: {
        alice: {use: {instance: "alice", resolved: {}}, voice: {instance: "alice", resolved: {}}},
        bob: {use: {instance: "bob", resolved: {}}, voice: {instance: "bob", resolved: {}}},
      },
      layouts: {},
    },
    sceneTrack: [{
      id: "room",
      index: 0,
      layout: "room",
      start: 0,
      end: 1.5,
      duration: 1.5,
      initial: {actors: {
        alice: {present: true, pose: "standing", heldProps: []},
        bob: {present: true, pose: "standing", heldProps: []},
      }},
      final: {actors: {
        alice: {present: true, pose: "standing", heldProps: []},
        bob: {present: true, pose: "standing", heldProps: []},
      }},
      performanceTracks: [],
      activeBindingConstraints: [],
      staging: {
        actors: {
          alice: {at: [650, 691], scale: 0.76, facing: 1, flip: false},
          bob: {at: [1270, 691], scale: 0.76, facing: -1, flip: false},
        },
        camera: {center: [960, 464], zoom: 1, framing: "two-shot"},
      },
    }],
    performanceTracks: [{
      subject: "camera",
      kind: "world",
      events: [
        {
          kind: "call",
          subject: "camera",
          start: 0,
          end: 0.65,
          call: {raw: "camera.use.punch_in(bob)", name: "camera.use.punch_in", args: []},
          tracks: [{kind: "camera", events: [{at: 0, duration: 0.65, value: {operation: "push", zoom: 1.35, target: "bob"}}]}],
        },
        {
          kind: "call",
          subject: "camera",
          start: 0.65,
          end: 1.45,
          call: {raw: "camera.use.wide()", name: "camera.use.wide", args: []},
          tracks: [{kind: "camera", events: [{at: 0, duration: 0.8, value: {operation: "pull", zoom: 0.72}}]}],
        },
      ],
    }],
    totalDuration: 1.5,
  } as unknown as PerformanceManifest;

  const initial = evaluatePerformance(compiled, 0);
  const punch = evaluatePerformance(compiled, 15);
  const wide = evaluatePerformance(compiled, 35);

  assert.deepEqual([initial.actors[0]!.x, initial.actors[0]!.scale], [650, 0.76]);
  assert.ok(punch.camera.z >= initial.camera.z * 1.2);
  assert.ok(Math.abs(punch.camera.x - initial.camera.x) > 100);
  assert.ok(Math.abs(wide.camera.x - initial.camera.x) < 1);
  assert.equal(wide.camera.z, 0.72);
});
