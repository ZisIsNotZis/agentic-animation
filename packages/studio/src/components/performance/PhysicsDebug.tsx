// Physics debug overlay (docs/WORLD_PUPPET_MOTOR.md): draws what the engine
// actually believes — figure boxes, collider silhouettes, hand anchors, reach
// points, prop boxes, and grab radii — onto the video, in WORLD space inside
// the camera transform. Enable with ANIM_DEBUG_PHYSICS=1 so humans and agents
// can see exactly where contact should happen.
import React from "react";
import type {EvaluatedActor, EvaluatedProp, PerformanceFrameState} from "../../performance";
import {GRAB_RADIUS} from "../../performance/evaluate";

const DEBUG_GRAB_RADIUS = GRAB_RADIUS;

const FIGURE = {w: 400, h: 720};
const TORSO = {half: 100, top: 512, bottom: 242}; // design-px above ground
const HEAD = {r: 94, cy: 182}; // design

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
  const hand = (name: string) => {
    const a = actor.anchors[name];
    if (!a) return null;
    return {x: x + (flip ? -a[0] : a[0]) * s, y: y + a[1] * s, label: name};
  };
  const hands = [hand("hand_r"), hand("hand_l")].filter(Boolean) as {x: number; y: number; label: string}[];
  return <g>
    {/* whole figure box */}
    <rect x={x - (FIGURE.w / 2) * s} y={y - FIGURE.h * s} width={FIGURE.w * s} height={FIGURE.h * s}
      fill="none" stroke="#00e5ff" strokeWidth={2} strokeDasharray="10 8" opacity={0.85} />
    {/* collider torso silhouette + head */}
    <rect x={x - TORSO.half * s} y={y - TORSO.top * s} width={2 * TORSO.half * s} height={(TORSO.top - TORSO.bottom) * s}
      fill="rgba(255,120,0,0.10)" stroke="#ff7b00" strokeWidth={2} opacity={0.9} />
    <circle cx={x} cy={y - (FIGURE.h - HEAD.cy) * s} r={HEAD.r * s} fill="none" stroke="#ff7b00" strokeWidth={2} opacity={0.7} />
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

const PropDebug: React.FC<{prop: EvaluatedProp}> = ({prop}) => {
  const [w, h] = prop.size ?? [64, 64];
  return <g>
    <rect x={prop.x - (w * prop.scale) / 2} y={prop.y - (h * prop.scale) / 2} width={w * prop.scale} height={h * prop.scale}
      fill="none" stroke="#ffd60a" strokeWidth={2} strokeDasharray="6 5" opacity={0.95} />
    <circle cx={prop.x} cy={prop.y} r={4} fill="#ffd60a" />
    <circle cx={prop.x} cy={prop.y} r={DEBUG_GRAB_RADIUS} fill="none" stroke="#ffd60a" strokeWidth={1.5} strokeDasharray="3 7" opacity={0.4} />
    <text x={prop.x + 12} y={prop.y - (h * prop.scale) / 2 - 8} fontSize={16} fill="#ffd60a" fontFamily="monospace">{prop.id}</text>
  </g>;
};

/** Screen-space frame counter (outside the camera transform). */
export const DebugFrameCounter: React.FC<{frame: number; enabled?: boolean}> = ({frame, enabled}) => {
  if (!enabled) return null;
  return <div style={{position: "absolute", top: 8, left: 8, zIndex: 90, font: "700 22px monospace", color: "#00e5ff", background: "rgba(0,0,0,.55)", padding: "2px 8px", borderRadius: 4}}>f{frame}</div>;
};
