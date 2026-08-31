import type { CompiledEpisode, CompiledScene, PerformanceEvent, PerformanceTrack } from "@anim/core";
import type { Ease } from "../lib/interpolate";

export interface PerformanceVideo {
  width: number;
  height: number;
  fps: number;
}

export interface PerformancePlacement {
  at?: [number, number];
  position?: [number, number];
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  flip?: boolean;
}

export interface SemanticPlacement {
  mark: string;
  offset?: [number, number];
  scale?: number;
  rotation?: number;
  flip?: boolean;
}

export type PerformancePlacementValue = PerformancePlacement | [number, number];

export interface PerformanceExpression {
  name?: string;
  smile?: number;
  brow?: number;
  eyeOpen?: number;
  lipsPart?: number;
  gaze?: [number, number];
  [key: string]: unknown;
}

export interface PerformanceExpressionKey extends PerformanceExpression {
  frame?: number;
  t?: number;
  startFrame?: number;
  value?: PerformanceExpression;
  expression?: PerformanceExpression | string;
  endFrame?: number;
  end?: number;
  durationFrames?: number;
  duration?: number;
  ease?: Ease;
  [key: string]: unknown;
}

export interface PerformanceGesture {
  name?: string;
  phase?: string;
  [key: string]: unknown;
}

export interface PerformanceGestureKey {
  frame?: number;
  t?: number;
  at?: number;
  startFrame?: number;
  value?: PerformanceGesture;
  gesture?: PerformanceGesture | string;
  name?: string;
  endFrame?: number;
  end?: number;
  durationFrames?: number;
  duration?: number;
  [key: string]: unknown;
}

export type PerformanceTrackKind =
  | "bone" | "transform" | "expression" | "gaze" | "movement" | "binding"
  | "object" | "camera" | "vfx" | "sfx" | "lifecycle";

export interface PerformanceTrackEvent {
  frame?: number;
  t?: number;
  at?: number;
  endFrame?: number;
  end?: number;
  durationFrames?: number;
  duration?: number;
  ease?: Ease;
  [key: string]: unknown;
}

export interface PerformanceGenericTrack {
  kind: PerformanceTrackKind;
  subject?: string;
  target?: string;
  events: PerformanceTrackEvent[];
}

export interface PerformancePositionKey {
  frame?: number;
  t?: number;
  at?: [number, number];
  x?: number;
  y?: number;
  to?: [number, number];
  scale?: number;
  rotation?: number;
  flip?: boolean;
  ease?: Ease;
}

export interface PerformancePlacementKey {
  frame?: number;
  t?: number;
  placement: PerformancePlacement | SemanticPlacement | string;
  ease?: Ease;
  at?: [number, number];
  x?: number;
  y?: number;
}

export interface PerformanceVisual {
  src?: string;
  width?: number;
  height?: number;
  size?: [number, number];
  [key: string]: unknown;
}

export interface PerformanceActor {
  id: string;
  placement?: PerformancePlacement | SemanticPlacement | string;
  semanticPlacement?: PerformancePlacement | SemanticPlacement | string;
  at?: [number, number];
  place?: PerformancePlacement | SemanticPlacement | string;
  anchors?: Record<string, [number, number]>;
  sockets?: Record<string, [number, number]>;
  expression?: PerformanceExpression;
  expressionTrack?: PerformanceExpressionKey[];
  expressions?: PerformanceExpressionKey[];
  gestureTrack?: PerformanceGestureKey[];
  gestures?: PerformanceGestureKey[];
  positionTrack?: PerformancePositionKey[];
  placementTrack?: PerformancePlacementKey[];
  constraints?: PerformanceConstraint[];
  z?: number;
  present?: boolean;
  pose?: string;
  presentTrack?: PerformancePresenceKey[];
  poseTrack?: PerformanceStateKey[];
  asset?: string;
  src?: string;
  visual?: PerformanceVisual;
  width?: number;
  height?: number;
  tracks?: PerformanceGenericTrack[];
}

export interface PerformancePresenceKey {
  frame?: number;
  t?: number;
  present: boolean;
}

export interface PerformanceStateKey {
  frame?: number;
  t?: number;
  value: string;
}

export interface PerformanceConstraint {
  type?: string;
  actor?: string;
  actorId?: string;
  holder?: string;
  prop?: string;
  object?: string;
  hand?: string;
  socket?: string;
  offset?: [number, number];
  startFrame?: number;
  endFrame?: number;
  start?: number;
  end?: number;
  durationFrames?: number;
  duration?: number;
  continuous?: boolean;
  [key: string]: unknown;
}

export interface PerformancePropBinding {
  actor?: string;
  actorId?: string;
  holder?: string;
  hand?: string;
  socket?: string;
  prop?: string;
  object?: string;
  offset?: [number, number];
  startFrame?: number;
  endFrame?: number;
  start?: number;
  end?: number;
  durationFrames?: number;
  duration?: number;
}

