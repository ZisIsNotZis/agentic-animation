/**
 * The RenderModel — the single serializable object handed to the Remotion
 * compositions as `inputProps`. It is a *self-contained* projection of
 * `episode.build.json`: every image is inlined as a `data:` URI so the render
 * runs in headless Chromium with no filesystem or network access (keeps the
 * render a pure function of its props — ARCHITECTURE §9).
 *
 * `buildRenderModel` is pure Node (fs + base64, no React) so it is safe to
 * import from the renderer adapter, which is typechecked by the root tsconfig.
 * The React components in `src/components` consume this shape at frame time.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";
import {
  PuppetSchema,
  VISEMES,
  readJson,
  type EpisodeBuild,
  type Puppet,
  type Viseme,
  type ResolvedCaption,
  type ResolvedFace,
  type ResolvedMove,
} from "@anim/core";
import type { Ease } from "./lib/interpolate";
import { setOptionsWithoutCaption } from "./stages/assemble";
import type { PerformanceManifest } from "./performance";
export type { PerformanceManifest } from "./performance";

/** Input accepted by the Remotion root: legacy build projection or the new compiled IR. */
export type StudioCompositionInput =
  | { model: RenderModel }
  | { manifest: PerformanceManifest };

export interface RmVideo {
  width: number;
  height: number;
  fps: number;
}

/** A resolved transform keyframe in absolute seconds from film start. */
export interface RmKey {
  t: number;
  rot?: number;
  pos?: [number, number];
  scale?: number;
  ease?: Ease;
}

export interface RmPartTrack {
  part: string;
  keys: RmKey[];
}

/**
 * A puppet part sprite. In the `sharedFrame` model this is a full design-canvas
 * image placed by matrix (`size` == designSize, `norm`/`attach` unused). In the
 * `nativeAttach` model it is a trimmed native-size image (`size` = native px)
 * whose part-local `pivot` is hooked onto the parent's `attach` point, with
 * `norm` normalizing proportions (ARCHITECTURE §8.2).
 */
export interface RmSpritePart {
  id: string;
  parent: string | null;
  pivot: [number, number];
  z: number;
  attach?: [number, number];
  /** Proportion normalization scale [sx, sy] (nativeAttach). */
  norm: [number, number];
  /** Native pixel size [w, h] of the part image (nativeAttach draws at this). */
  size: [number, number];
  /** data: URI of the part image. */
  src: string;
}

export interface RmMouth {
  /** Part the mouth overlay rides on (usually `head`). */
  anchor: string;
  z: number;
  shapes: Record<Viseme, string>;
  /** Anchor point in the head's own-image space (nativeAttach). */
  at?: [number, number];
  /** Native pixel size [w, h] of the viseme images (nativeAttach). */
  size?: [number, number];
}

export interface RmEyes {
  anchor: string;
  z: number;
  /** Blink frames, open → closed. */
  frames: string[];
  /** Native pixel size [w, h] of the eye overlay images (nativeAttach). */
  size?: [number, number];
}

export interface RmPuppet {
  id: string;
  /** Which runtime model — see @anim/core RigModel. */
  rig: "sharedFrame" | "nativeAttach";
  designSize: [number, number];
  parts: RmSpritePart[];
  mouth: RmMouth;
  eyes?: RmEyes;
}

export interface RmMouthCue {
  start: number;
  end: number;
  viseme: Viseme;
}

export interface RmActor {
  id: string;
  puppet: RmPuppet;
  at: [number, number];
  scale: number;
  flip: boolean;
  facing: 1 | -1;
  emotion: string;
  partTracks: RmPartTrack[];
  mouthTrack: RmMouthCue[];
  /** Absolute blink start times (seconds); a blink closes the eyes briefly. */
  blinkTrack: number[];
  faceTrack: ResolvedFace[];
  moveTrack: ResolvedMove[];
}

export interface RmCameraKey {
  t: number;
  x?: number;
  y?: number;
  z?: number;
  ease?: Ease;
}

export interface RmFx {
  t: number;
  fx: string;
  opts?: Record<string, unknown>;
}

export interface RmShot {
  id: string;
  start: number;
  end: number;
  set: string;
  setOpts?: Record<string, unknown>;
  grade?: Record<string, unknown>;
  camera: RmCameraKey[];
  actors: RmActor[];
  fx: RmFx[];
  captions: ResolvedCaption[];
}

