import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {simulateScene, type MotorActorInput, type MotorIntent, type MotorScene} from "../src/motor";
import {
  ACCENT_NEAR, ACCENT_SLOW, ANTICIPATION_LEAN, SETTLE_MAX_PX, SETTLE_SEC,
  ANTICIPATION_DIP, ANTICIPATION_DIP_END, ANTICIPATION_RISE, ANTICIPATION_RISE_END,
  accentSpeed, anticipationEnvelope, anticipationLean, settleOffset,
} from "../src/motor/acting";

const SKELETON: MotorActorInput["skeleton"] = JSON.parse(readFileSync(new URL("../../../library/figure/lin/skeleton.json", import.meta.url), "utf8"));
const actor = (extra: Partial<MotorActorInput> = {}): MotorActorInput => ({
  id: "aqiang", x: 600, groundY: 691, facing: 1, scale: 1, skeleton: SKELETON, intents: [], ...extra,
});
const scene = (intent: Omit<MotorIntent, "at" | "duration">, durationSec = 2.4): MotorScene => ({
  durationSec,
  actors: [actor({intents: [{at: 0.1, duration: 1.4, ...intent}]}),
    actor({id: "awei", x: 1248, facing: -1})],
  props: [],
  resolveX: (id) => (id === "aqiang" ? 600 : id === "awei" ? 1248 : undefined),
});
const handSpeed = (frames: ReturnType<typeof simulateScene>["actors"][string]): number[] =>
  frames.map((frame, index) => {
    const before = frames[index - 1]?.reach;
    return index === 0 || !frame.reach || !before
      ? 0
      : Math.hypot(frame.reach[0] - before[0], frame.reach[1] - before[1]) * 24;
  });

test("shape math: settle overshoots once, decays to exactly 0 and never oscillates", () => {
  const span = 300;
  const samples = Array.from({length: 81}, (_, i) => settleOffset(span, 1, (i / 80) * SETTLE_SEC));
  assert.equal(samples[0], 0, "no offset at the key pose instant");
  assert.ok(Math.max(...samples) > 2, `overshoot must be visible: ${Math.max(...samples).toFixed(1)}px`);
  assert.ok(Math.max(...samples) <= SETTLE_MAX_PX, "overshoot stays bounded by the cap");
  // One overshoot then convergence: no sign change and no second rise.
  assert.equal(samples.every((value) => value >= 0), true, "the hand never reverses past the aim on its own");
  const peak = samples.indexOf(Math.max(...samples));
  for (let i = peak + 1; i < samples.length; i++) {
    assert.ok(samples[i]! <= samples[i - 1]! + 1e-9, `settle must decay monotonically after its peak (sample ${i})`);
  }
  assert.equal(settleOffset(span, 1, SETTLE_SEC), 0, "exactly 0 at the end of the settle");
  assert.equal(settleOffset(span, 1, SETTLE_SEC * 3), 0, "no residual oscillation later");
  assert.equal(settleOffset(span, 0, 0.1), 0, "0 reproduces the pre-M5 stop");
});

test("shape math: accent slows the travel away from the key pose and runs at the cap into it", () => {
  const span = 300;
  assert.equal(accentSpeed(span, span, 0), 1, "no accent keeps the plain travel speed");
  assert.ok(accentSpeed(10, span, 1) > 0.98, "the final approach runs at the channel cap");
  assert.ok(Math.abs(accentSpeed(span, span, 1) - (1 - ACCENT_SLOW)) < 1e-9, "far from the key pose the beat runs slow");
  assert.ok(accentSpeed(span * ACCENT_NEAR * 0.5, span, 1) > accentSpeed(span, span, 1) + 0.2, "contrast inside one beat");
  assert.equal(accentSpeed(span, span, 4), 1 - ACCENT_SLOW, "accent clamps at 1 rather than exceeding the ceiling");
});

