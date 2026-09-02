// music category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "music.ending": {
    "id": "music.ending",
    "durationSec": 2.8,
    "subjects": [
      "music"
    ],
    "params": [],
    "phases": [
      [
        "resolve",
        "thin the harmony toward the tonic",
        "out"
      ],
      [
        "cadence",
        "land the final phrase",
        "io"
      ],
      [
        "tail",
        "leave a clean reverberant tail",
        "out"
      ]
    ],
    "action": "resolve the score into a warm ending",
    "parts": [],
    "audio": {
      "cue": "ending-cadence",
      "kind": "music",
      "gain": 0.72,
      "duration": 2.8
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["music"].
    return world;
  },
  members: { ...definitions, cueAssets: {
    "ending-cadence": {
      "kind": "music",
      "file": "cues/ending-cadence.wav"
    }
  },
  },
};
