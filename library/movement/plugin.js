// movement category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "movement.to": {
    "id": "movement.to",
    "durationSec": 1.4,
    "subjects": [
      "actor"
    ],
    "params": [
      {
        "name": "target",
        "type": "entity"
      }
    ],
    "phases": [
      [
        "orient",
        "turn hips and find the route",
        "out"
      ],
      [
        "travel",
        "take two even steps toward the target",
        "linear"
      ],
      [
        "arrive",
        "plant and restore the eyeline",
        "io"
      ]
    ],
    "action": "walk with purpose to the target",
    "parts": [
      "leg_u_l",
      "leg_l_l",
      "foot_l",
      "leg_u_r",
      "leg_l_r",
      "foot_r",
      "torso",
      "head"
    ],
    "trackKind": "movement",
    "actorState": {
      "pose": "standing"
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["movement"].
    return world;
  },
  members: definitions,
};
