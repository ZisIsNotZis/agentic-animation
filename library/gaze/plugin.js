// gaze category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "gaze.at": {
    "id": "gaze.at",
    "durationSec": 0.35,
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
        "lead",
        "eyes travel first",
        "out"
      ],
      [
        "land",
        "head follows to the target",
        "io"
      ],
      [
        "hold",
        "maintain connection",
        "out"
      ]
    ],
    "action": "establish a deliberate eyeline",
    "parts": [
      "head"
    ],
    "gaze": {
      "target": "target",
      "lead": "eyes",
      "hold": 0.25
    }
  },
  "gaze.audience": {
    "id": "gaze.audience",
    "durationSec": 0.35,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "turn",
        "eyes leave the scene",
        "out"
      ],
      [
        "address",
        "head settles on the audience",
        "io"
      ],
      [
        "hold",
        "invite the viewer in",
        "out"
      ]
    ],
    "action": "break the fourth wall",
    "parts": [
      "head"
    ],
    "gaze": {
      "target": "audience",
      "lead": "head",
      "hold": 0.3
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["gaze"].
    return world;
  },
  members: definitions,
};
