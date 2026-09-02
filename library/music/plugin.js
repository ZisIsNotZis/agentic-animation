// music category plugin (docs/WORLD_PLUGIN_CONTRACT.md): namespace of resource factories.
import { ending } from "./ending/index.js";

export default {
  ending
};

// Plugin-owned audio cue assets (resolved by make into manifest.audio.cues).
export const cueAssets = {
  "ending-cadence": {
    "kind": "music",
    "file": "cues/ending-cadence.wav"
  }
};
