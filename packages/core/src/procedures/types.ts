import type {ProcedureResolution, ProcedureResolveContext} from "../compiler/index";

export type ProcedureEase = "linear" | "in" | "out" | "io" | "back";
/** Closed, renderer-neutral recipe vocabulary. */
export type ProcedureTrackKind =
  | "bone"
  | "transform"
  | "expression"
  | "gaze"
  | "movement"
  | "binding"
  | "object"
  | "camera"
  | "vfx"
  | "sfx"
  | "music"
  | "lifecycle";

/** Kept for consumers of the original authored intent shape. */
export type ProcedureChannel = "body" | "face" | "gaze" | "camera" | "vfx" | "sfx" | "music";

export interface ProcedureRecipeEvent {
  /** Seconds from the procedure start. */
  at: number;
  duration?: number;
  end?: number;
  ease?: ProcedureEase;
  value?: unknown;
  [key: string]: unknown;
}

export interface ProcedureRecipeTrack {
  kind: ProcedureTrackKind;
  target?: string;
  events: readonly ProcedureRecipeEvent[];
}

export interface ProcedureRecipe {
  tracks: readonly ProcedureRecipeTrack[];
}

export interface ProcedurePhase {
  id: string;
  start: number;
  end: number;
  ease: ProcedureEase;
  intent: string;
}

export interface BodyIntent {
  at: number;
  phase: string;
  action: string;
  parts: readonly string[];
  intensity?: number;
  target?: string;
}

export interface ExpressionIntent {
  at: number;
  phase: string;
  emotion: string;
  intensity: number;
  brow: string;
  eyes: string;
  mouth: string;
  smile?: number;
  browValue?: number;
  eyeOpen?: number;
  lipsPart?: number;
  name?: string;
}

export interface GazeIntent {
  at: number;
  phase: string;
  target: string;
  lead: "eyes" | "head" | "whole-body";
  hold?: number;
}

export interface CameraIntent {
  at: number;
  phase: string;
  operation: "push" | "pull" | "hold";
  target?: string;
  zoom: number;
  ease: ProcedureEase;
}

export interface VfxIntent {
  at: number;
  phase: string;
  style: string;
  target?: string;
  intensity: number;
  duration: number;
}

export interface AudioIntent {
  at: number;
  phase: string;
  cue: string;
  kind: "sfx" | "music";
  gain: number;
  duration: number;
  loop?: boolean;
}

export interface ProcedureTrack {
  kind: ProcedureTrackKind;
  target?: string;
  events: readonly ProcedureRecipeEvent[];
}

export interface ProcedurePerformance {
  kind: "procedure";
  id: string;
  durationSec: number;
  params: Readonly<Record<string, string>>;
  phases: readonly ProcedurePhase[];
  body: readonly BodyIntent[];
  expression: readonly ExpressionIntent[];
  gaze: readonly GazeIntent[];
  camera: readonly CameraIntent[];
  vfx: readonly VfxIntent[];
  audio: readonly AudioIntent[];
  recipe: ProcedureRecipe;
}

export type ProcedureResolutionWithPerformance = ProcedureResolution & {
  performance: ProcedurePerformance;
  tracks: readonly ProcedureTrack[];
};

export type ProcedureResolverContext = ProcedureResolveContext;
