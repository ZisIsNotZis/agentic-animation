import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execa } from "execa";
import { notReadyCheck, type AdapterRegistration, type Check, type TtsAdapter, type VoiceInfo } from "@anim/core";

const adapter: TtsAdapter = {
  id: "espeak",
  async synthesize(req) {
    if (!req.text.trim()) throw new Error("tts:espeak — empty text");
    mkdirSync(dirname(req.outPath), { recursive: true });
    const voice = req.lang === "zh" ? "cmn" : (req.lang || "en");
    await execa("espeak-ng", ["-v", voice, "-s", "148", "-p", req.voice === "deep" ? "28" : "58", "-w", req.outPath, req.text]);
    const { stdout } = await execa("ffprobe", ["-v","error","-show_entries","format=duration","-of","csv=p=0",req.outPath]);
    return { path: req.outPath, durationSec: Number(stdout.trim()) };
  },
  async listVoices(lang) { return [{ id: "bright", name: "Mandarin bright", lang: lang || "zh" }, { id: "deep", name: "Mandarin deep", lang: lang || "zh" }]; },
  async doctor(): Promise<Check[]> {
    try { await execa("espeak-ng", ["--version"]); return [{ name: "tts:espeak present", ok: true, detail: "local espeak-ng Mandarin voice" }]; }
    catch { return [notReadyCheck("tts:espeak", "espeak-ng not found", "Install espeak-ng")]; }
  },
};
export default { kind: "tts", adapter } satisfies AdapterRegistration;
