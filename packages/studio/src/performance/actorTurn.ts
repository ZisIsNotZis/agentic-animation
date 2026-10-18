import type { EvaluatedActor } from "./types";

/**
 * The point a drawn actor turns about (docs/WORLD_PUPPET_MOTOR.md, slice B).
 *
 * A standing body turns about its ground point, which is the div's
 * bottom-centre; a hanging body turns about the grip its hands hold, which the
 * motor bakes as a design-space point (`grip`) beside `x`, `y` and `rotation`.
 * The renderers place the div from it, framing measures the drawn extents from
 * it, and the continuity check un-rotates about it, so the pivot the motor means
 * is the pivot everything else uses.
 */
export interface ActorTurn {
  /** Design-space box the figure is drawn in. */
  width: number;
  height: number;
  /** The pivot, in design space: the CSS transform origin. */
  origin: [number, number];
  /** The same pivot in world (stage) px. */
  pivot: [number, number];
  /** Div placement in world px that puts `origin` exactly on `pivot`. */
  left: number;
  top: number;
  rotation: number;
}

/** Legacy puppet figures are drawn in the 400x720 design box. */
const FIGURE_BOX: [number, number] = [400, 720];

export function actorTurn(
  actor: Pick<EvaluatedActor, "x" | "y" | "scale" | "rotation" | "grip" | "skeleton">,
  size?: readonly [number, number],
): ActorTurn {
  const box = size ?? (actor.skeleton?.space ? [actor.skeleton.space.width, actor.skeleton.space.height] as const : FIGURE_BOX);
  const [width, height] = box;
  const [originX, originY] = actor.grip ?? [width / 2, height];
  // The unrotated placement puts the design grip on the pivot; rotating about
  // that point keeps it there for every angle.
  const pivot: [number, number] = [
    actor.x + (originX - width / 2) * actor.scale,
    actor.y - (height - originY) * actor.scale,
  ];
  return {
    width,
    height,
    origin: [originX, originY],
    pivot,
    left: pivot[0] - originX,
    top: pivot[1] - originY,
    rotation: actor.rotation,
  };
}

/** A world point rotated about a world pivot, in the renderer's convention. */
export function rotatePoint(pivot: readonly [number, number], point: readonly [number, number], degrees: number): [number, number] {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = point[0] - pivot[0];
  const dy = point[1] - pivot[1];
  return [pivot[0] + dx * c - dy * s, pivot[1] + dx * s + dy * c];
}

/** A world point rotated about the turn's pivot, as the renderer draws it. */
export function rotateAboutPivot(turn: ActorTurn, point: readonly [number, number], degrees: number): [number, number] {
  return rotatePoint(turn.pivot, point, degrees);
}
