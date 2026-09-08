// Physics debug overlay (docs/WORLD_PUPPET_MOTOR.md): draws what the engine
// actually believes — the exact per-part colliders (torso, head, limbs,
// hands) transformed by the SAME forward kinematics the renderer uses, plus
// the figure box, ground line, hand anchors, reach points, and declared prop
// body boxes — onto the video, in WORLD space inside the camera transform.
// Enable with ANIM_DEBUG_PHYSICS=1 so humans and agents can see exactly where
// contact should happen. Part bounds come from the manifests that
// scripts/part-bounds.mts generates from the drawn geometry, so the overlay
// shows the drawn silhouettes, not approximations.
import React from "react";
import type {EvaluatedActor, EvaluatedProp, PerformanceFrameState} from "../../performance";
import type {WorldShape} from "@anim/core/skeleton";
import {solveActorFigure} from "./Actor";

const FIGURE = {w: 400, h: 720};
const PART_COLOR = (name: string): string =>
  name === "torso" ? "#ff3b30"
  : name === "head" ? "#ff9500"
  : name.startsWith("hand") ? "#ff2d55"
  : name.startsWith("arm") || name.startsWith("forearm") || name.startsWith("upper") ? "#32ade6"
  : "#007aff"; // legs

export const PhysicsDebugOverlay: React.FC<{state: PerformanceFrameState; enabled?: boolean}> = ({state, enabled}) => {
  if (!enabled) return null;
  const actors = state.actors.filter((actor) => actor.present);
  // SVG root: the overlay lives inside a div, so it must carry its own <svg>.
  return <svg aria-label="physics-debug-overlay" viewBox="0 0 1920 1080" width={1920} height={1080} style={{position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none"}}>
    {actors.map((actor) => <ActorDebug key={actor.id} actor={actor} />)}
    {state.props.map((prop) => <PropDebug key={prop.id} prop={prop} />)}
  </svg>;
};

const ActorDebug: React.FC<{actor: EvaluatedActor}> = ({actor}) => {
  const {x, y, scale: s, flip} = actor;
  const {solved} = solveActorFigure(actor);
  // Design space (400x720, y-down, mirrored about the div center on flip) →
  // stage space. Identical mapping to the actor div's own transform.
  const P = (wx: number, wy: number): [number, number] => [x + (flip ? FIGURE.w / 2 - wx : wx - FIGURE.w / 2) * s, y - (FIGURE.h - wy) * s];
  const hand = (name: string) => {
    const a = actor.anchors[name];
    if (!a) return null;
    return {x: x + (flip ? -a[0] : a[0]) * s, y: y + a[1] * s, label: name};
  };
  const hands = [hand("hand_r"), hand("hand_l")].filter(Boolean) as {x: number; y: number; label: string}[];
  const parts = Object.entries(solved?.parts ?? {});
  return <g>
    {/* whole figure box (the drawn div bounds, not a collider) */}
    <rect x={x - (FIGURE.w / 2) * s} y={y - FIGURE.h * s} width={FIGURE.w * s} height={FIGURE.h * s}
      fill="none" stroke="#00e5ff" strokeWidth={2} strokeDasharray="10 8" opacity={0.85} />
    {/* exact per-part colliders, FK-transformed (same solve as the renderer) */}
    {parts.map(([name, part]) => <PartShape key={name} name={name} shape={(part as {world: WorldShape}).world} toStage={P} scale={s} />)}
    {/* ground point + hand anchors */}
    <circle cx={x} cy={y} r={6} fill="#00e5ff" opacity={0.9} />
    {hands.map((h) => <g key={h.label}>
      <circle cx={h.x} cy={h.y} r={14} fill="none" stroke="#39ff6a" strokeWidth={3} />
      <circle cx={h.x} cy={h.y} r={4} fill="#39ff6a" />
      <text x={h.x + 16} y={h.y - 10} fontSize={16} fill="#39ff6a" fontFamily="monospace">{h.label}</text>
    </g>)}
    {actor.reach ? <g>
      <circle cx={actor.reach[0]} cy={actor.reach[1]} r={18} fill="none" stroke="#ff2e88" strokeWidth={3} />
      <text x={actor.reach[0] + 20} y={actor.reach[1] - 12} fontSize={16} fill="#ff2e88" fontFamily="monospace">reach{actor.contact ? " contact" : ""}</text>
    </g> : null}
    <text x={x - 30} y={y - FIGURE.h * s - 12} fontSize={20} fill="#00e5ff" fontFamily="monospace">{actor.id}{flip ? " (flip)" : ""}</text>
  </g>;
};

const PartShape: React.FC<{name: string; shape: WorldShape; toStage: (x: number, y: number) => [number, number]; scale: number}> = ({name, shape, toStage, scale}) => {
  const color = PART_COLOR(name);
  if (shape.kind === "box") {
    const [ax, ay] = toStage(shape.a[0], shape.a[1]);
    const [bx, by] = toStage(shape.b[0], shape.b[1]);
    return <rect x={Math.min(ax, bx)} y={Math.min(ay, by)} width={Math.abs(bx - ax)} height={Math.abs(by - ay)}
      fill="none" stroke={color} strokeWidth={2} opacity={0.9} />;
  }
  if (shape.kind === "circle") {
    const [cx, cy] = toStage(shape.center[0], shape.center[1]);
    return <circle cx={cx} cy={cy} r={shape.radius * scale} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />;
  }
  const [ax, ay] = toStage(shape.a[0], shape.a[1]);
  const [bx, by] = toStage(shape.b[0], shape.b[1]);
  return <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={2 * shape.radius * scale} strokeLinecap="round" opacity={0.55} />;
};

const PropDebug: React.FC<{prop: EvaluatedProp}> = ({prop}) => {
  const [w, h] = prop.size ?? [64, 64];
  // Declared drawn-body bounds (art space, y-down, bottom-center base) — the
  // real grab/contact target. No fake grab radius: the engine has none.
  const body = prop.body;
  const bx = body ? [prop.x + body[0] * prop.scale, prop.y - (h * prop.scale) + body[1] * prop.scale] : null;
  return <g>
    <rect x={prop.x - (w * prop.scale) / 2} y={prop.y - (h * prop.scale) / 2} width={w * prop.scale} height={h * prop.scale}
      fill="none" stroke="#ffd60a" strokeWidth={2} strokeDasharray="6 5" opacity={0.95} />
    {body && bx ? <rect x={bx[0]} y={bx[1]} width={(body[2] - body[0]) * prop.scale} height={(body[3] - body[1]) * prop.scale}
      fill="rgba(255,214,10,0.12)" stroke="#ffd60a" strokeWidth={2} opacity={0.95} /> : null}
    <circle cx={prop.x} cy={prop.y} r={4} fill="#ffd60a" />
    <text x={prop.x + 12} y={prop.y - (h * prop.scale) / 2 - 8} fontSize={16} fill="#ffd60a" fontFamily="monospace">{prop.id}{body ? " body" : ""}</text>
  </g>;
};

/** Screen-space frame counter (outside the camera transform). */
export const DebugFrameCounter: React.FC<{frame: number; enabled?: boolean}> = ({frame, enabled}) => {
  if (!enabled) return null;
  return <div style={{position: "absolute", top: 8, left: 8, zIndex: 90, font: "700 22px monospace", color: "#00e5ff", background: "rgba(0,0,0,.55)", padding: "2px 8px", borderRadius: 4}}>f{frame}</div>;
};