export interface PerformanceProp {
  id: string;
  label?: string;
  at?: [number, number];
  position?: [number, number];
  placement?: PerformancePlacement | SemanticPlacement | string;
  size?: [number, number];
  width?: number;
  height?: number;
  rotation?: number;
  scale?: number;
  z?: number;
  boundTo?: PerformancePropBinding;
  binding?: PerformancePropBinding;
  constraint?: PerformancePropBinding;
  bind?: PerformancePropBinding;
  src?: string;
  asset?: string;
  positionTrack?: PerformancePositionKey[];
  placementTrack?: PerformancePlacementKey[];
  tracks?: PerformanceGenericTrack[];
}

export interface PerformanceCameraKey {
  frame?: number;
  t?: number;
  at?: number;
  x?: number;
  y?: number;
  z?: number;
  rotation?: number;
  ease?: Ease;
}

export interface PerformanceCameraTrack {
  keys: PerformanceCameraKey[];
}

export interface PerformanceSubtitle {
  id: string;
  startFrame?: number;
  endFrame?: number;
  start?: number;
  end?: number;
  durationFrames?: number;
  duration?: number;
  text: string;
}

export interface PerformanceVfx {
  id: string;
  type: string;
  startFrame?: number;
  endFrame?: number;
  start?: number;
  at?: number;
  end?: number;
  durationFrames?: number;
  duration?: number;
  color?: string;
  opacity?: number;
  text?: string;
  [key: string]: unknown;
}

export interface PerformanceAsset {
  id?: string;
  src?: string;
  path?: string;
  width?: number;
  height?: number;
  size?: [number, number];
  [key: string]: unknown;
}

/** Renderer-facing manifest. Its timebase applies to every timed field. */
export interface PerformanceManifestData {
  version?: number;
  video?: PerformanceVideo;
  duration?: number;
  durationInFrames?: number;
  total?: number;
  totalDuration?: number;
  timebase?: "frames" | "seconds";
  placements?: Record<string, PerformancePlacementValue>;
  marks?: Record<string, PerformancePlacementValue>;
  camera?: PerformanceCameraKey[] | PerformanceCameraTrack;
  cameraTrack?: PerformanceCameraKey[] | PerformanceCameraTrack;
  actors?: PerformanceActor[];
  props?: PerformanceProp[];
  objects?: PerformanceProp[];
  subtitles?: PerformanceSubtitle[];
  subtitleTrack?: PerformanceSubtitle[];
  captions?: PerformanceSubtitle[];
  vfx?: PerformanceVfx[];
  effects?: PerformanceVfx[];
  constraints?: PerformanceConstraint[];
  propConstraints?: PerformanceConstraint[];
  bindingConstraints?: PerformanceConstraint[];
  background?: string;
  assets?: unknown;
  /** Optional renderer-neutral scene/track fields accepted from compiled output. */
  episode?: unknown;
  sceneTrack?: CompiledScene[];
  performanceTracks?: PerformanceTrack[];
  tracks?: PerformanceGenericTrack[];
}

/**
 * Both the direct renderer shape and the core compiler's actual output are
 * valid inputs. Compiler fields stay optional because the small direct shape
 * is useful for composition tests and previews.
 */
export type PerformanceManifest = PerformanceManifestData;

export interface NormalizedPerformanceManifest extends PerformanceManifestData {
  version: number;
  video: PerformanceVideo;
  timebase: "frames";
  durationInFrames: number;
  actors: PerformanceActor[];
  props: PerformanceProp[];
  subtitles: PerformanceSubtitle[];
  vfx: PerformanceVfx[];
  constraints: PerformanceConstraint[];
  camera?: PerformanceCameraKey[];
}

export interface EvaluatedExpression extends PerformanceExpression {
  name: string;
  smile: number;
  brow: number;
  eyeOpen: number;
  lipsPart: number;
  gaze: [number, number];
}

export interface EvaluatedGesture extends PerformanceGesture {
  progress: number;
}

export interface EvaluatedActor {
  id: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flip: boolean;
  z: number;
  present: boolean;
  pose?: string;
  expression: EvaluatedExpression;
  gesture?: EvaluatedGesture;
  anchors: Record<string, [number, number]>;
  src?: string;
  width?: number;
  height?: number;
  /** All authored procedure channels, retained for renderer-neutral consumers. */
  tracks: EvaluatedTrack[];
}

export interface EvaluatedTrack extends PerformanceGenericTrack {
  events: EvaluatedTrackEvent[];
}

export interface EvaluatedTrackEvent extends PerformanceTrackEvent {
  progress: number;
  active: boolean;
}

export interface EvaluatedProp {
  id: string;
  label?: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  z: number;
  size: [number, number];
  src?: string;
  tracks: EvaluatedTrack[];
}

export interface EvaluatedCamera {
  x: number;
  y: number;
  z: number;
  rotation: number;
}

export interface EvaluatedVfx extends PerformanceVfx {
  progress: number;
}

export interface PerformanceFrameState {
  frame: number;
  camera: EvaluatedCamera;
  actors: EvaluatedActor[];
  props: EvaluatedProp[];
  subtitles: PerformanceSubtitle[];
  vfx: EvaluatedVfx[];
  tracks: EvaluatedTrack[];
}

export type { CompiledEpisode, CompiledScene, PerformanceEvent, PerformanceTrack };
