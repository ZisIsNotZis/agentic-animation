/**
 * <Episode> — the top composition, compiled entirely from the RenderModel
 * (projected from episode.build.json). Renders every shot into one stage; each
 * shot self-gates on absolute time. Audio is NOT played here: the renderer
 * adapter muxes the pre-mixed `mix.wav` with ffmpeg after the silent video
 * render (ARCHITECTURE §9, §10) so the mux honours the explicit `-t total` rule.
 */
import { AbsoluteFill } from "remotion";
import { Shot } from "./Shot";
import type { RenderModel } from "../model";

export const Episode: React.FC<{ model: RenderModel }> = ({ model }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {model.shots.map((shot) => (
        <Shot key={shot.id} shot={shot} />
      ))}
    </AbsoluteFill>
  );
};
