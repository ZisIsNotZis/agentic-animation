/**
 * `anim assemble` — resolve storyboard + timeline + library into
 * `episode.build.json`, the single input the renderer reads (ARCHITECTURE §6, §9).
 *
 * Responsibilities: resolve every storyboard time ref against the timeline via
 * the core resolver, pin library versions (absolute puppet paths), flatten
 * motion clips + procedural layers + mouth cues into per-part keyframe tracks in
 * absolute seconds, schedule seeded blinks, and embed content hashes of every
 * input so `render` can detect staleness.
 *
 * Pure Node (no React). The caller (a CLI command) supplies resolved paths, the
 * video spec, the seed, and a fixed `now` clock — this module never reads the
 * wall clock itself (determinism rule).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EpisodeBuildSchema,
  EpisodeSchema,
  MotionClipSchema,
  MouthCuesFileSchema,
  ScriptSchema,
  StoryboardSchema,
  TimelineSchema,
  createPrng,
  hashFile,
  hashJsonContent,
  isStale,
  readJson,
  resolveTimeRef,
  seedFromString,
  writeGenerated,
  type EpisodeBuild,
  type Logger,
  type MotionClip,
  type MotionRef,
  type MouthCue,
  type PartTrack,
  type ResolvedActor,
  type ResolvedCameraKey,
  type ResolvedCaption,
  type ResolvedFx,
  type ResolvedFace,
  type ResolvedMove,
  type ResolvedKey,
  type ResolvedShot,
  type Beat,
  type SceneTiming,
} from "@anim/core";

export interface AssembleOptions {
  slug: string;
  title?: string;
  /** Absolute path to `episodes/<slug>/`. */
  episodeDir: string;
  /** Absolute path to the `library/` root. */
  libraryDir: string;
  video: { width: number; height: number; fps: number };
  seed: number;
  force?: boolean;
  /** Caller-provided ISO clock stamped into `generatedBy` (determinism rule). */
  now: string;
  log?: Logger;
}

export interface AssembleResult {
  buildPath: string;
  /** True when a fresh build was (re)written; false when it was already current. */
  wrote: boolean;
  warnings: string[];
}

const DEFAULT_BLINK_EVERY = 4.0;
const BLINK_LEAD = 0.5;

/** Scene labels are not subtitles; keep only options consumed by the set. */
export function setOptionsWithoutCaption(opts: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!opts) return undefined;
  const { caption: _caption, ...setOpts } = opts;
  return Object.keys(setOpts).length > 0 ? setOpts : undefined;
}

