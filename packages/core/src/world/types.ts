/** JSON values are the only values allowed across the world/plugin boundary. */
export type JsonValue = string | number | boolean | null | JsonValue[] | {[key: string]: JsonValue};
export type Normalized = number;
export type NormalizedPoint = [Normalized, Normalized];
export type NormalizedSize = [Normalized, Normalized];
export type NormalizedRect = {at: NormalizedPoint; size: NormalizedSize};

export type WorldNode = {
  id: string;
  kind: string;
  asset: string;
  at: NormalizedPoint;
  size: NormalizedSize;
  layer?: string;
  bind?: string;
  face?: {visible?: boolean; rig?: string; overlay?: string; smile?: number; brow?: number; eyeOpen?: number; lipsPart?: number; gaze?: NormalizedPoint};
};
export type World = {
  canvas: {
    aspect: number;
    nodes: WorldNode[];
    layers?: {id: string; order: number}[];
    constraints?: {node: string; within?: NormalizedRect; avoid?: string[]}[];
    tracks?: {node: string; move?: {at: number; to: NormalizedPoint; duration?: number}[]; gaze?: {at: number; to: NormalizedPoint; duration?: number}[]}[];
    camera?: {at: number; center?: NormalizedPoint; zoom?: number}[];
    effects?: {at: number; name: string; area?: NormalizedRect; params?: {[key: string]: JsonValue}}[];
    sound?: {at: number; asset: string; duration?: number; volume?: number; loop?: boolean}[];
    captions?: {at: number; duration: number; text: string; style?: {[key: string]: JsonValue}}[];
  };
  plugins: {[category: string]: JsonValue};
};
