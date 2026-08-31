/**
 * <Camera> — an animated transform on a world container (ARCHITECTURE §9):
 * pan (x, y) + zoom (z) interpolated from the shot's camera keyframes with
 * easing. Children live in stage space (1920×1080); the camera moves the whole
 * world beneath the frame. Pure function of the current frame.
 */
import { useCurrentFrame, useVideoConfig } from "remotion";
import { sampleChannel, type Keyframe } from "../lib/interpolate";
import type { RmCameraKey } from "../model";

export const Camera: React.FC<{ keys: RmCameraKey[]; children: React.ReactNode }> = ({ keys, children }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const k = keys as (RmCameraKey & Keyframe)[];
  const x = sampleChannel(k, t, (c) => c.x, 0);
  const y = sampleChannel(k, t, (c) => c.y, 0);
  const z = sampleChannel(k, t, (c) => c.z, 1);

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        transformOrigin: "center center",
        transform: `scale(${z}) translate(${-x}px, ${-y}px)`,
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
};
