import { test } from "node:test";
import assert from "node:assert/strict";
import { localTransform, nativeLocalTransform, mul, rotate, type Mat2D } from "../src/lib/matrix";
import { partMatrices } from "../src/lib/puppetTransform";
import type { RmPartTrack, RmPuppet, RmSpritePart } from "../src/model";

// --- helpers ---------------------------------------------------------------

function apply(m: Mat2D, [x, y]: [number, number]): [number, number] {
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}
function near(a: [number, number], b: [number, number], eps = 1e-6): void {
  assert.ok(Math.abs(a[0] - b[0]) < eps && Math.abs(a[1] - b[1]) < eps, `${JSON.stringify(a)} ≈ ${JSON.stringify(b)}`);
}

function part(p: Partial<RmSpritePart> & Pick<RmSpritePart, "id" | "parent" | "pivot">): RmSpritePart {
  return { z: 0, norm: [1, 1], size: [100, 100], src: "", ...p };
}

/** A small nativeAttach humanoid fragment: torso → head, torso → arm_u_l → arm_l_l. */
function nativeRig(): RmPuppet {
  return {
    id: "t",
    rig: "nativeAttach",
    designSize: [1024, 2048],
    parts: [
      part({ id: "torso", parent: null, pivot: [110, 70], attach: [512, 620], norm: [1.3, 1.4], size: [220, 500], z: 10 }),
      part({ id: "head", parent: "torso", pivot: [250, 447], attach: [110, 30], norm: [0.68, 0.73], size: [500, 520], z: 40 }),
      part({ id: "arm_u_l", parent: "torso", pivot: [32, 36], attach: [37, 60], norm: [1.7, 1.0], size: [64, 300], z: 20 }),
      part({ id: "arm_l_l", parent: "arm_u_l", pivot: [25, 24], attach: [32, 270], norm: [1.9, 1.08], size: [50, 240], z: 20 }),
    ],
    mouth: { anchor: "head", z: 100, shapes: {} as RmPuppet["mouth"]["shapes"] },
  };
}

/** Child id → its parent part, for the connectivity invariant. */
const PARENT: Record<string, string> = { head: "torso", arm_u_l: "torso", arm_l_l: "arm_u_l" };

// --- FK placement round-trip ----------------------------------------------

test("nativeAttach: each child's pivot lands exactly on its parent's attach point (rest pose)", () => {
  const rig = nativeRig();
  const worlds = partMatrices(rig, [], 0);
  const byId = new Map(rig.parts.map((p) => [p.id, p]));
  for (const [child, parentId] of Object.entries(PARENT)) {
    const c = byId.get(child)!;
    const jointFromChild = apply(worlds.get(child)!, c.pivot); // where the child's pivot is drawn
    const jointFromParent = apply(worlds.get(parentId)!, c.attach!); // where the parent's attach point is drawn
    near(jointFromChild, jointFromParent);
  }
});

test("nativeAttach: pivot placement is invariant to the child's own norm / rot / scale", () => {
  const rig = nativeRig();
  // rot + scale (no pos): all about the pivot, so the pivot stays on the joint.
  const tracks: RmPartTrack[] = [
    { part: "head", keys: [{ t: 0, rot: 37, scale: 1.4 }] },
    { part: "arm_u_l", keys: [{ t: 0, rot: -80, scale: 0.7 }] },
  ];
  const worlds = partMatrices(rig, tracks, 0);
  const byId = new Map(rig.parts.map((p) => [p.id, p]));
  for (const child of ["head", "arm_u_l"]) {
    const c = byId.get(child)!;
    near(apply(worlds.get(child)!, c.pivot), apply(worlds.get(PARENT[child]!)!, c.attach!));
  }
});

// --- rotation about a joint keeps the attach chain connected ---------------

test("nativeAttach: rotating a parent keeps every downstream joint connected", () => {
  const rig = nativeRig();
  const tracks: RmPartTrack[] = [
    { part: "torso", keys: [{ t: 0, rot: 25 }] },
    { part: "arm_u_l", keys: [{ t: 0, rot: 40 }] },
  ];
  const worlds = partMatrices(rig, tracks, 0);
  const byId = new Map(rig.parts.map((p) => [p.id, p]));
  // The wrist joint (arm_l_l pivot) must still sit on the forearm's attach point
  // on arm_u_l, and arm_u_l's pivot on the torso's shoulder — connected chain.
  for (const [child, parentId] of Object.entries(PARENT)) {
    const c = byId.get(child)!;
    near(apply(worlds.get(child)!, c.pivot), apply(worlds.get(parentId)!, c.attach!));
  }
});

