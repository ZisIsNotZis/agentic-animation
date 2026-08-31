import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execa } from "execa";
import {
  notReadyCheck,
  type AdapterRegistration,
  type Check,
  type TtsAdapter,
  type VoiceInfo,
} from "@anim/core";

const ID = "say";

/**
 * macOS `say` → WAV. DEV / SMOKE ONLY — `say` output is not Apache/MIT-licensed
 * and must never ship in monetized video (DECISIONS.md rule 4). Determinism is
 * best-effort: fine for the placeholder smoke loop, not for release.
 */
const adapter: TtsAdapter = {
  id: ID,

  async synthesize(req): Promise<{ path: string; durationSec: number }> {
    if (!req.text.trim()) throw new Error("tts:say — empty text");
    mkdirSync(dirname(req.outPath), { recursive: true });
    // `say` writes a real WAV with --file-format=WAVE; 22.05 kHz mono 16-bit
    // matches what the voice stage's storyteller filter chain expects.
    const base = ["-o", req.outPath, "--file-format=WAVE", "--data-format=LEI16@22050"];
    // Try the requested voice; fall back to the system default if `say` rejects
    // it (config voices like "af_heart" are Kokoro ids, unknown to `say`).
    let ok = false;
    if (req.voice) {
      const r = await execa("say", ["-v", req.voice, ...base, req.text], { reject: false });
      ok = r.exitCode === 0;
    }
    if (!ok) {
      const r = await execa("say", [...base, req.text], { reject: false });
      if (r.exitCode !== 0) {
        throw new Error(`tts:say — \`say\` failed: ${r.stderr || r.stdout || `exit ${r.exitCode}`}`);
      }
    }
    return { path: req.outPath, durationSec: await probeDuration(req.outPath) };
  },

  async listVoices(lang: string): Promise<VoiceInfo[]> {
    const { stdout } = await execa("say", ["-v", "?"], { reject: false });
    const voices: VoiceInfo[] = [];
    for (const line of stdout.split("\n")) {
      // "Alex                en_US    # Most people recognize me by my voice."
      const m = line.match(/^(.+?)\s{2,}([a-z]{2}(?:[_-][A-Za-z]+)?)\s+#/);
      if (!m) continue;
      const voiceLang = m[2]!;
      if (lang && !voiceLang.toLowerCase().startsWith(lang.toLowerCase())) continue;
      voices.push({ id: m[1]!.trim(), name: m[1]!.trim(), lang: voiceLang });
    }
    return voices;
  },

  async doctor(): Promise<Check[]> {
    const checks: Check[] = [];
    if (process.platform !== "darwin") {
      checks.push(
        notReadyCheck(
          `tts:${ID}`,
          `\`say\` is macOS-only (platform: ${process.platform}).`,
          "Use tts:kokoro or tts:dir on non-macOS hosts. `say` is a dev/smoke fallback only.",
        ),
      );
      return checks;
    }
    const say = await binOk("say", ["-v", "?"]);
    checks.push({
      name: `tts:${ID} \`say\` present`,
      ok: say,
      detail: say ? "macOS `say` available (dev/smoke only — never ships)" : "`say` not found",
      ...(say ? {} : { fix: "`say` ships with macOS; ensure /usr/bin is on PATH." }),
    });
    const ffprobe = await binOk("ffprobe", ["-version"]);
    checks.push({
      name: `tts:${ID} ffprobe present`,
      ok: ffprobe,
      detail: ffprobe ? "ffprobe available for duration probing" : "ffprobe not found",
      ...(ffprobe ? {} : { fix: "brew install ffmpeg" }),
    });
    return checks;
  },
};

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
