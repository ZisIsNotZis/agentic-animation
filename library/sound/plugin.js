// sound category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "sound.error_burst": {
    "id": "sound.error_burst",
    "durationSec": 0.45,
    "subjects": [
      "sound"
    ],
    "params": [],
    "phases": [
      [
        "hit",
        "announce the error",
        "back"
      ],
      [
        "tail",
        "cut the resonance quickly",
        "out"
      ]
    ],
    "action": "punctuate failure with a clipped error burst",
    "parts": [],
    "audio": {
      "cue": "error-burst",
      "kind": "sound",
      "gain": 0.85,
      "duration": 0.45
    },
    "vfx": {
      "style": "manga-error-rays",
      "intensity": 0.72,
      "duration": 0.28
    }
  },
  "sound.light_switch": {
    "id": "sound.light_switch",
    "durationSec": 0.18,
    "subjects": [
      "sound"
    ],
    "params": [],
    "phases": [
      [
        "click",
        "snap the switch state",
        "back"
      ],
      [
        "tail",
        "leave a tiny room tone",
        "out"
      ]
    ],
    "action": "click a physical light switch",
    "parts": [],
    "audio": {
      "cue": "light-switch",
      "kind": "sound",
      "gain": 0.6,
      "duration": 0.18
    }
  },
  "sound.paper_snap": {
    "id": "sound.paper_snap",
    "durationSec": 0.3,
    "subjects": [
      "sound"
    ],
    "params": [],
    "phases": [
      [
        "load",
        "draw the paper tight",
        "in"
      ],
      [
        "snap",
        "release the sharp paper crack",
        "back"
      ],
      [
        "tail",
        "decay into room tone",
        "out"
      ]
    ],
    "action": "snap a sheet taut",
    "parts": [],
    "audio": {
      "cue": "paper-snap",
      "kind": "sound",
      "gain": 0.72,
      "duration": 0.3
    }
  },
  "sound.static_buzz": {
    "id": "sound.static_buzz",
    "durationSec": 0.6,
    "subjects": [
      "sound"
    ],
    "params": [],
    "phases": [
      [
        "rise",
        "introduce the electrical grit",
        "in"
      ],
      [
        "buzz",
        "hold an uneven interference bed",
        "linear"
      ],
      [
        "cut",
        "drop the signal cleanly",
        "out"
      ]
    ],
    "action": "fill the signal with unstable static",
    "parts": [],
    "audio": {
      "cue": "static-buzz",
      "kind": "sound",
      "gain": 0.58,
      "duration": 0.6
    },
    "vfx": {
      "style": "manga-scanline",
      "intensity": 0.55,
      "duration": 0.6
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["sound"].
    return world;
  },
  members: definitions,
};