function captionChunks(text: string): string[] {
  const parts = text.match(/[^。！？.!?]+[。！？.!?]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const part of parts) {
    if (current && (current + part).length > 42) {
      chunks.push(current.trim());
      current = part;
    } else current += part;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

/** Swap the `_l`/`_r` suffix on a standard part id (for mirrored clips). */
function mirrorPart(id: string): string {
  if (id.endsWith("_l")) return `${id.slice(0, -2)}_r`;
  if (id.endsWith("_r")) return `${id.slice(0, -2)}_l`;
  return id;
}

function motionRefName(ref: MotionRef): string {
  return typeof ref === "string" ? ref : ref.clip;
}
function motionRefSpeed(ref: MotionRef): number {
  return typeof ref === "string" ? 1 : (ref.speed ?? 1);
}
function motionRefMirror(ref: MotionRef): boolean {
  return typeof ref === "string" ? false : (ref.mirror ?? false);
}

export function assemble(opts: AssembleOptions): AssembleResult {
  const warnings: string[] = [];
  const warn = (m: string): void => {
    warnings.push(m);
    opts.log?.warn(m);
  };

  const scriptPath = join(opts.episodeDir, "script.json");
  const storyboardPath = join(opts.episodeDir, "storyboard.json");
  const timelinePath = join(opts.episodeDir, "timeline.json");
  const episodePath = join(opts.episodeDir, "episode.json");

  for (const [label, p] of [
    ["script.json", scriptPath],
    ["storyboard.json", storyboardPath],
    ["timeline.json", timelinePath],
  ] as const) {
    if (!existsSync(p)) {
      throw new Error(
        `assemble: ${label} not found at ${p}. ` +
          (label === "timeline.json"
            ? "Run 'anim voice' to generate it first."
            : `Run 'anim episode new ${opts.slug}' first.`),
      );
    }
  }

  const script = readJson(scriptPath, ScriptSchema);
  const storyboard = readJson(storyboardPath, StoryboardSchema);
  const timeline = readJson(timelinePath, TimelineSchema);
  const episode = existsSync(episodePath) ? readJson(episodePath, EpisodeSchema) : undefined;

  const title = opts.title ?? episode?.title ?? script.title;

  // Scene timing + bounds from the timeline (the single timing truth).
  const timingByScene = new Map<string, SceneTiming & { end: number; dialogue: typeof timeline.scenes[number]["dialogue"] }>(
    timeline.scenes.map((s) => [s.id, { start: s.start, narrAt: s.narrAt, dur: s.dur, end: s.end, dialogue: s.dialogue }]),
  );

  // Track every input file we read, hashed for staleness detection.
  // timeline.json is generated (carries a wall-clock generatedBy header); hash
  // its semantic content so a clock-only re-run of `anim voice` does not falsely
  // invalidate the build (determinism rule). Hand-authored inputs use a byte hash.
  const inputs: Record<string, string> = {
    "script.json": hashFile(scriptPath),
    "storyboard.json": hashFile(storyboardPath),
    "timeline.json": hashJsonContent(timelinePath),
  };
  if (episode) inputs["episode.json"] = hashFile(episodePath);
  const clipCache = new Map<string, MotionClip>();

  // Shots that share a scene split that scene's interval evenly, in order.
  const shotsByScene = new Map<string, number>();
  for (const s of storyboard.shots) shotsByScene.set(s.sceneId, (shotsByScene.get(s.sceneId) ?? 0) + 1);
  const shotIndexInScene = new Map<string, number>();

  const resolvedShots: ResolvedShot[] = storyboard.shots.map((shot) => {
    const timing = timingByScene.get(shot.sceneId);
    if (!timing) {
      throw new Error(
        `assemble: shot "${shot.id}" references scene "${shot.sceneId}" which is not in timeline.json. ` +
          `Regenerate the timeline ('anim voice') or fix storyboard.json.`,
      );
    }
    const n = shotsByScene.get(shot.sceneId) ?? 1;
    const idx = shotIndexInScene.get(shot.sceneId) ?? 0;
    shotIndexInScene.set(shot.sceneId, idx + 1);
    const slice = timing.dur / n;
    const shotStart = timing.start + idx * slice;
    const shotEnd = idx === n - 1 ? timing.end : shotStart + slice;

    const camera: ResolvedCameraKey[] = shot.camera
      .map((k) => ({
        t: resolveTimeRef(k.t, timing),
        ...(k.x !== undefined ? { x: k.x } : {}),
        ...(k.y !== undefined ? { y: k.y } : {}),
        ...(k.z !== undefined ? { z: k.z } : {}),
        ...(k.ease ? { ease: k.ease } : {}),
      }))
      .sort((a, b) => a.t - b.t);

    const stageActorIds = new Set(shot.actors.map((a) => a.id ?? a.characterId));
    const soloActor = shot.actors.length === 1 ? (shot.actors[0]!.id ?? shot.actors[0]!.characterId) : undefined;

    const fx: ResolvedFx[] = [];
    // Pose beats become one-shot clip instances placed at the beat time, keyed
    // by the actor they target (or the only actor in the shot).
    const posesByActor = new Map<string, PoseInstance[]>();
    for (const beat of shot.beats) {
      // Dialogue-linked FX use the generated line timing as their source of
      // truth. This keeps a system popup and its subtitle/audio onset locked
      // together even when TTS duration changes between voices.
      const at = resolveBeatTime(beat, timing);
      if (beat.fx) fx.push({ t: at, fx: beat.fx, ...(beat.opts ? { opts: beat.opts } : {}) });
      if (beat.actor && !stageActorIds.has(beat.actor)) {
        warn(`shot "${shot.id}": beat targets actor "${beat.actor}" not present in the shot.`);
      }
      if (beat.pose) {
        const clip = loadClip(opts.libraryDir, beat.pose, inputs, clipCache);
        if (!clip) {
          warn(`shot "${shot.id}": pose "${beat.pose}" has no clip in library/motions — skipped.`);
        } else {
          const target = beat.actor ?? soloActor;
          if (!target) {
            warn(`shot "${shot.id}": pose "${beat.pose}" has no target actor (set beat.actor) — skipped.`);
          } else {
            const arr = posesByActor.get(target) ?? [];
            arr.push({ clip, atAbs: at });
            posesByActor.set(target, arr);
          }
        }
      }
    }
    fx.sort((a, b) => a.t - b.t);
    const captions: ResolvedCaption[] = [];
    const sceneScript = script.scenes.find((s) => s.id === shot.sceneId);
    const lines = sceneScript?.dialogue ?? [];
    if (timing.dialogue.length) {
      for (const line of lines) {
        const timed = timing.dialogue.find((d) => d.id === line.id);
        if (!timed) continue;
        const start = Math.max(shotStart, timed.start);
        const end = Math.min(shotEnd, timed.start + timed.dur);
        if (end > start) {
          const chunks = captionChunks(line.tts);
          const totalChars = chunks.reduce((sum, chunk) => sum + chunk.length, 0) || 1;
          let at = start;
          for (const chunk of chunks) {
            const chunkEnd = at + (end - start) * (chunk.length / totalChars);
            captions.push({ start: round(at), end: round(chunkEnd), text: chunk });
            at = chunkEnd;
          }
        }
      }
    } else {
      const chars = lines.reduce((n, l) => n + l.tts.length, 0) || 1;
      let captionAt = timing.narrAt;
      for (const line of lines) {
        const d = timing.dur * (line.tts.length / chars);
        const start = Math.max(shotStart, captionAt);
        const end = Math.min(shotEnd, captionAt + d);
        if (end > start) captions.push({ start: round(start), end: round(end), text: line.tts });
        captionAt += d;
      }
    }

    const actors: ResolvedActor[] = shot.actors.map((actor) => {
      const stageId = actor.id ?? actor.characterId;
      const puppetPath = join(
        opts.libraryDir,
        "characters",
        actor.characterId,
        `v${actor.version}`,
        "puppet.json",
      );
      if (!existsSync(puppetPath)) {
        throw new Error(
          `assemble: character "${actor.characterId}@v${actor.version}" not found (${puppetPath}). ` +
            `Generate/approve it ('anim char ...') or fix the pinned version in storyboard.json.`,
        );
      }
      inputs[`puppet:${actor.characterId}@v${actor.version}`] = hashFile(puppetPath);

      const partTracks = flattenMotion(
        shot.id,
        actor.motion,
        opts.libraryDir,
        shotStart,
        shotEnd,
        inputs,
        clipCache,
        warn,
        posesByActor.get(stageId) ?? [],
      );
      const mouthTrack = resolveMouth(actor.speakLineIds, timing, opts.episodeDir, inputs, warn, shot.id);
      const blinkEvery = pickBlinkEvery(actor.motion, opts.libraryDir, clipCache);
      const blinkTrack = scheduleBlinks(opts.seed, stageId, shotStart, shotEnd, blinkEvery);
      const faceTrack: ResolvedFace[] = shot.beats
        .filter((beat) => beat.actor === stageId && beat.face)
        .map((beat) => ({ t: round(resolveTimeRef(beat.at, timing)), ...beat.face! }))
        .sort((a, b) => a.t - b.t);
      const moveTrack: ResolvedMove[] = shot.beats
        .filter((beat) => beat.actor === stageId && beat.move)
        .map((beat) => ({ t: round(resolveTimeRef(beat.at, timing)), to: beat.move!.to, ...(beat.move!.t1 !== undefined ? { t1: round(resolveTimeRef(beat.move!.t1, timing)) } : {}) }))
        .sort((a, b) => a.t - b.t);

      return {
        id: stageId,
        characterId: actor.characterId,
        version: actor.version,
        puppetPath,
        at: actor.at,
        scale: actor.scale,
        flip: actor.flip ?? false,
        facing: actor.facing ?? 1,
        emotion: actor.emotion ?? "neutral",
        // The episode uses one compatible placeholder rig, but actor ids are
        // stable role names. Select the generated role skin without changing
        // timeline/audio or the puppet schema.
        skin: ["lin", "senior", "elder"].includes(stageId) ? stageId : "default",
        partTracks,
        mouthTrack,
        blinkTrack,
        faceTrack,
        moveTrack,
      };
    });

    return {
      id: shot.id,
      sceneId: shot.sceneId,
      start: round(shotStart),
      end: round(shotEnd),
      set: shot.set,
      ...(setOptionsWithoutCaption(shot.setOpts) ? { setOpts: setOptionsWithoutCaption(shot.setOpts) } : {}),
      ...(shot.grade ? { grade: shot.grade } : {}),
      camera,
      actors,
      fx,
      captions,
    };
  });

  const buildPath = join(opts.episodeDir, "episode.build.json");
  if (!opts.force && !isStale(buildPath, inputs)) {
    opts.log?.info(`assemble: episode.build.json is already up to date (${resolvedShots.length} shot(s)).`);
    return { buildPath, wrote: false, warnings };
  }

  const audioPath = join(opts.episodeDir, "audio", "mix.wav");
  const captionsPath = join(opts.episodeDir, "dist", "captions.srt");
  const build: Omit<EpisodeBuild, "generatedBy"> = {
    slug: opts.slug,
    title,
    video: opts.video,
    total: timeline.total,
    seed: opts.seed,
    audioPath,
    captionsPath,
    inputs,
    shots: resolvedShots,
  };

  writeGenerated(buildPath, EpisodeBuildSchema, build, {
    stage: "assemble",
    tool: "@anim/studio",
    at: opts.now,
    inputs,
  });
  opts.log?.info(`assemble: wrote episode.build.json (${resolvedShots.length} shot(s), total ${timeline.total}s).`);
  return { buildPath, wrote: true, warnings };
}

/** Resolve a beat; system notifications must name the dialogue line they display. */
export function resolveBeatTime(
  beat: Pick<Beat, "at" | "fx" | "opts">,
  timing: SceneTiming & { dialogue: { id: string; characterId: string; start: number; dur: number }[] },
): number {
  const linkedLineId = typeof beat.opts?.lineId === "string" ? beat.opts.lineId : undefined;
  if (beat.fx === "system" && !linkedLineId) {
    throw new Error("system FX requires opts.lineId so it can align with its dialogue subtitle");
  }
  if (linkedLineId) {
    const linkedLine = timing.dialogue.find((line) => line.id === linkedLineId);
    if (!linkedLine) throw new Error(`dialogue line \"${linkedLineId}\" not found for FX`);
    return linkedLine.start;
  }
  return resolveTimeRef(beat.at, timing);
}

function loadClip(
  libraryDir: string,
  name: string,
  inputs: Record<string, string>,
  cache: Map<string, MotionClip>,
): MotionClip | undefined {
  if (cache.has(name)) return cache.get(name);
  const path = join(libraryDir, "motions", `${name}.json`);
  if (!existsSync(path)) return undefined;
  const clip = readJson(path, MotionClipSchema);
  inputs[`motion:${name}`] = hashFile(path);
  cache.set(name, clip);
  return clip;
}

function pickBlinkEvery(motion: MotionRef[], libraryDir: string, cache: Map<string, MotionClip>): number {
  for (const ref of motion) {
    const clip = cache.get(motionRefName(ref));
    if (clip?.procedural?.blinkEvery) return clip.procedural.blinkEvery;
  }
  void libraryDir;
  return DEFAULT_BLINK_EVERY;
}

interface PoseInstance {
  clip: MotionClip;
  atAbs: number;
}

/** Flatten motion clips + poses + procedural layers into per-part tracks (absolute sec). */
function flattenMotion(
  shotId: string,
  motion: MotionRef[],
  libraryDir: string,
  shotStart: number,
  shotEnd: number,
  inputs: Record<string, string>,
  cache: Map<string, MotionClip>,
  warn: (m: string) => void,
  poses: PoseInstance[],
): PartTrack[] {
  const byPart = new Map<string, ResolvedKey[]>();
  const push = (part: string, key: ResolvedKey): void => {
    const arr = byPart.get(part) ?? [];
    arr.push(key);
    byPart.set(part, arr);
  };

  // Emit one clip instance whose local time 0 maps to film time `base`.
  const emit = (clip: MotionClip, base: number, speed: number, mirror: boolean): void => {
    for (const k of clip.keys) {
      const t = round(base + k.t / speed);
      const part = mirror ? mirrorPart(k.part) : k.part;
      push(part, {
        t,
        ...(k.rot !== undefined ? { rot: mirror ? -k.rot : k.rot } : {}),
        ...(k.pos ? { pos: mirror ? [-k.pos[0], k.pos[1]] : [k.pos[0], k.pos[1]] } : {}),
        ...(k.scale !== undefined ? { scale: k.scale } : {}),
        ...(k.ease ? { ease: k.ease } : {}),
      });
    }
  };

  for (const ref of motion) {
    const name = motionRefName(ref);
    const clip = loadClip(libraryDir, name, inputs, cache);
    if (!clip) {
      warn(`shot "${shotId}": motion clip "${name}" not found in library/motions — skipped.`);
      continue;
    }
    const speed = motionRefSpeed(ref);
    const mirror = motionRefMirror(ref);
    const filmDur = clip.duration / speed;

    // Tile the clip across the shot (looping clips repeat; one-shots play once).
    const instances = clip.loop ? Math.max(1, Math.ceil((shotEnd - shotStart) / filmDur)) : 1;
    for (let i = 0; i < instances; i++) emit(clip, shotStart + i * filmDur, speed, mirror);

    // Procedural breathe/sway → flattened sine keys on `torso` (independent
    // channels from limb clip keys, so no conflict). Sampled at 6 Hz.
    const proc = clip.procedural;
    if (proc && (proc.breathe || proc.sway)) {
      const step = 1 / 6;
      const period = 4.0;
      for (let t = shotStart; t <= shotEnd + 1e-6; t += step) {
        const phase = (2 * Math.PI * (t - shotStart)) / period;
        const key: ResolvedKey = { t: round(t), ease: "linear" };
        if (proc.breathe) key.pos = [0, round(-proc.breathe * Math.sin(phase))];
        if (proc.sway) key.rot = round(proc.sway * Math.sin(phase * 0.5));
        push("torso", key);
      }
    }
  }

  // Pose beats: one-shot clip instances at their beat time.
  for (const pose of poses) emit(pose.clip, pose.atAbs, 1, false);

  const tracks: PartTrack[] = [];
  for (const [part, keys] of byPart) {
    keys.sort((a, b) => a.t - b.t);
    tracks.push({ part, keys });
  }
  return tracks;
}

/** Resolve lip-sync cues for an actor's spoken lines into absolute seconds. */
function resolveMouth(
  speakLineIds: string[],
  timing: SceneTiming & { dialogue?: { id: string; characterId: string; start: number; dur: number }[] },
  episodeDir: string,
  inputs: Record<string, string>,
  warn: (m: string) => void,
  shotId: string,
): MouthCue[] {
  const out: MouthCue[] = [];
  for (const lineId of speakLineIds) {
    const path = join(episodeDir, "cues", `${lineId}.json`);
    if (!existsSync(path)) {
      warn(`shot "${shotId}": cues for line "${lineId}" not found — run 'anim lipsync'. Mouth stays at rest.`);
      continue;
    }
    const file = readJson(path, MouthCuesFileSchema);
    // cues/*.json is generated (wall-clock header) — hash semantic content only.
    inputs[`cues:${lineId}`] = hashJsonContent(path);
    const cues = Array.isArray(file) ? file : file.cues;
    const lineTiming = timing.dialogue?.find((line) => line.id === lineId);
    const base = lineTiming?.start ?? timing.narrAt + (Array.isArray(file) ? 0 : (file.offset ?? 0));
    for (const c of cues) out.push({ start: round(base + c.start), end: round(base + c.end), viseme: c.viseme });
  }
  out.sort((a, b) => a.start - b.start);
  return out;
}

/** Seeded blink schedule across [start, end); deterministic per actor + seed. */
function scheduleBlinks(seed: number, actorId: string, start: number, end: number, every: number): number[] {
  const prng = createPrng(seedFromString(`${seed}:${actorId}:blink`));
  const out: number[] = [];
  let t = start + prng.range(BLINK_LEAD, every);
  while (t < end - 0.2) {
    out.push(round(t));
    t += prng.range(every * 0.6, every * 1.4);
  }
  return out;
}

/** Round to ms to keep the manifest stable and diff-friendly. */
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}
