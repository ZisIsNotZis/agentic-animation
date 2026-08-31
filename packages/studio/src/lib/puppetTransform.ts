/**
 * Pure puppet transform math shared by the render-time components. Given a
 * puppet, its flattened part tracks, and a time, produce a world-space affine
 * matrix per part by composing local transforms up the parent chain. No React,
 * no DOM — a pure function of (model, time), so the render stays deterministic.
 */
import type { Viseme } from "@anim/core";
import { sampleChannel, type Keyframe } from "./interpolate";
import {
  IDENTITY,
  localTransform,
  mul,
  rotate,
  scale as mScale,
  translate,
  type Mat2D,
} from "./matrix";
import type { RmActor, RmKey, RmPartTrack, RmPuppet } from "../model";

function keysFor(tracks: RmPartTrack[], part: string): RmKey[] {
  return tracks.find((t) => t.part === part)?.keys ?? [];
}

function sampleTransform(keys: RmKey[], t: number): { rot: number; s: number; pos: [number, number] } {
  const k = keys as (RmKey & Keyframe)[];
  return {
    rot: sampleChannel(k, t, (x) => x.rot, 0),
    s: sampleChannel(k, t, (x) => x.scale, 1),
    pos: [sampleChannel(k, t, (x) => x.pos?.[0], 0), sampleChannel(k, t, (x) => x.pos?.[1], 0)],
  };
}

/**
 * The draw (art) matrix per part id — maps the part's own image pixels to design
 * space. Branches on the puppet's rig model (ARCHITECTURE §8.2):
 *
 * - **sharedFrame**: articulation about the pivot in the shared design frame
 *   (attach/norm/native size ignored — parts are pre-placed full-canvas art).
 *   `world(part) = world(parent) · localTransform(pivot, rot, scale, pos)`.
 *
 * - **nativeAttach**: attach-based forward kinematics with a *bone / art split*
 *   so a part's proportion `norm` reshapes only its OWN art and never distorts
 *   descendants. Each part has a rigid **bone frame** (rotation + animated scale
 *   + translation, NO norm) whose origin is the part's pivot; a child's bone hooks
 *   onto the parent's `attach` point expressed in target units (the parent's norm
 *   applied as a fixed offset vector, not a propagating matrix). The drawn art is
 *   `boneFrame · S(norm) · T(-pivot)` — norm applied last, locally. For the root
 *   (`parent: null`), `attach` is the design-space anchor for its pivot (defaults
 *   to the design centre). This keeps the attach chain connected under any parent
 *   rotation while normalizing every part's arbitrary native size.
 */
export function partMatrices(puppet: RmPuppet, tracks: RmPartTrack[], t: number): Map<string, Mat2D> {
  const byId = new Map(puppet.parts.map((p) => [p.id, p]));
  const native = puppet.rig === "nativeAttach";
  const [dw, dh] = puppet.designSize;

  if (!native) {
    // sharedFrame — unchanged: compose pivot transforms up the parent chain.
    const cache = new Map<string, Mat2D>();
    const world = (id: string, guard: Set<string>): Mat2D => {
      const cached = cache.get(id);
      if (cached) return cached;
      const part = byId.get(id);
      if (!part || guard.has(id)) return IDENTITY;
      guard.add(id);
      const s = sampleTransform(keysFor(tracks, id), t);
      const local = localTransform(part.pivot, s.rot, s.s, s.pos);
      const parent = part.parent ? world(part.parent, guard) : IDENTITY;
      const m = mul(parent, local);
      cache.set(id, m);
      return m;
    };
    const out = new Map<string, Mat2D>();
    for (const p of puppet.parts) out.set(p.id, world(p.id, new Set()));
    return out;
  }

  // nativeAttach — rigid bone frame (no norm) so norm never propagates.
  const boneCache = new Map<string, Mat2D>();
  const bone = (id: string, guard: Set<string>): Mat2D => {
    const cached = boneCache.get(id);
    if (cached) return cached;
    const part = byId.get(id);
    if (!part || guard.has(id)) return IDENTITY;
    guard.add(id);
    const s = sampleTransform(keysFor(tracks, id), t);
    let m: Mat2D;
    if (!part.parent) {
      // Root: place its pivot at the design-space anchor, rotate/scale about it.
      const anchor = part.attach ?? [dw / 2, dh * 0.3];
      m = translate(anchor[0] + s.pos[0], anchor[1] + s.pos[1]);
    } else {
      const parent = byId.get(part.parent);
      const parentBone = bone(part.parent, guard);
      // Attach offset from the parent's pivot to this child's attach point, in
      // TARGET units: the parent's norm applied as a fixed vector (never a matrix
      // in the chain), so the child's frame carries the parent's rotation but not
      // its non-uniform scale.
      const a = part.attach ?? part.pivot;
      const pn = parent ? parent.norm : ([1, 1] as const);
      const pp = parent ? parent.pivot : ([0, 0] as const);
      const vx = pn[0] * (a[0] - pp[0]) + s.pos[0];
      const vy = pn[1] * (a[1] - pp[1]) + s.pos[1];
      m = mul(parentBone, translate(vx, vy));
    }
    m = mul(m, rotate(s.rot));
    m = mul(m, mScale(s.s, s.s));
    boneCache.set(id, m);
    return m;
  };

  const out = new Map<string, Mat2D>();
  for (const p of puppet.parts) {
    // Draw transform: normalize the raw art onto its target footprint (about the
    // pivot), placed by the rigid bone frame — norm is local and does not carry.
    let art = mul(bone(p.id, new Set()), mScale(p.norm[0], p.norm[1]));
    art = mul(art, translate(-p.pivot[0], -p.pivot[1]));
    out.set(p.id, art);
  }
  return out;
}

