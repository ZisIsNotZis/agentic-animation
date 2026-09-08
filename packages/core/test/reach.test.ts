// Geometric contract for the reach -> drawn-arm mapping (docs/WORLD_PUPPET_MOTOR.md):
// the FK hand joint, back-mapped to world space the way the renderer places
// the figure, must land ON the motor's baked reach point — for every facing,
// flip, scale, and waist-pitch combination. Reachable targets are hit within
// 25 design px; out-of-reach targets clamp to full extension pointing AT the
// target.
import {test} from "node:test";
import assert from "node:assert/strict";
import {solveReach, renderedHandWorld, renderedShoulderWorld, type ReachInput} from "../../studio/src/components/performance/reach";
import {readFileSync} from "node:fs";

const LIN = JSON.parse(readFileSync(new URL("../../../library/figure/lin/skeleton.json", import.meta.url), "utf8"));
const AQIANG = JSON.parse(readFileSync(new URL("../../../library/figure/aqiang/skeleton.json", import.meta.url), "utf8"));

interface Scenario {
  name: string;
  actor: Omit<ReachInput, "reach">;
  reach: [number, number];
  reachable: boolean;
}

const BASE = {motor: true, y: 691.2, scale: 0.88, contact: true};

function scenarios(): Scenario[] {
  const out: Scenario[] = [];
  for (const [name, skeleton] of [["lin", LIN], ["aqiang", AQIANG]] as const) {
    for (const facing of [1, -1] as const) {
      for (const waist of [0, -18, 18]) {
        // Reachable: 180 stage px forward of the actor at chest height.
        const x = 907;
        out.push({
          name: `${name} facing ${facing} waist ${waist} reachable`,
          actor: {...BASE, id: name, x, facing, flip: facing === -1, waist, skeleton},
          reach: [x + facing * 180, 393.3],
          reachable: true,
        });
        // Out of reach: 600 stage px forward — must clamp to full extension
        // pointing at the target.
        out.push({
          name: `${name} facing ${facing} waist ${waist} far`,
          actor: {...BASE, id: name, x, facing, flip: facing === -1, waist, skeleton},
          reach: [x + facing * 600, 393.3],
          reachable: false,
        });
      }
    }
  }
  return out;
}

for (const scenario of scenarios()) {
  test(`reach: ${scenario.name}`, () => {
    const actor = {...scenario.actor, reach: scenario.reach} as ReachInput;
    const result = solveReach(actor);
    // Ground truth: exactly what the SVG renders (arm rotations nested in
    // the torso group, then the div mirror).
    const world = renderedHandWorld(actor, result.armRight, result.flipped);
    const miss = Math.hypot(world[0] - scenario.reach[0], world[1] - scenario.reach[1]);
    if (scenario.reachable) {
      assert.ok(
        miss <= 25,
        `${scenario.name}: rendered hand ${world.map((v) => v.toFixed(0))} missed reach ${scenario.reach} by ${miss.toFixed(1)}px`,
      );
    } else {
      // Full extension: the hand sits at arm's length along the rendered
      // shoulder->target ray (pointing AT the target).
      const sk = actor.skeleton!;
      const armLen = (sk.arm.upper + sk.arm.fore) * actor.scale;
      const shWorld = renderedShoulderWorld(actor, result.flipped);
      const toTarget = Math.hypot(scenario.reach[0] - shWorld[0], scenario.reach[1] - shWorld[1]);
      const extended = Math.hypot(world[0] - shWorld[0], world[1] - shWorld[1]);
      assert.ok(
        Math.abs(extended - armLen) <= 6,
        `${scenario.name}: far target not clamped to full extension (${extended.toFixed(1)} vs ${armLen.toFixed(1)})`,
      );
      const cross = ((world[0] - shWorld[0]) * (scenario.reach[1] - shWorld[1]) - (world[1] - shWorld[1]) * (scenario.reach[0] - shWorld[0])) / toTarget;
      assert.ok(
        Math.abs(cross) <= 6,
        `${scenario.name}: clamped hand off the shoulder->target ray by ${cross.toFixed(1)}px`,
      );
    }
  });
}