test("shape math: anticipation is bounded and clamped by the torso rate", () => {
  assert.deepEqual(anticipationLean(0.4, 120), {peak: ANTICIPATION_LEAN, clamped: false});
  const short = anticipationLean(0.02, 120);
  assert.equal(short.clamped, true);
  assert.ok(short.peak < ANTICIPATION_LEAN && short.peak <= 120 * 0.02 * ANTICIPATION_RISE + 1e-9, `clamped peak ${short.peak}`);
  assert.equal(anticipationEnvelope(0, 0.25), 0, "no lean before the beat");
  assert.equal(anticipationEnvelope(0.25, 0.25), 1, "the shifted weight is held at the beat's start");
});

test("shape math: the pre-roll counter-dips, starts slow and releases fast", () => {
  const preRoll = 0.3;
  const at = (u: number) => anticipationEnvelope(u * preRoll, preRoll);
  // A rigid planar hinge would be one straight ramp; the profile is shaped.
  assert.ok(at(0.08) < 0, `the weight first eases the other way: ${at(0.08)}`);
  assert.ok(at(0.08) >= -ANTICIPATION_DIP - 1e-9, "the counter-dip stays small");
  assert.equal(at(ANTICIPATION_DIP_END), 0, "the dip returns through rest before the shift");
  const rise = [ANTICIPATION_DIP_END + 0.02, ANTICIPATION_DIP_END + 0.1, ANTICIPATION_RISE_END]
    .map((u) => anticipationEnvelope(u * preRoll, preRoll));
  assert.ok(rise[0]! < 0.1, `the rise starts slow: ${rise[0]}`);
  assert.ok(rise[1]! < (rise[1]! + rise[2]!) / 2, "most of the travel happens late");
  assert.equal(rise[2], 1, "the peak is reached before the beat starts");
  // Late travel is faster than early travel (a release, not a linear ramp).
  const early = at(ANTICIPATION_DIP_END + 0.12) - at(ANTICIPATION_DIP_END + 0.06);
  const late = at(ANTICIPATION_RISE_END) - at(ANTICIPATION_RISE_END - 0.06);
  assert.ok(late > early * 1.5, `release must be faster than the start: ${early} -> ${late}`);
});

test("anticipation: the torso leans opposite the motion and the beat starts later", () => {
  const plain = simulateScene(scene({intent: "move", target: "awei"}));
  const prepared = simulateScene(scene({intent: "move", target: "awei", anticipation: 0.25}));
  const lean = (trajectory: typeof plain) => trajectory.actors.aqiang!.map((frame) => frame.lean);
  const walkStart = (trajectory: typeof plain) => {
    const frames = trajectory.actors.aqiang!;
    return frames.findIndex((frame, index) => index > 0 && Math.abs(frame.x - frames[0]!.x) > 0.5);
  };
  assert.equal(Math.min(...lean(plain)), 0, "an unshaped beat does not lean");
  // The walk goes toward +x while the actor faces +x: preparation is backward,
  // i.e. negative in the facing frame, and never past the declared peak.
  assert.ok(Math.min(...lean(prepared)) < -2, `preparation must read: ${Math.min(...lean(prepared))}deg`);
  assert.ok(Math.min(...lean(prepared)) >= -ANTICIPATION_LEAN - 1e-9, "preparation stays bounded");
  const delayed = walkStart(prepared) - walkStart(plain);
  assert.ok(delayed >= 4, `the beat must wait for its pre-roll: ${delayed} frame(s) late`);
  assert.equal(prepared.diagnostics ?? null, null, "a full pre-roll needs no diagnostic");
});

test("anticipation: a pre-roll too short for the torso rate is clamped and reported", () => {
  const prepared = simulateScene(scene({intent: "move", target: "awei", anticipation: 0.02}));
  const diagnostic = (prepared.diagnostics ?? []).find((line) => line.startsWith("anticipation clamped"));
  assert.ok(diagnostic, `the clamp must be reported, got ${JSON.stringify(prepared.diagnostics)}`);
  const expected = anticipationLean(0.02, 120).peak;
  assert.ok(diagnostic.includes(`${expected.toFixed(1)}deg of the ${ANTICIPATION_LEAN}deg lean`), diagnostic);
  // The baked lean may not exceed what the rate allows inside the pre-roll.
  const peakLean = Math.max(...prepared.actors.aqiang!.map((frame) => Math.abs(frame.lean)));
  assert.ok(peakLean <= 1.45, `clamped preparation stays inside the rate limit: ${peakLean}deg`);
});

