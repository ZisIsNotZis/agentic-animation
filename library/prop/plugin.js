// prop category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "prop.handover": {
    "id": "prop.handover",
    "durationSec": 1.15,
    "subjects": [
      "actor"
    ],
    "params": [
      {
        "name": "object",
        "type": "object"
      },
      {
        "name": "target",
        "type": "actor"
      }
    ],
    "phases": [
      [
        "offer",
        "extend the object and meet the receiver's eyes",
        "out"
      ],
      [
        "handover",
        "receiver's grip takes the weight",
        "io"
      ],
      [
        "release",
        "open the fingers and return to neutral",
        "out"
      ]
    ],
    "action": "transfer the object into the receiver's hands",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "torso",
      "head"
    ],
    "markers": {
      "handover": 0.68
    },
    "lifecycle": {
      "objectParam": "object",
      "receiverParam": "target",
      "releaseAt": 0.68
    },
    "gaze": {
      "target": "target",
      "lead": "head",
      "hold": 0.42
    }
  },
  "prop.pickup": {
    "id": "prop.pickup",
    "durationSec": 0.95,
    "subjects": [
      "actor"
    ],
    "params": [
      {
        "name": "target",
        "type": "object"
      }
    ],
    "phases": [
      [
        "reach",
        "lower center of mass toward the object",
        "out"
      ],
      [
        "grasp",
        "close fingers around the object",
        "in"
      ],
      [
        "lift",
        "stand with the weight secure",
        "io"
      ]
    ],
    "action": "reach down and secure the object",
    "parts": [
      "torso",
      "head",
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "leg_u_r"
    ],
    "markers": {
      "bind": 0.58,
      "grasp": 0.58
    },
    "lifecycle": {
      "objectParam": "target",
      "bindAt": 0.58
    }
  },
  "prop.putdown": {
    "id": "prop.putdown",
    "durationSec": 1,
    "subjects": [
      "actor"
    ],
    "params": [
      {
        "name": "object",
        "type": "object"
      },
      {
        "name": "target",
        "type": "object"
      }
    ],
    "phases": [
      [
        "position",
        "lower the object toward its support",
        "out"
      ],
      [
        "release",
        "open fingers just above the surface",
        "in"
      ],
      [
        "settle",
        "withdraw and let the object land",
        "io"
      ]
    ],
    "action": "place the object down and let it settle",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "torso",
      "head"
    ],
    "markers": {
      "release": 0.62,
      "settle": 0.94
    },
    "lifecycle": {
      "objectParam": "object",
      "supportParam": "target",
      "releaseAt": 0.62,
      "settleAt": 0.94
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["prop"].
    return world;
  },
  members: definitions,
};
