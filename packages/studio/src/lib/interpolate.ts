/**
 * Deterministic keyframe sampling + easing. Pure: output is a function of the
 * keys and the query time only — no wall clock, no randomness (CLAUDE.md
 * determinism rule). Shared by the assemble stage and the render-time
 * components so both agree exactly.
 */
export type Ease = "linear" | "io" | "in" | "out" | "back";

/** Map a normalized 0..1 progress through the named easing curve. */
export function ease(name: Ease | undefined, x: number): number {
  const t = x < 0 ? 0 : x > 1 ? 1 : x;
  switch (name) {
    case "in":
      return t * t * t;
    case "out":
      return 1 - Math.pow(1 - t, 3);
    case "back": {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }
    case "io":
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    case "linear":
    default:
      return t;
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** A generic keyframe: a time plus any subset of animated channels. */
export interface Keyframe {
  t: number;
  ease?: Ease;
}

/**
 * Sample one numeric channel from sorted keyframes at time `t`. Keys carry the
 * channel via `pick`; keys where `pick` is undefined are skipped so channels
 * animate independently. Returns `fallback` when no key defines the channel.
 * The easing of the *right-hand* key governs the segment (salvaged convention).
 */
export function sampleChannel<K extends Keyframe>(
  keys: readonly K[],
  t: number,
  pick: (k: K) => number | undefined,
  fallback: number,
): number {
  let prev: { t: number; v: number } | undefined;
  let prevEase: Ease | undefined;
  for (const k of keys) {
    const v = pick(k);
    if (v === undefined) continue;
    if (k.t <= t) {
      prev = { t: k.t, v };
      prevEase = k.ease;
      continue;
    }
    // First key after t: interpolate from prev (if any).
    if (!prev) return v;
    const span = k.t - prev.t;
    const p = span <= 0 ? 1 : (t - prev.t) / span;
    return lerp(prev.v, v, ease(k.ease, p));
  }
  if (prev) return prev.v;
  void prevEase;
  return fallback;
}
