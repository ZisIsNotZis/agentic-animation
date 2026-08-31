import type { TimeRef } from "../schemas/common";

/**
 * The minimal timing facts a time ref resolves against — a `timeline.json`
 * scene entry supplies all of these.
 */
export interface SceneTiming {
  /** Absolute scene start (seconds from film start). */
  start: number;
  /** Absolute narration start (seconds from film start). */
  narrAt: number;
  /** Full scene duration (seconds). */
  dur: number;
}

const PERCENT_RE = /^(\d+(?:\.\d+)?)%$/;
const NARR_RE = /^narr([+-]\d+(?:\.\d+)?)$/;

/**
 * Resolve a storyboard time ref to an absolute time in seconds from film start,
 * given the scene it belongs to. Salvaged vocabulary (ARCHITECTURE §6):
 *
 *   - `number`   → `scene.start + n`      (seconds from scene start)
 *   - `"NN%"`    → `scene.start + NN/100 * scene.dur`
 *   - `"narr+X"` → `scene.narrAt + X`     (X after narration start; `narr-X` before)
 *
 * Throws a descriptive error naming the offending ref so callers (assemble,
 * canonical validation can point the author at the exact authored entry.
 */
export function resolveTimeRef(ref: TimeRef, scene: SceneTiming): number {
  if (typeof ref === "number") {
    if (!Number.isFinite(ref)) {
      throw new RangeError(`time ref must be finite, got ${ref}`);
    }
    return scene.start + ref;
  }

  const pct = PERCENT_RE.exec(ref);
  if (pct) {
    return scene.start + (Number(pct[1]) / 100) * scene.dur;
  }

  const narr = NARR_RE.exec(ref);
  if (narr) {
    return scene.narrAt + Number(narr[1]);
  }

  throw new SyntaxError(
    `unrecognized time ref ${JSON.stringify(ref)}: expected a number, "NN%", or "narr+X"/"narr-X"`,
  );
}

/**
 * True if a string/number is a structurally valid time ref (does not need a
 * scene). Used by canonical `check` to report bad refs before timing exists.
 */
export function isValidTimeRef(ref: unknown): ref is TimeRef {
  if (typeof ref === "number") return Number.isFinite(ref);
  if (typeof ref !== "string") return false;
  return PERCENT_RE.test(ref) || NARR_RE.test(ref);
}
