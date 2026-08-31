import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  TimelineSchema,
  type AdapterRegistration,
  type Check,
  type MusicAdapter,
} from "@anim/core";
import { composeToWav, type SceneEvent, type TimelineLike } from "./synth";

const ID = "raga";

/**
 * Deterministic in-house raga synthesis (Karplus-Strong + additive), ported
 * from the previous engine. No samples, no models, no licensing surface — so
 * `doctor()` is always ready. Reads `timeline.json` (the timing truth) and,
 * when present, `script.json` for per-scene raga overrides + music events.
 */
const adapter: MusicAdapter = {
  id: ID,

  async compose(req): Promise<{ path: string }> {
    const tlRaw = JSON.parse(readFileSync(req.timelinePath, "utf8")) as unknown;
    const tl = TimelineSchema.parse(tlRaw);
    const timeline: TimelineLike = {
      total: tl.total,
      scenes: tl.scenes.map((s) => ({ id: s.id, start: s.start, end: s.end, mood: s.mood })),
    };

    // Per-scene raga overrides + music events live in script.json (optional).
    const sceneRagas: Record<string, string> = {};
    const sceneEvents: Record<string, SceneEvent[]> = {};
    if (existsSync(req.scriptPath)) {
      try {
        const sj = JSON.parse(readFileSync(req.scriptPath, "utf8")) as {
          music?: { raga?: string; events?: Record<string, SceneEvent[]> };
          scenes?: { id: string; raga?: string }[];
        };
        for (const s of sj.scenes ?? []) if (s.raga) sceneRagas[s.id] = s.raga;
        for (const [id, evs] of Object.entries(sj.music?.events ?? {})) sceneEvents[id] = evs;
      } catch {
        /* script.json is optional for music — ignore parse issues here */
      }
    }

    mkdirSync(dirname(req.outPath), { recursive: true });
    composeToWav(timeline, req.outPath, {
      seed: req.seed,
      sceneRagas,
      sceneEvents,
      warn: (m) => process.stderr.write(`[music:raga] ${m}\n`),
    });
    return { path: req.outPath };
  },

  async doctor(): Promise<Check[]> {
    return [
      {
        name: "synthesis ready",
        ok: true,
        detail: "pure in-house synthesis — no binaries, models, or network needed",
      },
    ];
  },
};

export default { kind: "music", adapter } satisfies AdapterRegistration;
