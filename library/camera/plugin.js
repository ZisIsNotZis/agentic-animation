// camera category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "camera.punch_in": {
    "id": "camera.punch_in",
    "durationSec": 0.65,
    "subjects": [
      "camera"
    ],
    "params": [
      {
        "name": "target",
        "type": "actor"
      }
    ],
    "phases": [
      [
        "acquire",
        "center the target",
        "in"
      ],
      [
        "punch",
        "snap to an intimate reaction size",
        "back"
      ],
      [
        "hold",
        "hold the motivated close framing",
        "out"
      ]
    ],
    "action": "draw the viewer into the target reaction",
    "parts": [],
    "camera": {
      "operation": "push",
      "zoom": 1.35,
      "target": "target"
    }
  },
  "camera.wide": {
    "id": "camera.wide",
    "durationSec": 0.8,
    "subjects": [
      "camera"
    ],
    "params": [],
    "phases": [
      [
        "open",
        "pull back to establish geography",
        "out"
      ],
      [
        "compose",
        "hold actors and working area together",
        "io"
      ]
    ],
    "action": "reveal the whole spatial relationship",
    "parts": [],
    "camera": {
      "operation": "pull",
      "zoom": 0.72
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["camera"].
    return world;
  },
  members: definitions,
};
