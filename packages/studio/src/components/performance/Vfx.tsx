import React from "react";
import { AbsoluteFill } from "remotion";
import type { EvaluatedVfx } from "../../performance";

export const PerformanceVfx: React.FC<{ effect: EvaluatedVfx }> = ({ effect }) => {
  const p = Math.max(0, Math.min(1, effect.progress));
  const style = String(effect.style ?? effect.type).toLowerCase();
  const targetPosition = Array.isArray(effect.targetPosition) ? effect.targetPosition : undefined;
  const targetTransform = targetPosition ? `translate(${targetPosition[0]} ${targetPosition[1]})` : undefined;
  const targetData = targetPosition ? { "data-vfx-target-position": `${targetPosition[0]},${targetPosition[1]}` } : {};
  const svgProps = { ...targetData, targetTransform };
  if (effect.type === "flash") return <AbsoluteFill data-vfx-id={effect.id} style={{ background: effect.color ?? "#fff5dc", opacity: (effect.opacity ?? 1) * (1 - p) }} />;
  if (effect.type === "title" || effect.text) return <AbsoluteFill data-vfx-id={effect.id} style={{ alignItems: "center", justifyContent: "center", opacity: effect.opacity ?? 1 }}><div style={{ padding: "20px 44px", border: "10px solid #f2c14e", background: "#57243d", color: effect.color ?? "#fff5dc", fontSize: 54, fontWeight: 900, transform: `scale(${0.88 + p * 0.12}) rotate(-2deg)` }}>{effect.text ?? effect.type}</div></AbsoluteFill>;
  if (/screen-error|error|glitch/.test(style)) return <ErrorOverlay id={effect.id} progress={p} {...svgProps} />;
  if (/lighting-dim/.test(style)) return <Lighting id={effect.id} opacity={0.68 * p} />;
  if (/lighting-rise/.test(style)) return <Lighting id={effect.id} opacity={0.68 * (1 - p)} />;
  return <ImpactLines id={effect.id} progress={p} color={effect.color ?? "#f2c14e"} {...svgProps} />;
};

const Lighting: React.FC<{ id: string; opacity: number }> = ({ id, opacity }) => (
  <AbsoluteFill data-vfx-id={id} aria-label="stage lighting" style={{background: "#090818", opacity, pointerEvents: "none"}} />
);

const ImpactLines: React.FC<{ id: string; progress: number; color: string; targetTransform?: string; "data-vfx-target-position"?: string }> = ({ id, progress, color, targetTransform, ...data }) => <svg data-vfx-id={id} {...data} aria-label="manga impact" viewBox="0 0 1920 1080" width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 1 - progress * 0.65 }}><g transform={`${targetTransform ?? "translate(960 430)"} scale(${0.75 + progress * 0.45})`} stroke={color} strokeWidth="12" strokeLinecap="round" fill="none"><path d="M0-60L0-250M42-42L145-185M60 0L255 0M42 42L180 170M0 60L0 260M-42 42L-175 175M-60 0L-255 0M-42-42L-175-180" /><path d="M-34-28L-125-104M34-28L125-104M-34 28L-125 104M34 28L125 104" stroke="#d95d4f" strokeWidth="8" /></g></svg>;

const ErrorOverlay: React.FC<{ id: string; progress: number; targetTransform?: string; "data-vfx-target-position"?: string }> = ({ id, progress, targetTransform, ...data }) => <svg data-vfx-id={id} {...data} aria-label="screen error" viewBox="0 0 1920 1080" width="1920" height="1080" style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.55 + progress * 0.45 }}><g transform={`${targetTransform ?? `translate(${1160 + progress * 8} 420)`}`}><rect x="-270" y="-100" width="540" height="200" fill="#d95d4f" stroke="#fff5dc" strokeWidth="10" /><path d="M-190-38h380M-190 8h310M-190 54h180" stroke="#fff5dc" strokeWidth="14" /><text x="0" y="-120" textAnchor="middle" fill="#d95d4f" stroke="#fff5dc" strokeWidth="6" paintOrder="stroke" fontSize="50" fontWeight="900">ERROR!</text></g><path d="M0 340H1920M0 450H1920M0 560H1920" stroke="#fff5dc" strokeWidth="4" opacity="0.38" /></svg>;
