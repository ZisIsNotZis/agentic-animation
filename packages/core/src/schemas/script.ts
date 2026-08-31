import { z } from "zod";
import { IdSchema, LangSchema, MoodSchema } from "./common";

/**
 * `script.json` — hand/agent-authored narration. `display` carries full IAST
 * diacritics for captions; `tts` is the phoneticized form fed to the synth.
 * ARCHITECTURE §6.
 */
export const DialogueLineSchema = z.object({
  /** Stable line id — cue files (`cues/<lineId>.json`) key off this. */
  id: IdSchema,
  characterId: IdSchema,
  display: z.string().min(1),
  tts: z.string().min(1),
});
export type DialogueLine = z.infer<typeof DialogueLineSchema>;

export const ScriptSceneSchema = z.object({
  id: IdSchema,
  /** Optional short name for logs/tooling. */
  name: z.string().optional(),
  display: z.string().min(1),
  tts: z.string().min(1),
  mood: MoodSchema,
  /** Seconds of silence before narration starts (breathing pad). */
  padBefore: z.number().min(0).default(2),
  /** Seconds of silence after narration ends. */
  padAfter: z.number().min(0).default(2.4),
  dialogue: z.array(DialogueLineSchema).default([]),
});
export type ScriptScene = z.infer<typeof ScriptSceneSchema>;

export const ScriptSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  language: LangSchema.default("en"),
  scenes: z.array(ScriptSceneSchema).min(1),
});
export type Script = z.infer<typeof ScriptSchema>;
