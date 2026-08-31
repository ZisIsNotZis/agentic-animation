#!/usr/bin/env node
import {loadNarrowEpisode} from "../packages/core/src/narrowEpisode/load.ts";

const path = process.argv[2];
if (!path) throw new Error("usage: npm run validate:episode-yaml -- <episode.yml>");
const episode = await loadNarrowEpisode(path);
console.log(`valid: ${episode.episode.title} (${episode.scenes.length} scenes)`);