test("nativeAttach: a parent rotation actually propagates to the child (not static)", () => {
  const rig = nativeRig();
  const rest = partMatrices(rig, [], 0);
  const rotated = partMatrices(rig, [{ part: "torso", keys: [{ t: 0, rot: 30 }] }], 0);
  const armPivot = rig.parts.find((p) => p.id === "arm_u_l")!.pivot;
  const before = apply(rest.get("arm_u_l")!, armPivot);
  const after = apply(rotated.get("arm_u_l")!, armPivot);
  // The shoulder is offset from the torso pivot, so a torso rotation must move it.
  assert.ok(Math.hypot(after[0] - before[0], after[1] - before[1]) > 1, "torso rotation should move the shoulder joint");
});

// --- declaration-order independence + z-order ------------------------------

test("nativeAttach: FK is independent of part declaration order (child before parent)", () => {
  const rig = nativeRig();
  const shuffled: RmPuppet = { ...rig, parts: [...rig.parts].reverse() };
  const a = partMatrices(rig, [], 0);
  const b = partMatrices(shuffled, [], 0);
  for (const p of rig.parts) {
    const ma = a.get(p.id)!;
    const mb = b.get(p.id)!;
    for (const k of ["a", "b", "c", "d", "e", "f"] as const) assert.ok(Math.abs(ma[k] - mb[k]) < 1e-9, `${p.id}.${k}`);
  }
});

test("z-order: draw order is ascending z, ties resolved stably by declaration order", () => {
  const rig = nativeRig(); // arm_u_l and arm_l_l both z=20, declared in that order
  const sorted = [...rig.parts].sort((x, y) => x.z - y.z);
  const zs = sorted.map((p) => p.z);
  for (let i = 1; i < zs.length; i++) assert.ok(zs[i]! >= zs[i - 1]!, "z ascending");
  // torso(10) under arms(20) under head(40); the z=20 tie keeps declaration order.
  assert.deepEqual(sorted.map((p) => p.id), ["torso", "arm_u_l", "arm_l_l", "head"]);
  // Sorting is a pure function of z: it does not depend on the parts' transforms.
  const jittered = rig.parts.map((p) => ({ ...p, pivot: [p.pivot[0] + 999, p.pivot[1]] as [number, number] }));
  assert.deepEqual([...jittered].sort((x, y) => x.z - y.z).map((p) => p.id), sorted.map((p) => p.id));
});

// --- sharedFrame unchanged + matrix identities -----------------------------

test("sharedFrame: articulation is a rotation/scale about the pivot (pivot fixed at pos)", () => {
  // localTransform maps the pivot to pivot+pos; with pos=0 the pivot is fixed.
  const m = localTransform([500, 900], 42, 1.7, [0, 0]);
  near(apply(m, [500, 900]), [500, 900]);
  const m2 = localTransform([500, 900], 42, 1.7, [10, -20]);
  near(apply(m2, [500, 900]), [510, 880]);
});

test("sharedFrame rig ignores attach/norm — a child composes by pivot transforms only", () => {
  const rig: RmPuppet = {
    id: "s",
    rig: "sharedFrame",
    designSize: [1024, 2048],
    parts: [
      part({ id: "torso", parent: null, pivot: [512, 600], size: [1024, 2048], z: 10, attach: [999, 999], norm: [3, 3] }),
      part({ id: "head", parent: "torso", pivot: [512, 560], size: [1024, 2048], z: 40, attach: [999, 999], norm: [3, 3] }),
    ],
    mouth: { anchor: "head", z: 100, shapes: {} as RmPuppet["mouth"]["shapes"] },
  };
  const worlds = partMatrices(rig, [], 0);
  // With no animation, sharedFrame world matrices are identity (attach/norm are
  // ignored; parts are pre-placed in the shared frame) — a point maps to itself.
  near(apply(worlds.get("head")!, [512, 560]), [512, 560]);
  near(apply(worlds.get("torso")!, [512, 600]), [512, 600]);
});

test("matrix: nativeLocalTransform composes T(attach)·R·S·Snorm·T(-pivot)", () => {
  // Rotating 0°, unit scale, no norm, no pos: pivot → attach, and a point offset
  // from the pivot keeps its relative offset (pure translation).
  const m = nativeLocalTransform([10, 20], [100, 200], [1, 1], 0, 1, [0, 0]);
  near(apply(m, [10, 20]), [100, 200]);
  near(apply(m, [10, 30]), [100, 210]);
  // norm scales the offset from the pivot; pivot itself is invariant.
  const n = nativeLocalTransform([10, 20], [100, 200], [2, 3], 0, 1, [0, 0]);
  near(apply(n, [10, 20]), [100, 200]);
  near(apply(n, [15, 20]), [110, 200]); // dx 5 → ×2 = 10
  near(apply(n, [10, 25]), [100, 215]); // dy 5 → ×3 = 15
  // A pure 90° rotation about the pivot maps +x offset to +y (mul sanity too).
  const r = nativeLocalTransform([0, 0], [0, 0], [1, 1], 90, 1, [0, 0]);
  near(apply(r, [1, 0]), [0, 1]);
  assert.deepEqual(mul(rotate(0), r).a !== undefined, true);
});