test("anticipation stays out of a fall: a shaped fall is the unshaped fall", () => {
  const plain = simulateScene(scene({intent: "fall"}));
  const shaped = simulateScene(scene({intent: "fall", anticipation: 0.25, accent: 1, settle: 1}));
  assert.deepEqual(shaped, plain, "balance is cut: nothing prepares and nothing settles");
  assert.equal(shaped.diagnostics ?? null, null);
});

test("accent: measurable velocity contrast, same key pose, still inside the hand cap", () => {
  const plain = simulateScene(scene({intent: "point", target: "awei"}));
  const accented = simulateScene(scene({intent: "point", target: "awei", accent: 1}));
  const speeds = (trajectory: typeof plain) => {
    const v = handSpeed(trajectory.actors.aqiang!);
    const moving = v.map((speed, index) => ({speed, index})).filter((entry) => entry.speed > 20);
    return v.slice(moving[0]!.index, moving.at(-1)!.index + 1);
  };
  const contrast = (window: number[]) => {
    const early = window.slice(0, Math.floor(window.length / 3));
    const late = window.slice(-Math.max(1, Math.floor(window.length * 0.35)));
    return late.reduce((a, b) => a + b, 0) / late.length / (early.reduce((a, b) => a + b, 0) / early.length);
  };
  const plainRatio = contrast(speeds(plain)), accentRatio = contrast(speeds(accented));
  assert.ok(accentRatio > 1.3, `accent must accelerate into the key pose: ratio ${accentRatio.toFixed(2)}`);
  assert.ok(accentRatio > plainRatio + 0.4, `the contrast must exceed the plain ease (${plainRatio.toFixed(2)})`);
  // The hand still reaches the same aim: a shape is timing, not new geometry.
  const aimX = (trajectory: typeof plain) => Math.max(...trajectory.actors.aqiang!.map((frame) => frame.reach?.[0] ?? -Infinity));
  assert.ok(Math.abs(aimX(accented) - aimX(plain)) < 0.5, `key pose moved: ${aimX(accented)} vs ${aimX(plain)}`);
  // Bake sampling rounds the reach point to 0.01 px, so allow that much.
  assert.ok(Math.max(...handSpeed(accented.actors.aqiang!)) <= 480.3, "the 480 px/s hand cap still binds");
});

test("settle: the hand overshoots its aim then converges, and stays converged", () => {
  const plain = simulateScene(scene({intent: "point", target: "awei"}));
  const settled = simulateScene(scene({intent: "point", target: "awei", settle: 1}));
  const xs = (trajectory: typeof plain) => trajectory.actors.aqiang!.map((frame) => frame.reach?.[0]);
  const plainX = xs(plain), settledX = xs(settled);
  const aimIndex = plainX.findIndex((x) => x !== undefined && x >= Math.max(...plainX.filter((v): v is number => v !== undefined)) - 0.5);
  assert.ok(aimIndex > 0, "the plain beat reaches its aim");
  const aim = plainX[aimIndex]!;
  const offsets = settledX.map((x) => (x === undefined ? undefined : x - aim));
  assert.ok(Math.max(...offsets.filter((v): v is number => v !== undefined)) > 2,
    `the settled hand must pass the aim: ${Math.max(...offsets.filter((v): v is number => v !== undefined)).toFixed(1)}px`);
  // After the overshoot it converges back to the aim and does not oscillate:
  // every sample after the peak is nearer the aim than the one before.
  const peak = offsets.reduce<number>((best, value, index) =>
    value !== undefined && value > (offsets[best] ?? -Infinity) ? index : best, 0);
  for (let i = peak + 1; i < offsets.length && i < aimIndex + 12; i++) {
    assert.ok((offsets[i] ?? 0) <= (offsets[i - 1] ?? 0) + 0.05, `settle must converge monotonically (frame ${i})`);
  }
  assert.ok((offsets[aimIndex + 11] ?? 1) < 0.5, "the hand comes back to the aim");
  // A settle is not a new pose: the retract tail is the same as the unshaped beat.
  assert.deepEqual(settledX.slice(-6), plainX.slice(-6));
});

