/**
 * <Shot> — one storyboard shot compiled from the build. Background set (behind
 * the camera), then a camera-transformed world holding the actor puppets, then
 * screen-space fx overlays on top. The shot only paints while the absolute time
 * is within [start, end); shots are laid out sequentially by the assemble stage
 * so this gate is all the sequencing the episode needs.
 */
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Camera } from "./Camera";
import { Fx } from "./Fx";
import { Puppet } from "./Puppet";
import { Set } from "./Sets";
import type { RmShot } from "../model";

export const Shot: React.FC<{ shot: RmShot }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  if (t < shot.start || t >= shot.end) return null;

  const grade = shot.grade as { brightness?: number; contrast?: number; saturate?: number } | undefined;
  const filter = grade
    ? `brightness(${grade.brightness ?? 1}) contrast(${grade.contrast ?? 1}) saturate(${grade.saturate ?? 1})`
    : undefined;

  return (
    <AbsoluteFill style={filter ? { filter } : undefined}>
      <Set name={shot.set} opts={shot.setOpts} />
      <Camera keys={shot.camera}>
        {shot.actors.map((a) => (
          <Puppet key={a.id} actor={a} />
        ))}
      </Camera>
      {shot.fx.map((fx, i) => (
        <Fx key={`${fx.fx}-${i}`} fx={fx} />
      ))}
      <HardCaption shot={shot} t={t} />
    </AbsoluteFill>
  );
};

function HardCaption({ shot, t }: { shot: RmShot; t: number }) {
  const cue = shot.captions.find((c) => t >= c.start && t < c.end);
  // `setOpts.caption` is a shot/scene label, not a subtitle. Falling back to
  // it here made labels such as "开场：高级打工人" stay on screen between and
  // after dialogue cues. Subtitle visibility must be driven only by the
  // resolved, timed caption track.
  const text = cue?.text ?? "";
  if (!text) return null;
  return <div style={{ position: "absolute", left: 70, right: 70, bottom: 30, textAlign: "center", color: "#fff", fontSize: 58, fontWeight: 900, lineHeight: 1.2, fontFamily: "Arial, sans-serif", WebkitTextStroke: "10px #111", paintOrder: "stroke fill", textShadow: "3px 4px 0 #111", zIndex: 200 }}>{text}</div>;
}
