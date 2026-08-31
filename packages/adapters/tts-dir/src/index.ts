import { existsSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { execa } from "execa";
import {
  notReadyCheck,
  type AdapterRegistration,
  type Check,
  type TtsAdapter,
  type VoiceInfo,
} from "@anim/core";

const ID = "dir";

/**
 * Pre-recorded human takes. The take id is derived from the stage's output
 * filename (`raw-<sceneId>.wav` / `narr-<sceneId>.wav`), and the take is read
 * from `<episode>/voice/<sceneId>.wav` — i.e. `../voice/<id>.wav` relative to
 * the `audio/` output dir the voice stage writes into. `text` is ignored; the
 * recorded take is authoritative and used verbatim (the voice stage applies
 * only the gentle "human" filter chain, never the synthetic register shift).
 */
const adapter: TtsAdapter = {
  id: ID,

  async synthesize(req): Promise<{ path: string; durationSec: number }> {
    const id = takeId(req.outPath);
    const voiceDir = resolve(dirname(req.outPath), "..", "voice");
    const take = join(voiceDir, `${id}.wav`);
    if (!existsSync(take)) {
      throw new Error(
        `tts:dir — missing human take for "${id}": expected ${take}. ` +
          `Record it (mono WAV) and drop it in, or switch --provider.`,
      );
    }
    mkdirSync(dirname(req.outPath), { recursive: true });
    // Normalize the take to 16-bit PCM WAV at the target path (accepts any
    // sample rate / codec the human recorded; the stage resamples downstream).
    await execa("ffmpeg", ["-y", "-v", "error", "-i", take, "-c:a", "pcm_s16le", req.outPath]);
    return { path: req.outPath, durationSec: await probeDuration(req.outPath) };
  },

  async listVoices(): Promise<VoiceInfo[]> {
    // Takes are addressed by sceneId, not by a voice catalog.
    return [{ id: "take", name: "pre-recorded take", lang: "*" }];
  },

  async doctor(): Promise<Check[]> {
    const ffmpeg = await binOk("ffmpeg", ["-version"]);
    if (!ffmpeg) {
      return [
        notReadyCheck(
          `tts:${ID}`,
          "ffmpeg not found — needed to normalize human takes to WAV.",
          "brew install ffmpeg",
        ),
      ];
    }
    return [
      {
        name: `tts:${ID} ready`,
        ok: true,
        detail: "reads <episode>/voice/<sceneId>.wav takes at stage time (ffmpeg present)",
      },
    ];
  },
};

/** `.../audio/raw-opening.wav` → `opening`. Strips the stage's file prefix. */
function takeId(outPath: string): string {
  return basename(outPath).replace(/\.[^.]+$/, "").replace(/^(raw|narr)-/, "");
}

async function probeDuration(path: string): Promise<number> {
  const { stdout } = await execa("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path,
  ]);
  return Number.parseFloat(stdout.trim());
}

async function binOk(bin: string, args: string[]): Promise<boolean> {
  try {
    const r = await execa(bin, args, { reject: false });
    return r.exitCode === 0;
  } catch {
    return false;
  }
}

export default { kind: "tts", adapter } satisfies AdapterRegistration;