export interface RenderModel {
  video: RmVideo;
  total: number;
  seed: number;
  shots: RmShot[];
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** Read an image file and return a `data:` URI, with an actionable error. */
function dataUri(path: string, whatFor: string): string {
  return loadImage(path, whatFor).uri;
}

/** Read an image once: its `data:` URI plus native pixel size (PNG IHDR, or null). */
function loadImage(path: string, whatFor: string): { uri: string; size: [number, number] | null } {
  if (!existsSync(path)) {
    throw new Error(
      `render: missing asset for ${whatFor}: ${path}. ` +
        `Re-run the character/library stage that produces it, then 'anim assemble'.`,
    );
  }
  const ext = extname(path).toLowerCase();
  const mime = MIME[ext];
  if (!mime) {
    throw new Error(`render: unsupported image type for ${whatFor}: ${path} (need png/jpg/webp/gif).`);
  }
  const buf = readFileSync(path);
  return { uri: `data:${mime};base64,${buf.toString("base64")}`, size: pngSize(buf, ext) };
}

/**
 * Native [width, height] from a PNG's IHDR (bytes 16..24), no decode — or `null`
 * for non-PNG. The nativeAttach model needs each trimmed part drawn at its own
 * pixel size; parts are always PNGs (char cut / the generators emit PNG), and
 * inlinePuppet turns a `null` into an actionable error only where it matters.
 */
function pngSize(buf: Buffer, ext: string): [number, number] | null {
  if (ext !== ".png" || buf.length < 24 || buf.readUInt32BE(12) !== 0x49484452) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

/** Resolve a puppet-relative image path against the puppet.json directory. */
function partImage(puppetDir: string, skin: string, puppet: Puppet, partId: string, rel: string): string {
  const swap = skin !== "default" ? puppet.skins?.[skin]?.[partId] : undefined;
  return resolve(puppetDir, swap ?? rel);
}

function inlinePuppet(puppetPath: string, skin: string): RmPuppet {
  const puppet = readJson(puppetPath, PuppetSchema);
  const dir = dirname(puppetPath);
  const native = puppet.rig === "nativeAttach";

  const parts: RmSpritePart[] = puppet.parts.map((p) => {
    const whatFor = `part "${p.id}" of ${puppet.id}`;
    const { uri, size } = loadImage(partImage(dir, skin, puppet, p.id, p.image), whatFor);
    if (native && !size) {
      throw new Error(`render: nativeAttach part ${whatFor} must be a PNG (needs its native pixel size).`);
    }
    return {
      id: p.id,
      parent: p.parent,
      pivot: p.pivot,
      z: p.z,
      ...(p.attach ? { attach: p.attach } : {}),
      norm: p.norm,
      size: size ?? puppet.designSize,
      src: uri,
    };
  });

  // Mouth visemes. In nativeAttach they are trimmed images centred on the head's
  // own-space `mouth.at`; record one native size (visemes are uniform per rig).
  let mouthSize: [number, number] | undefined;
  const shapes = Object.fromEntries(
    VISEMES.map((v) => {
      const { uri, size } = loadImage(resolve(dir, puppet.mouth.shapes[v]), `viseme ${v} of ${puppet.id}`);
      if (size) mouthSize = size;
      return [v, uri];
    }),
  ) as Record<Viseme, string>;

  const anchorZ = Math.max(...puppet.parts.map((p) => p.z));
  const rm: RmPuppet = {
    id: puppet.id,
    rig: puppet.rig,
    designSize: puppet.designSize,
    parts,
    mouth: {
      anchor: puppet.mouth.anchor,
      z: anchorZ + 1,
      shapes,
      ...(native ? { at: puppet.mouth.at, ...(mouthSize ? { size: mouthSize } : {}) } : {}),
    },
  };
  if (puppet.eyes && puppet.eyes.blink.length) {
    let eyeSize: [number, number] | undefined;
    const frames = puppet.eyes.blink.map((f, i) => {
      const { uri, size } = loadImage(resolve(dir, f), `eye frame ${i} of ${puppet.id}`);
      if (size) eyeSize = size;
      return uri;
    });
    rm.eyes = {
      anchor: puppet.mouth.anchor,
      z: anchorZ + 2,
      frames,
      ...(native && eyeSize ? { size: eyeSize } : {}),
    };
  }
  return rm;
}

/**
 * Project a validated `episode.build.json` into a fully self-contained
 * RenderModel: puppets loaded, skins applied, every image inlined as a data URI.
 * Deterministic and side-effect free apart from reads.
 */
export function buildRenderModel(build: EpisodeBuild): RenderModel {
  return {
    video: build.video,
    total: build.total,
    seed: build.seed,
    shots: build.shots.map((shot) => ({
      id: shot.id,
      start: shot.start,
      end: shot.end,
      set: shot.set,
      ...(setOptionsWithoutCaption(shot.setOpts) ? { setOpts: setOptionsWithoutCaption(shot.setOpts) } : {}),
      ...(shot.grade ? { grade: shot.grade } : {}),
      camera: shot.camera.map((k) => ({ t: k.t, x: k.x, y: k.y, z: k.z, ease: k.ease })),
      fx: shot.fx.map((f) => ({ t: f.t, fx: f.fx, ...(f.opts ? { opts: f.opts } : {}) })),
      captions: shot.captions.map((c) => ({ ...c })),
      actors: shot.actors.map((a): RmActor => ({
        id: a.id,
        puppet: inlinePuppet(a.puppetPath, a.skin),
        at: a.at,
        scale: a.scale,
        flip: a.flip,
        facing: a.facing,
        emotion: a.emotion,
        partTracks: a.partTracks.map((t) => ({ part: t.part, keys: t.keys.map(cloneKey) })),
        mouthTrack: a.mouthTrack.map((c) => ({ start: c.start, end: c.end, viseme: c.viseme })),
        blinkTrack: [...a.blinkTrack],
        faceTrack: (a.faceTrack ?? []).map((f) => ({ ...f, ...(f.gaze ? { gaze: [f.gaze[0], f.gaze[1]] as [number, number] } : {}) })),
        moveTrack: (a.moveTrack ?? []).map((m) => ({ ...m, to: [m.to[0], m.to[1]] as [number, number] })),
      })),
    })),
  };
}

function cloneKey(k: { t: number; rot?: number; pos?: [number, number]; scale?: number; ease?: Ease }): RmKey {
  return {
    t: k.t,
    ...(k.rot !== undefined ? { rot: k.rot } : {}),
    ...(k.pos ? { pos: [k.pos[0], k.pos[1]] as [number, number] } : {}),
    ...(k.scale !== undefined ? { scale: k.scale } : {}),
    ...(k.ease ? { ease: k.ease } : {}),
  };
}
