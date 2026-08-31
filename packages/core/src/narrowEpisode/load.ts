import {readFile} from "node:fs/promises";
import {parse} from "yaml";
import {NarrowEpisodeSchema, type NarrowEpisode} from "../schemas/narrowEpisode";

export async function loadNarrowEpisode(path: string): Promise<NarrowEpisode> {
  return NarrowEpisodeSchema.parse(parse(await readFile(path, "utf8")));
}
