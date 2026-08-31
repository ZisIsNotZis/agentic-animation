/**
 * The Remotion root: registers the canonical `performance` composition (and
 * keeps the legacy component available for existing episode demos). Duration,
 * fps and dimensions are computed from the RenderModel passed as inputProps
 * (`calculateMetadata` runs in Node during selectComposition), so render
 * duration comes from the compiled performance manifest.
 */
import { Composition } from "remotion";
import { Episode } from "../components/Episode";
import { PerformanceEpisode, type PerformanceEpisodeProps } from "../components/PerformanceEpisode";
import { performanceMetadata, type PerformanceManifest } from "../performance";
import type { RenderModel } from "../model";

const EMPTY: RenderModel = {
  video: { width: 1920, height: 1080, fps: 24 },
  total: 1,
  seed: 0,
  shots: [],
};

const EMPTY_PERFORMANCE: PerformanceManifest = {
  version: 1,
  video: { width: 1920, height: 1080, fps: 24 },
  duration: 1,
  actors: [],
};

const EMPTY_PERFORMANCE_PROPS: PerformanceEpisodeProps = { manifest: EMPTY_PERFORMANCE };

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="episode"
        component={Episode}
        defaultProps={{ model: EMPTY }}
        durationInFrames={24}
        fps={24}
        width={1920}
        height={1080}
        calculateMetadata={({ props }) => {
          const m = props.model;
          const fps = m.video.fps || 24;
          return {
            durationInFrames: Math.max(1, Math.ceil(m.total * fps)),
            fps,
            width: m.video.width || 1920,
            height: m.video.height || 1080,
          };
        }}
      />
      <Composition
        id="performance"
        component={PerformanceEpisode}
        defaultProps={EMPTY_PERFORMANCE_PROPS}
        durationInFrames={24}
        fps={24}
        width={1920}
        height={1080}
        calculateMetadata={({ props }) => {
          const performanceProps = props as unknown as PerformanceEpisodeProps;
          return {
            ...performanceMetadata(performanceProps.manifest),
            ...(performanceProps.qaFrames?.length ? { durationInFrames: performanceProps.qaFrames.length } : {}),
          };
        }}
      />
    </>
  );
};
