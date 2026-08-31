/**
 * Seeded PRNG. Determinism is a hard rule (CLAUDE.md): no `Math.random()` in
 * any render-path or manifest-generating code — construct a `Prng` from an
 * explicit integer seed recorded in the manifest and draw from it instead.
 *
 * Algorithm: mulberry32 — small, fast, good enough for animation noise and
 * scheduling, fully reproducible across platforms.
 */
export interface Prng {
  /** Next float in [0, 1). */
  next(): number;
  /** Integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** Float in [min, max). */
  range(min: number, max: number): number;
  /** Deterministically pick one element; throws on empty arrays. */
  pick<T>(items: readonly T[]): T;
}

/** Hash an arbitrary string to a 32-bit integer seed (FNV-1a). */
export function seedFromString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createPrng(seed: number): Prng {
  let a = seed >>> 0;
  const next = (): number => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(maxExclusive: number): number {
      if (maxExclusive <= 0) throw new RangeError("int(maxExclusive) needs maxExclusive > 0");
      return Math.floor(next() * maxExclusive);
    },
    range(min: number, max: number): number {
      return min + next() * (max - min);
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new RangeError("pick() from an empty array");
      return items[Math.floor(next() * items.length)]!;
    },
  };
}
