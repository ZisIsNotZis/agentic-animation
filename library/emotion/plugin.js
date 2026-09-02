// emotion category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "emotion.calm": {
    "id": "emotion.calm",
    "durationSec": 0.35,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "release",
        "soften brow and jaw",
        "out"
      ],
      [
        "hold",
        "keep a quiet attentive mask",
        "io"
      ]
    ],
    "action": "return to an even, listening face",
    "parts": [
      "torso",
      "head"
    ],
    "emotion": {
      "name": "calm",
      "brow": "level",
      "eyes": "steady",
      "mouth": "closed-soft",
      "intensity": 0.35
    }
  },
  "emotion.confused": {
    "id": "emotion.confused",
    "durationSec": 0.55,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "notice",
        "pause the blink and lift one brow",
        "in"
      ],
      [
        "search",
        "cant the head while eyes scan",
        "io"
      ],
      [
        "hold",
        "leave the question unresolved",
        "out"
      ]
    ],
    "action": "search for an explanation",
    "parts": [
      "head",
      "arm_u_l"
    ],
    "emotion": {
      "name": "confused",
      "brow": "asymmetric-raised",
      "eyes": "searching",
      "mouth": "parted",
      "intensity": 0.8
    }
  },
  "emotion.desperate": {
    "id": "emotion.desperate",
    "durationSec": 0.7,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "break",
        "draw breath into the chest",
        "in"
      ],
      [
        "plead",
        "raise brows and open the mouth",
        "io"
      ],
      [
        "hold",
        "keep the appeal exposed",
        "out"
      ]
    ],
    "action": "plead without words",
    "parts": [
      "head",
      "torso",
      "hand_l",
      "hand_r"
    ],
    "emotion": {
      "name": "desperate",
      "brow": "pinched-high",
      "eyes": "wide-wet",
      "mouth": "open-pleading",
      "intensity": 1
    }
  },
  "emotion.embarrassed": {
    "id": "emotion.embarrassed",
    "durationSec": 0.6,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "realize",
        "eyes widen at the mistake",
        "in"
      ],
      [
        "hide",
        "drop gaze and pinch the mouth",
        "io"
      ],
      [
        "recover",
        "peek back up cautiously",
        "out"
      ]
    ],
    "action": "hide a caught reaction",
    "parts": [
      "head",
      "hand_l"
    ],
    "emotion": {
      "name": "embarrassed",
      "brow": "raised",
      "eyes": "downcast",
      "mouth": "tight",
      "intensity": 0.75
    }
  },
  "emotion.excited": {
    "id": "emotion.excited",
    "durationSec": 0.6,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "spark",
        "eyes catch the idea",
        "in"
      ],
      [
        "brighten",
        "lift cheeks and brows",
        "out"
      ],
      [
        "hold",
        "share the eager look",
        "io"
      ]
    ],
    "action": "let anticipation brighten the face",
    "parts": [
      "head",
      "torso",
      "hand_l",
      "hand_r"
    ],
    "emotion": {
      "name": "excited",
      "brow": "high",
      "eyes": "bright-wide",
      "mouth": "smile-open",
      "intensity": 0.9
    }
  },
  "emotion.fearful": {
    "id": "emotion.fearful",
    "durationSec": 0.65,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "sense",
        "stop the breath",
        "in"
      ],
      [
        "freeze",
        "widen eyes and pull the chin back",
        "io"
      ],
      [
        "hold",
        "keep the threat in peripheral focus",
        "out"
      ]
    ],
    "action": "freeze around a threat",
    "parts": [
      "head",
      "torso",
      "hand_l",
      "hand_r"
    ],
    "emotion": {
      "name": "fearful",
      "brow": "high-pinched",
      "eyes": "wide",
      "mouth": "small-open",
      "intensity": 0.95
    }
  },
  "emotion.laughing": {
    "id": "emotion.laughing",
    "durationSec": 0.8,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "tickle",
        "eyes crinkle before the sound",
        "in"
      ],
      [
        "laugh",
        "open the mouth and bounce the shoulders",
        "io"
      ],
      [
        "settle",
        "come down smiling",
        "out"
      ]
    ],
    "action": "break into an unguarded laugh",
    "parts": [
      "head",
      "torso",
      "hand_l",
      "hand_r"
    ],
    "emotion": {
      "name": "laughing",
      "brow": "relaxed",
      "eyes": "crinkled",
      "mouth": "open-smile",
      "intensity": 0.9
    },
    "audio": {
      "cue": "laugh",
      "kind": "sound",
      "gain": 0.28,
      "duration": 0.45
    }
  },
  "emotion.proud": {
    "id": "emotion.proud",
    "durationSec": 0.55,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "lift",
        "raise the sternum",
        "out"
      ],
      [
        "claim",
        "chin rises into the eyeline",
        "io"
      ],
      [
        "hold",
        "keep the smile controlled",
        "out"
      ]
    ],
    "action": "claim the credit with contained pride",
    "parts": [
      "torso",
      "head",
      "arm_u_l"
    ],
    "emotion": {
      "name": "proud",
      "brow": "smooth",
      "eyes": "direct",
      "mouth": "closed-smile",
      "intensity": 0.75
    }
  },
  "emotion.relief": {
    "id": "emotion.relief",
    "durationSec": 0.7,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "release",
        "drop the held breath",
        "out"
      ],
      [
        "soften",
        "unclench eyes and jaw",
        "io"
      ],
      [
        "rest",
        "remain safely present",
        "out"
      ]
    ],
    "action": "exhale after danger passes",
    "parts": [
      "torso",
      "head"
    ],
    "emotion": {
      "name": "relief",
      "brow": "smooth",
      "eyes": "soft",
      "mouth": "exhale",
      "intensity": 0.8
    }
  },
  "emotion.relieved": {
    "id": "emotion.relieved",
    "durationSec": 0.7,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "release",
        "drop the held breath",
        "out"
      ],
      [
        "soften",
        "unclench eyes and jaw",
        "io"
      ],
      [
        "rest",
        "remain safely present",
        "out"
      ]
    ],
    "action": "exhale after danger passes",
    "parts": [
      "torso",
      "head"
    ],
    "emotion": {
      "name": "relieved",
      "brow": "smooth",
      "eyes": "soft",
      "mouth": "exhale",
      "intensity": 0.8
    }
  },
  "emotion.satisfied": {
    "id": "emotion.satisfied",
    "durationSec": 0.55,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "recognize",
        "eyes settle on the result",
        "in"
      ],
      [
        "savor",
        "close the mouth into a knowing smile",
        "out"
      ],
      [
        "hold",
        "keep the private satisfaction",
        "io"
      ]
    ],
    "action": "enjoy a result that went to plan",
    "parts": [
      "head",
      "torso"
    ],
    "emotion": {
      "name": "satisfied",
      "brow": "level",
      "eyes": "narrow-warm",
      "mouth": "knowing-smile",
      "intensity": 0.72
    }
  },
  "emotion.secretive": {
    "id": "emotion.secretive",
    "durationSec": 0.6,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "check",
        "look toward the listener",
        "in"
      ],
      [
        "conceal",
        "lower voice-face and narrow the eyes",
        "io"
      ],
      [
        "invite",
        "finish with a tiny side smile",
        "out"
      ]
    ],
    "action": "guard a secret while inviting complicity",
    "parts": [
      "head",
      "hand_l"
    ],
    "emotion": {
      "name": "secretive",
      "brow": "angled",
      "eyes": "sidelong",
      "mouth": "pressed-smile",
      "intensity": 0.78
    }
  },
  "emotion.shocked": {
    "id": "emotion.shocked",
    "durationSec": 0.5,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "impact",
        "stop the body on the discovery",
        "back"
      ],
      [
        "open",
        "eyes and mouth spring wide",
        "out"
      ],
      [
        "hold",
        "let the audience read the shock",
        "io"
      ]
    ],
    "action": "register an impossible revelation",
    "parts": [
      "head",
      "torso",
      "hand_l",
      "hand_r"
    ],
    "emotion": {
      "name": "shocked",
      "brow": "high",
      "eyes": "wide",
      "mouth": "round-open",
      "intensity": 1
    },
    "vfx": {
      "style": "manga-impact-lines",
      "intensity": 0.7,
      "duration": 0.3
    }
  },
  "emotion.skeptical": {
    "id": "emotion.skeptical",
    "durationSec": 0.6,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "listen",
        "hold the mouth neutral",
        "in"
      ],
      [
        "doubt",
        "raise one brow and cant the head",
        "io"
      ],
      [
        "judge",
        "pin the speaker with a side-eye",
        "out"
      ]
    ],
    "action": "question a claim without buying it",
    "parts": [
      "head",
      "arm_u_l"
    ],
    "emotion": {
      "name": "skeptical",
      "brow": "one-raised",
      "eyes": "side-eye",
      "mouth": "flat",
      "intensity": 0.8
    }
  },
  "emotion.somber": {
    "id": "emotion.somber",
    "durationSec": 0.65,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "receive",
        "eyes lose their sparkle",
        "in"
      ],
      [
        "sink",
        "lower chin and mouth corners",
        "io"
      ],
      [
        "hold",
        "stay with the weight of it",
        "out"
      ]
    ],
    "action": "let difficult news lower the room",
    "parts": [
      "head",
      "torso"
    ],
    "emotion": {
      "name": "somber",
      "brow": "low",
      "eyes": "downcast",
      "mouth": "downturned",
      "intensity": 0.82
    }
  },
  "emotion.thoughtful": {
    "id": "emotion.thoughtful",
    "durationSec": 0.7,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "focus",
        "quiet the face",
        "in"
      ],
      [
        "consider",
        "eyes move off-axis while brow gathers",
        "io"
      ],
      [
        "return",
        "bring attention back with a decision",
        "out"
      ]
    ],
    "action": "turn inward to solve the problem",
    "parts": [
      "head",
      "hand_l",
      "torso"
    ],
    "emotion": {
      "name": "thoughtful",
      "brow": "knit",
      "eyes": "off-axis",
      "mouth": "pressed",
      "intensity": 0.7
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["emotion"].
    return world;
  },
  members: definitions,
};
