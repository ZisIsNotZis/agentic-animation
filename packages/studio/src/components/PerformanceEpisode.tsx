import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { evaluatePerformance, performanceMetadata } from "../performance";
import type { PerformanceFrameState, PerformanceManifest } from "../performance";
import { PerformanceActor } from "./performance/Actor";
import { PerformanceProp } from "./performance/Prop";
import { PerformanceStage, sceneForFrame } from "./performance/Stage";
import { PerformanceVfx } from "./performance/Vfx";

export interface PerformanceEpisodeProps {
  manifest: PerformanceManifest;
  qaFrames?: number[];
}

export function resolvePerformanceFrame(
  renderFrame: number,
  qaFrames: number[],
  durationInFrames: number,
): number {
  const safeIndex = Number.isFinite(renderFrame) ? Math.max(0, Math.floor(renderFrame)) : 0;
  const sample = qaFrames[Math.min(safeIndex, qaFrames.length - 1)] ?? 0;
  const safeFrame = Number.isFinite(sample) ? Math.max(0, Math.floor(sample)) : 0;
  const safeDuration = Number.isFinite(durationInFrames) ? Math.max(1, Math.floor(durationInFrames)) : 1;
  return Math.min(safeFrame, safeDuration - 1);
}

/** Manifest + frame are the only acting inputs. The SVG renderer has no clock,
 * filesystem access, image dependency, or mutable animation state. */
export const PerformanceEpisode: React.FC<PerformanceEpisodeProps> = ({ manifest, qaFrames }) => {
  const frame = useCurrentFrame();
  const evaluatedFrame = qaFrames?.length
    ? resolvePerformanceFrame(frame, qaFrames, performanceMetadata(manifest).durationInFrames)
    : frame;
  return <PerformanceFrame manifest={manifest} state={evaluatePerformance(manifest, evaluatedFrame)} />;
};

export const PerformanceFrame: React.FC<{
  manifest: PerformanceManifest;
  state: PerformanceFrameState;
}> = ({ manifest, state }) => {
  const camera = state.camera;
  const scene = sceneForFrame(manifest, state.frame);
  const actors = state.actors.filter((actor) => actor.present).sort((a, b) => a.z - b.z);
  const props = [...state.props].sort((a, b) => a.z - b.z);
  const subtitle = state.subtitles.at(-1)?.text;
  const sceneVfx = state.vfx.filter((effect) => Array.isArray(effect.targetPosition));
  const backVfx = sceneVfx.filter((effect) => ["back", "behind", "background"].includes(String(effect.layer ?? effect.depth ?? "").toLowerCase()));
  const frontVfx = sceneVfx.filter((effect) => !backVfx.includes(effect));
  const stageVfx = state.vfx.filter((effect) => !sceneVfx.includes(effect));

  return (
    <AbsoluteFill
      data-performance-frame={state.frame}
      data-scene-id={scene.id}
      data-scene-theme={scene.theme}
      style={{ background: manifest.background ?? "#20191a", overflow: "hidden" }}
    >
      <div
        data-camera={`${camera.x},${camera.y},${camera.z},${camera.rotation}`}
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "center center",
          transform: `translate(${-camera.x}px, ${-camera.y}px) scale(${camera.z}) rotate(${camera.rotation}deg)`,
          willChange: "transform",
        }}
      >
        <PerformanceStage scene={scene} />
        {backVfx.map((effect) => <PerformanceVfx key={effect.id} effect={effect} />)}
        <div data-layer="props" style={{ position: "absolute", inset: 0, zIndex: 20 }}>
          {props.map((prop) => <PerformanceProp key={prop.id} prop={prop} />)}
        </div>
        <div data-layer="actors" style={{ position: "absolute", inset: 0, zIndex: 40 }}>
          {actors.map((actor) => <PerformanceActor key={actor.id} actor={actor} props={props} />)}
        </div>
        {frontVfx.map((effect) => <PerformanceVfx key={effect.id} effect={effect} />)}
      </div>
      {subtitle ? <PerformanceSubtitle text={subtitle} /> : null}
      {stageVfx.map((effect) => <PerformanceVfx key={effect.id} effect={effect} />)}
    </AbsoluteFill>
  );
};

const PerformanceSubtitle: React.FC<{ text: string }> = ({ text }) => (
  <div
    data-subtitle="voice"
    style={{
      position: "absolute",
      left: 96,
      right: 96,
      bottom: 24,
      zIndex: 300,
      color: "#fff5dc",
      fontFamily: "Arial, 'Noto Sans CJK SC', sans-serif",
      fontSize: text.length > 60 ? 34 : text.length > 38 ? 40 : 48,
      fontWeight: 900,
      lineHeight: 1.18,
      textAlign: "center",
      textShadow: "4px 4px 0 #272331, -3px -3px 0 #272331, 3px -3px 0 #272331, -3px 3px 0 #272331",
      whiteSpace: "pre-line",
    }}
  >
    {text}
  </div>
);
