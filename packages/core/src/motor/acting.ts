/**
 * M5 acting shapes — anticipation, accent, settle
 * (docs/8_MOTOR.md "Acting shapes"). Additive performance
 * parameters on a motor intent: every one defaults to 0 and 0 reproduces the
 * pre-M5 trajectory exactly, so the motor needs no second motion path.
 *
 * The functions here are pure so the shape is measurable on its own
 * (packages/core/test/actingShapes.test.ts) and the motor only supplies the
 * channel each one drives.
 */

/** Torso pre-roll: peak opposite lean (deg) and the longest pre-roll (s). */
export const ANTICIPATION_LEAN = 10;
export const ANTICIPATION_MAX_SEC = 0.4;
/** Pre-roll shape, as shares of the pre-roll. A single linear ramp reads as a
 *  rigid planar hinge, so the weight first eases the OTHER way (a small
 *  counter-dip), then rises with a slow start and a fast release, then holds
 *  the shifted weight until the beat starts. */
export const ANTICIPATION_DIP = 0.2;
export const ANTICIPATION_DIP_END = 0.3;
export const ANTICIPATION_RISE_END = 0.72;
/** Share of the pre-roll that actually travels up to the peak; the peak reach a
 *  torso rate can deliver inside a pre-roll is proportional to it. */
export const ANTICIPATION_RISE = ANTICIPATION_RISE_END - ANTICIPATION_DIP_END;

export function smoothstep01(t: number): number {
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
}

/** The lean a pre-roll can reach at a torso rate. A pre-roll too short to
 *  reach the full lean at that rate is clamped, and `clamped` reports it
 *  (the motor turns that into a diagnostic, never a silent swallow). */
export function anticipationLean(preRollSec: number, rateDegPerSec: number): {peak: number; clamped: boolean} {
  const allowed = Math.max(0, rateDegPerSec) * Math.max(0, preRollSec) * ANTICIPATION_RISE;
  const peak = Math.min(ANTICIPATION_LEAN, allowed);
  return {peak, clamped: peak < ANTICIPATION_LEAN};
}

/** Pre-roll envelope at `t` seconds: counter-dip, slow-start/fast-release
 *  rise, then a held shifted weight until the beat starts (the beat's own
 *  return is rate-limited by the channel it drives). Negative values are the
 *  dip: the envelope multiplies the peak lean, so -x is a small move the
 *  other way. */
export function anticipationEnvelope(t: number, preRollSec: number): number {
  if (!(preRollSec > 0)) return 0;
  const u = Math.min(1, Math.max(0, t / preRollSec));
  if (u < ANTICIPATION_DIP_END) {
    const dip = ANTICIPATION_DIP * Math.sin(Math.PI * (u / ANTICIPATION_DIP_END));
    return dip === 0 ? 0 : -dip;
  }
  if (u >= ANTICIPATION_RISE_END) return 1;
  const rise = (u - ANTICIPATION_DIP_END) / ANTICIPATION_RISE;
  // Ease-in squared: a slower start than smoothstep, then a faster release.
  return smoothstep01(rise) ** 2;
}

/** Accent: the acting hand's travel as a fraction of its own cap. Away from
 *  the key pose the beat runs at (1 - 0.45*accent) of the cap; inside the
 *  final 35% of the span it runs at the cap — a measurable velocity contrast
 *  with the speed ceiling unchanged. */
export const ACCENT_SLOW = 0.45;
export const ACCENT_NEAR = 0.35;
export function accentSpeed(remaining: number, span: number, accent: number): number {
  if (!(accent > 0) || !(span > 0)) return 1;
  const share = Math.min(1, Math.max(0, remaining / span));
  const approach = 1 - Math.min(1, share / ACCENT_NEAR);
  return 1 - ACCENT_SLOW * Math.min(1, accent) * (1 - smoothstep01(approach));
}

/** Settle: a decaying overshoot past the key pose, in px, `t` seconds after
 *  the key pose was reached. It peaks a third of the way in and is exactly 0
 *  from SETTLE_SEC on, so it converges (never a residual oscillation). */
export const SETTLE_SEC = 0.4;
export const SETTLE_FRACTION = 0.06;
export const SETTLE_MAX_PX = 14;
export const SETTLE_PEAK_AT = 1 / 3;
export function settleOffset(span: number, settle: number, t: number): number {
  if (!(settle > 0) || !(span > 0) || t < 0 || t >= SETTLE_SEC) return 0;
  const u = t / SETTLE_SEC;
  const rise = smoothstep01(u / SETTLE_PEAK_AT);
  const fall = (1 - u) * (1 - u);
  return Math.min(span * SETTLE_FRACTION, SETTLE_MAX_PX) * Math.min(1, settle) * rise * fall;
}