/**
 * Actor placement matrix: map the puppet's design canvas onto the stage so the
 * anchor (bottom-centre — the figure's feet) lands at `at`, with `scale`, and
 * horizontal mirroring from `facing`/`flip`.
 */
export function actorMatrix(actor: RmActor): Mat2D {
  const [w, h] = actor.puppet.designSize;
  const sx = actor.scale * (actor.facing < 0 || actor.flip ? -1 : 1);
  let m = translate(actor.at[0], actor.at[1]);
  m = mul(m, mScale(sx, actor.scale));
  m = mul(m, translate(-w / 2, -h));
  return m;
}

/** Pick the mouth viseme active at time `t` (rest pose `X` when none). */
export function visemeAt(actor: RmActor, t: number): Viseme {
  for (const c of actor.mouthTrack) {
    if (t >= c.start && t < c.end) return c.viseme;
  }
  return "X";
}

export function faceAt(actor: RmActor, t: number): { smile: number; brow: number; eyeOpen: number; lipsPart: number; gaze: [number, number] } {
  const f = (actor.faceTrack ?? []).filter((x) => x.t <= t).at(-1);
  return {
    smile: f?.smile ?? 0,
    brow: f?.brow ?? 0,
    eyeOpen: f?.eyeOpen ?? 1,
    lipsPart: f?.lipsPart ?? 0,
    gaze: f?.gaze ? [f.gaze[0], f.gaze[1]] : [0, 0],
  };
}

export function actorAt(actor: RmActor, t: number): [number, number] {
  const moves = actor.moveTrack ?? [];
  const move = moves.filter((x) => x.t <= t).at(-1);
  if (!move) return actor.at;
  const previous = moves.filter((x) => x.t < move.t).at(-1)?.to ?? actor.at;
  const p = move.t1 && move.t1 > move.t ? Math.max(0, Math.min(1, (t - move.t) / (move.t1 - move.t))) : 1;
  return [previous[0] + (move.to[0] - previous[0]) * p, previous[1] + (move.to[1] - previous[1]) * p];
}

/** Eye frame index at time `t`: a blink closes the eyes briefly (~0.12s). */
export function eyeFrameAt(actor: RmActor, t: number, frameCount: number): number {
  if (frameCount <= 1) return 0;
  const BLINK = 0.12;
  for (const start of actor.blinkTrack) {
    if (t < start || t >= start + BLINK) continue;
    const p = (t - start) / BLINK; // 0..1 across the blink
    const half = frameCount - 1;
    const idx = p < 0.5 ? Math.round(p * 2 * half) : Math.round((1 - (p - 0.5) * 2) * half);
    return Math.max(0, Math.min(frameCount - 1, idx));
  }
  return 0;
}
