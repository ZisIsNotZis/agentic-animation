/**
 * Minimal 2D affine matrix in design-pixel space. Puppet articulation is plain
 * affine transforms on parts around pivots (ARCHITECTURE §8.2 — no hidden
 * construction switches). Row form applied to a column vector [x, y, 1]:
 *
 *   | a c e |
 *   | b d f |
 *   | 0 0 1 |
 *
 * Serialized to CSS as `matrix(a, b, c, d, e, f)` with `transform-origin: 0 0`,
 * so a part sprite (a full design-canvas image) is placed by matrix alone.
 */
export interface Mat2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export const IDENTITY: Mat2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Multiply m ∘ n (apply n first, then m). */
export function mul(m: Mat2D, n: Mat2D): Mat2D {
  return {
    a: m.a * n.a + m.c * n.b,
    b: m.b * n.a + m.d * n.b,
    c: m.a * n.c + m.c * n.d,
    d: m.b * n.c + m.d * n.d,
    e: m.a * n.e + m.c * n.f + m.e,
    f: m.b * n.e + m.d * n.f + m.f,
  };
}

export function translate(x: number, y: number): Mat2D {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

export function scale(sx: number, sy: number): Mat2D {
  return { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 };
}

export function rotate(deg: number): Mat2D {
  const r = (deg * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 };
}

/**
 * A local part transform: rotate `rot`°, scale `s`, and offset `pos`, all taken
 * around the part's `pivot` (design space). Order: translate to pivot, apply
 * pos → rotate → scale, translate pivot back.
 */
export function localTransform(
  pivot: readonly [number, number],
  rot: number,
  s: number,
  pos: readonly [number, number],
): Mat2D {
  const [px, py] = pivot;
  let m = translate(px + pos[0], py + pos[1]);
  m = mul(m, rotate(rot));
  m = mul(m, scale(s, s));
  m = mul(m, translate(-px, -py));
  return m;
}

/**
 * A single native-attach part placement (ARCHITECTURE §8.2, `nativeAttach`). The
 * part is a trimmed native-size image with a part-local `pivot`; it is placed so
 * its pivot lands on `attach`, then normalized + articulated. Order, right to
 * left applied to an own-space point:
 *
 *   T(attach) · T(pos) · R(rot) · S(sAnim) · S(norm) · T(-pivot)
 *
 *   1. T(-pivot)   — move the part's pivot to the origin (own space).
 *   2. S(norm)     — reshape the raw art to its target proportions (about pivot).
 *   3. S(sAnim)    — animated uniform scale about the pivot.
 *   4. R(rot)      — animated rotation about the pivot.
 *   5. T(pos)      — animated offset.
 *   6. T(attach)   — hook the pivot onto the attach point.
 *
 * This is a standalone primitive (its `norm` reshapes this one part about its
 * pivot). The RUNTIME chain in `partMatrices` does NOT simply compose these —
 * because a part's `norm` here would propagate to descendants and shear them, it
 * instead uses a rigid bone frame (no norm) plus a local art scale (see
 * partMatrices). Kept for the root placement and as a documented building block.
 */
export function nativeLocalTransform(
  pivot: readonly [number, number],
  attach: readonly [number, number],
  norm: readonly [number, number],
  rot: number,
  sAnim: number,
  pos: readonly [number, number],
): Mat2D {
  const [px, py] = pivot;
  let m = translate(attach[0] + pos[0], attach[1] + pos[1]);
  m = mul(m, rotate(rot));
  m = mul(m, scale(sAnim, sAnim));
  m = mul(m, scale(norm[0], norm[1]));
  m = mul(m, translate(-px, -py));
  return m;
}

/** CSS `matrix(...)` string. Pair with `transform-origin: 0 0`. */
export function toCss(m: Mat2D): string {
  return `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${m.e}, ${m.f})`;
}
