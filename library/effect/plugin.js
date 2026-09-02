// effect category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "effect.ai_glitch": {
    "id": "effect.ai_glitch",
    "durationSec": 0.9,
    "subjects": [
      "effect"
    ],
    "params": [
      {
        "name": "target",
        "type": "dressing"
      }
    ],
    "phases": [
      [
        "flicker",
        "break the image into offset slices",
        "in"
      ],
      [
        "glitch",
        "hold chromatic displacement and scanlines",
        "linear"
      ],
      [
        "restore",
        "snap the target back into registration",
        "out"
      ]
    ],
    "action": "corrupt the target with a digital glitch",
    "parts": [],
    "vfx": {
      "style": "ai-glitch-chromatic",
      "target": "target",
      "intensity": 0.95,
      "duration": 0.8
    },
    "audio": {
      "cue": "digital-glitch",
      "kind": "sound",
      "gain": 0.62,
      "duration": 0.55
    }
  },
  "effect.lights_down": {
    "id": "effect.lights_down",
    "durationSec": 0.7,
    "subjects": [
      "effect"
    ],
    "params": [],
    "phases": [
      [
        "dim",
        "pull practical light toward half",
        "in"
      ],
      [
        "down",
        "cut the remaining room wash",
        "io"
      ],
      [
        "hold",
        "leave the scene in controlled dark",
        "out"
      ]
    ],
    "action": "drop the room into a motivated blackout",
    "parts": [],
    "vfx": {
      "style": "lighting-dim",
      "intensity": 0.9,
      "duration": 0.7
    },
    "audio": {
      "cue": "power-down",
      "kind": "sound",
      "gain": 0.42,
      "duration": 0.25
    }
  },
  "effect.lights_up": {
    "id": "effect.lights_up",
    "durationSec": 0.7,
    "subjects": [
      "effect"
    ],
    "params": [],
    "phases": [
      [
        "wake",
        "bring practicals up from black",
        "in"
      ],
      [
        "up",
        "restore the room wash",
        "out"
      ],
      [
        "hold",
        "settle exposure on the action",
        "io"
      ]
    ],
    "action": "restore the room's motivated light",
    "parts": [],
    "vfx": {
      "style": "lighting-rise",
      "intensity": 0.9,
      "duration": 0.7
    },
    "audio": {
      "cue": "power-up",
      "kind": "sound",
      "gain": 0.35,
      "duration": 0.22
    }
  },
  "effect.screen_error": {
    "id": "effect.screen_error",
    "durationSec": 0.8,
    "subjects": [
      "effect"
    ],
    "params": [
      {
        "name": "target",
        "type": "dressing"
      }
    ],
    "phases": [
      [
        "warn",
        "flash an amber warning state",
        "in"
      ],
      [
        "error",
        "hold the red failure panel",
        "back"
      ],
      [
        "persist",
        "leave the error readable",
        "out"
      ]
    ],
    "action": "turn the target display into a visible error state",
    "parts": [],
    "vfx": {
      "style": "screen-error-red",
      "target": "target",
      "intensity": 0.88,
      "duration": 0.7
    },
    "audio": {
      "cue": "error-chime",
      "kind": "sound",
      "gain": 0.65,
      "duration": 0.35
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["effect"].
    return world;
  },
  members: definitions,
};