test("shapes are deterministic and 0 is exactly the pre-M5 motion", () => {
  const shaped = scene({intent: "point", target: "awei", anticipation: 0.2, accent: 0.7, settle: 0.6});
  assert.deepEqual(simulateScene(shaped), simulateScene(shaped), "shaped beats stay deterministic");
  const zero = scene({intent: "point", target: "awei", anticipation: 0, accent: 0, settle: 0});
  assert.deepEqual(simulateScene(zero), simulateScene(scene({intent: "point", target: "awei"})),
    "explicit 0 is the same trajectory as an absent parameter");
});

test("call-site modifiers reach the bake: {...action.point(a,b), accent} shapes the beat", async () => {
  const {mkdtempSync, mkdirSync, writeFileSync, rmSync} = await import("node:fs");
  const {tmpdir} = await import("node:os");
  const {join} = await import("node:path");
  const {compileEpisode} = await import("../src/compiler/index");
  const {track} = await import("../src/invocation/stdlib");
  const action = {
    category: "action", manifest: {},
    namespace: {
      point: (subject: {id: string}, target: {id: string}) => ({
        durationSec: 1.4, mode: "block" as const,
        *run(world: Parameters<typeof track>[0]) {
          track(world, "motor", subject.id, [{at: 0, duration: 1.4, intent: "point", target: target.id}]);
          yield 1.4;
        },
      }),
    },
  };
  const compile = async (modifiers: string) => {
    const root = mkdtempSync(join(tmpdir(), "anim-acting-shape-"));
    try {
      const dir = join(root, "episodes", "demo");
      mkdirSync(dir, {recursive: true});
      const episodePath = join(dir, "episode.yml");
      writeFileSync(episodePath, `episode: {id: shape, title: Shape, language: en}
actors: {lin: {use: figure/x/lin, voice: voice/x/lin}, wei: {use: figure/x/lin, voice: voice/x/lin}}
locations: {stage: {use: set/x/stage}}
objects: {}
scenes:
  - id: beat
    location: stage
    actors: {lin: {facing: wei}, wei: {facing: lin}}
    objects: {}
    script:
      - lin: "…{...action.point(lin, wei)${modifiers}}"
`);
      const compiled = await compileEpisode(episodePath, {
        registry: (ref: string) => (ref.startsWith("figure/") ? {skeleton: SKELETON} : {}),
        plugins: [{category: "action", manifest: {}, namespace: action.namespace}],
        speechTimingProvider: () => ({durationSec: 0.5}),
      });
      return compiled.sceneTrack[0]!.motor!;
    } finally {
      rmSync(root, {recursive: true, force: true});
    }
  };
  const plain = await compile("");
  const shaped = await compile(", anticipation: 0.2, accent: 1, settle: 1");
  assert.notDeepEqual(shaped.actors.lin, plain.actors.lin, "the call-site modifiers must reach the baked beat");
  // The anticipation is the first visible difference: the plain beat starts at
  // once, the shaped one holds its preparation.
  assert.equal(plain.actors.lin![0]!.x, shaped.actors.lin![0]!.x);
  assert.ok(Math.min(...shaped.actors.lin!.map((frame) => frame.lean)) < -2, "the prepared beat leans back");
  assert.equal(Math.min(...plain.actors.lin!.map((frame) => frame.lean)), 0, "the plain beat does not");
});
