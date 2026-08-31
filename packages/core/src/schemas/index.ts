import { z } from "zod";

import { AnimConfigSchema } from "./config";
import { EpisodeSchema } from "./episode";
import { ScriptSchema } from "./script";
import { TimelineSchema } from "./timeline";
import { MouthCuesFileSchema } from "./cues";
import { StoryboardSchema } from "./storyboard";
import { EpisodeBuildSchema } from "./build";
import { PuppetSchema } from "./puppet";
import { MotionClipSchema } from "./motion";
import { LibraryMetaSchema, LibraryIndexSchema, LibraryRegistrySchema } from "./libraryMeta";
import { NarrowEpisodeSchema } from "./narrowEpisode";

export * from "./common";
export * from "./episode";
export * from "./script";
export * from "./timeline";
export * from "./cues";
export * from "./storyboard";
export * from "./build";
export * from "./puppet";
export * from "./motion";
export * from "./config";
export * from "./libraryMeta";
export * from "./narrowEpisode";

/**
 * The manifest registry: every checked-in manifest name → its zod schema and
 * the on-disk filename convention. The single source consumed by the
 * JSON-Schema exporter (`npm run schemas`) and by generic load/validate helpers.
 */
export const MANIFEST_SCHEMAS = {
  "anim.config": AnimConfigSchema,
  episode: EpisodeSchema,
  script: ScriptSchema,
  timeline: TimelineSchema,
  cues: MouthCuesFileSchema,
  storyboard: StoryboardSchema,
  "episode.build": EpisodeBuildSchema,
  puppet: PuppetSchema,
  motion: MotionClipSchema,
  "library-meta": LibraryMetaSchema,
  "library-index": LibraryIndexSchema,
  "narrow-episode": NarrowEpisodeSchema,
  "library-registry": LibraryRegistrySchema,
} as const satisfies Record<string, z.ZodTypeAny>;

export type ManifestName = keyof typeof MANIFEST_SCHEMAS;
