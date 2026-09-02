// music category plugin (docs/WORLD_PLUGIN_CONTRACT.md): namespace of resource factories.
import { ending } from "./ending/index.js";

export default {
  ending,
  cueAssets: {
    "ending-cadence": {
      "kind": "music",
      "file": "cues/ending-cadence.wav"
    }
  },
};
