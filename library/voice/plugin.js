// voice category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "voice.interrupt": {
    "id": "voice.interrupt",
    "durationSec": 0.25,
    "subjects": [
      "actor"
    ],
    "params": [
      {
        "name": "target",
        "type": "actor"
      }
    ],
    "phases": [
      [
        "catch",
        "turn sharply to the speaker",
        "back"
      ],
      [
        "cut",
        "raise a stop hand over the line",
        "io"
      ]
    ],
    "action": "cut into the target's sentence",
    "parts": [
      "head",
      "torso",
      "hand_r"
    ],
    "emotion": {
      "name": "urgent",
      "brow": "raised",
      "eyes": "direct",
      "mouth": "open-cutoff",
      "intensity": 0.8
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["voice"].
    return world;
  },
  members: definitions,
};
