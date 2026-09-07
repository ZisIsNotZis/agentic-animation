/**
 * Figure geometry — the single source of truth for the drawn puppet body.
 *
 * The performance renderer draws each actor as a procedural SVG in a
 * 400x720 design box (center x=200, ground y=720). The motor simulation
 * and the renderer MUST agree on where the body and hands are, so every
 * length, offset, and pose angle lives here and both sides derive their
 * numbers from it:
 *
 * - `Actor.tsx` renders arms by rotating segments about the joints with
 *   `rotate(upper)` / `rotate(lower)` — the same angles and segment
 *   vectors exported here, so the drawn hand lands exactly where
 *   `handOffset()` says.
 * - `motor/index.ts` gates contact with `REACH.**` so force can only
 *   conduct through a genuinely touching hand.
 *
 * Changing a drawing dimension here changes the physics with it — that
 * coupling is the point (docs/WORLD_PUPPET_MOTOR.md).
 */

/** Design box: the SVG viewBox every actor view is drawn in. */
export const FIGURE_BOX = {width: 400, height: 720} as const;
/** Horizontal center of the figure in design space. */
export const FIGURE_CENTER_X = 200;
/** Ground line in design space (feet, shadow). */
export const FIGURE_GROUND_Y = 720;

/** Shoulder joint (right side; left mirrors about the center). Design px. */
export const SHOULDER = {x: 260, y: 286} as const;
/** Upper-arm segment: shoulder -> elbow (right side). */
export const UPPER_ARM = {x: 32, y: 122} as const;
/** Forearm segment: elbow -> hand (right side). */
export const FOREARM = {x: 0, y: 104} as const;
/** Hand sprite radius — the drawn hand extends ~this far past the hand joint. */
export const HAND_RADIUS = 26;

/** Torso half-width: the robe silhouette spans x 100..300 in design space. */
export const BODY_HALF_WIDTH = 100;

/** Arm pose angles in degrees, SVG rotate() convention (positive = clockwise). */
export interface ArmAngles {
  upper: number;
  lower: number;
}

/**
 * Push pose: both arm segments horizontal, hand fully extended forward.
 * UPPER_ARM points at atan2(122, 32) = 75.3deg below horizontal, so
 * upper = -75.3 straightens it; lower = -15 straightens the forearm
 * (total -90.3 ≈ horizontal). Both the renderer's rotate() transforms
 * and the motor's contact test use exactly these numbers.
 */
export const PUSH_ARM: ArmAngles = {upper: -75.3, lower: -15};

/** Rest pose: arm hanging straight down (angles 0). */
export const REST_ARM: ArmAngles = {upper: 0, lower: 0};

function rot(deg: number, v: {x: number; y: number}): {x: number; y: number} {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return {x: v.x * c - v.y * s, y: v.x * s + v.y * c};
}

/**
 * Forward kinematics of the drawn hand joint (design space, relative to
 * the figure center x and the ground y — the same convention as actor
 * anchors). `side: -1` mirrors the left arm.
 */
export function handOffset(angles: ArmAngles, side: 1 | -1 = 1): {x: number; y: number} {
  const shoulder = {x: (SHOULDER.x - FIGURE_CENTER_X) * side, y: SHOULDER.y - FIGURE_GROUND_Y};
  const upper = {x: UPPER_ARM.x * side, y: UPPER_ARM.y};
  const fore = {x: FOREARM.x * side, y: FOREARM.y};
  const elbow = rot(angles.upper, upper);
  const hand = rot(angles.upper + angles.lower, fore);
  return {x: shoulder.x + elbow.x + hand.x, y: shoulder.y + elbow.y + hand.y};
}

/** Hand joint offset at rest (the prop-holding hand position). */
export const HAND_REST = handOffset(REST_ARM);
/** Hand joint offset in the push pose (the contact point of a push). */
export const HAND_PUSH = handOffset(PUSH_ARM);
/** Full forward reach including the hand sprite (push, from center). */
export const REACH_PUSH = Math.abs(HAND_PUSH.x) + HAND_RADIUS;
