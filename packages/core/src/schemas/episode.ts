import { z } from "zod";
import { IdSchema, LangSchema, SlugSchema } from "./common";

/**
 * `episode.json` — story extraction. Produced by an agent (make-episode skill)
 * from the corpus adapter's search results; schema-validated. ARCHITECTURE §6.
 */
export const EpisodeSourceSchema = z.object({
  /** Corpus-relative path or ref the material came from. */
  path: z.string().min(1),
  /** Human-readable citation for the colophon / license hygiene. */
  citation: z.string().min(1),
});
export type EpisodeSource = z.infer<typeof EpisodeSourceSchema>;

export const EpisodeCastMemberSchema = z.object({
  characterId: IdSchema,
  role: z.string().min(1),
});
export type EpisodeCastMember = z.infer<typeof EpisodeCastMemberSchema>;

export const EpisodeBeatSchema = z.object({
  id: IdSchema,
  summary: z.string().min(1),
  /** Scene id this beat maps to (references a `script.json` scene). */
  sceneRef: IdSchema,
});
export type EpisodeBeat = z.infer<typeof EpisodeBeatSchema>;

export const EpisodeSchema = z.object({
  slug: SlugSchema,
  title: z.string().min(1),
  sources: z.array(EpisodeSourceSchema).default([]),
  cast: z.array(EpisodeCastMemberSchema).default([]),
  beats: z.array(EpisodeBeatSchema).default([]),
  variants: z.array(z.string()).default([]),
  language: LangSchema.default("en"),
});
export type Episode = z.infer<typeof EpisodeSchema>;
