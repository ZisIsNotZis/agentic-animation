// action category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {
  "action.collapse": {
    "id": "action.collapse",
    "durationSec": 1.2,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "brace",
        "lock the torso before losing height",
        "in"
      ],
      [
        "collapse",
        "bend knees and sink the shoulders",
        "io"
      ],
      [
        "rest",
        "settle weight low with head dipped",
        "out"
      ]
    ],
    "action": "fold into a guarded collapse",
    "parts": [
      "torso",
      "head",
      "leg_u_l",
      "leg_u_r"
    ],
    "actorState": {
      "pose": "collapsed"
    }
  },
  "action.enter": {
    "id": "action.enter",
    "durationSec": 1.1,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "approach",
        "walk on with measured stride",
        "out"
      ],
      [
        "arrive",
        "plant the leading foot",
        "io"
      ],
      [
        "acknowledge",
        "lift the head toward the scene",
        "out"
      ]
    ],
    "action": "step into the scene and find eyeline",
    "parts": [
      "leg_u_l",
      "leg_u_r",
      "torso",
      "head"
    ],
    "actorState": {
      "present": true
    }
  },
  "action.exit": {
    "id": "action.exit",
    "durationSec": 1,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "decide",
        "turn attention away",
        "in"
      ],
      [
        "turn",
        "rotate the torso toward the exit",
        "io"
      ],
      [
        "depart",
        "take two clean steps out",
        "out"
      ]
    ],
    "action": "break eyeline and leave frame",
    "parts": [
      "head",
      "torso",
      "leg_u_l",
      "leg_u_r"
    ],
    "actorState": {
      "present": false
    }
  },
  "action.stand": {
    "id": "action.stand",
    "durationSec": 0.9,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "plant",
        "set both feet under the hips",
        "in"
      ],
      [
        "rise",
        "stack the torso over the legs",
        "out"
      ],
      [
        "settle",
        "release shoulders into neutral",
        "io"
      ]
    ],
    "action": "recover to an attentive standing pose",
    "parts": [
      "leg_u_l",
      "leg_u_r",
      "torso",
      "head"
    ],
    "actorState": {
      "pose": "standing"
    }
  },
  "action.bow": {
    "id": "action.bow",
    "durationSec": 0.9,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "prepare",
        "draw feet together and lengthen spine",
        "in"
      ],
      [
        "bow",
        "hinge from the hips with eyes down",
        "out"
      ],
      [
        "rise",
        "return to the audience with dignity",
        "io"
      ]
    ],
    "action": "offer a courteous bow",
    "parts": [
      "torso",
      "head",
      "arm_u_l",
      "arm_u_r"
    ]
  },
  "action.check_watch": {
    "id": "action.check_watch",
    "durationSec": 0.75,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "lift",
        "bring the wrist into view",
        "out"
      ],
      [
        "read",
        "drop gaze to the watch",
        "in"
      ],
      [
        "decide",
        "look up with a time-conscious beat",
        "io"
      ]
    ],
    "action": "check time with practiced impatience",
    "parts": [
      "arm_u_l",
      "arm_l_l",
      "hand_l",
      "head"
    ]
  },
  "action.close": {
    "id": "action.close",
    "durationSec": 0.8,
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
        "align hand with the target",
        "out"
      ],
      [
        "close",
        "press the moving piece shut",
        "in"
      ],
      [
        "confirm",
        "withdraw after the click",
        "io"
      ]
    ],
    "action": "close the target with careful pressure",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r"
    ],
    "audio": {
      "cue": "close-click",
      "kind": "sound",
      "gain": 0.7,
      "duration": 0.12
    }
  },
  "action.count_money": {
    "id": "action.count_money",
    "durationSec": 1.1,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "fan",
        "spread the stack between both hands",
        "out"
      ],
      [
        "count",
        "flick one bill at a time with the thumb",
        "io"
      ],
      [
        "pocket",
        "square the stack and guard it",
        "in"
      ]
    ],
    "action": "count bills with greedy precision",
    "parts": [
      "arm_u_l",
      "arm_l_l",
      "hand_l",
      "arm_u_r",
      "hand_r",
      "head"
    ]
  },
  "action.count_three": {
    "id": "action.count_three",
    "durationSec": 0.9,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "one",
        "raise the index finger",
        "out"
      ],
      [
        "two",
        "add the middle finger",
        "out"
      ],
      [
        "three",
        "add the ring finger and present the count",
        "io"
      ]
    ],
    "action": "enumerate three points for the listener",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r"
    ]
  },
  "action.count_two": {
    "id": "action.count_two",
    "durationSec": 0.7,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "one",
        "raise the index finger",
        "out"
      ],
      [
        "two",
        "add the middle finger and hold the count",
        "io"
      ]
    ],
    "action": "present exactly two fingers for a quantity reveal",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r"
    ]
  },
  "action.cover_mouth": {
    "id": "action.cover_mouth",
    "durationSec": 0.65,
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
        "notice",
        "eyes catch the target's reaction",
        "in"
      ],
      [
        "cover",
        "bring palm to mouth",
        "out"
      ],
      [
        "peek",
        "look past the hand",
        "io"
      ]
    ],
    "action": "cover a secret reaction",
    "parts": [
      "arm_u_l",
      "arm_l_l",
      "hand_l",
      "head"
    ],
    "emotion": {
      "name": "suppressed",
      "brow": "raised",
      "eyes": "bright",
      "mouth": "covered",
      "intensity": 0.7
    }
  },
  "action.discard": {
    "id": "action.discard",
    "durationSec": 0.75,
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
        "grip",
        "secure the object",
        "in"
      ],
      [
        "flick",
        "send it away from the body",
        "back"
      ],
      [
        "dismiss",
        "leave the hand open and empty",
        "out"
      ]
    ],
    "action": "reject the object with a sharp discard",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "torso"
    ],
    "vfx": {
      "style": "manga-speed-lines",
      "intensity": 0.65,
      "duration": 0.25
    },
    "audio": {
      "cue": "object-whoosh",
      "kind": "sound",
      "gain": 0.55,
      "duration": 0.22
    }
  },
  "action.dismiss": {
    "id": "action.dismiss",
    "durationSec": 0.65,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "load",
        "draw elbow beside the torso",
        "in"
      ],
      [
        "wave",
        "cut the hand outward twice",
        "io"
      ],
      [
        "drop",
        "return to neutral without discussion",
        "out"
      ]
    ],
    "action": "wave an objection out of the room",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r"
    ]
  },
  "action.laugh": {
    "id": "action.laugh",
    "durationSec": 0.8,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "spark",
        "smile arrives before the sound",
        "in"
      ],
      [
        "laugh",
        "bounce shoulders and open the chest",
        "io"
      ],
      [
        "settle",
        "wipe the laugh into a grin",
        "out"
      ]
    ],
    "action": "laugh with a full shoulder bounce",
    "parts": [
      "head",
      "torso",
      "arm_u_l",
      "arm_u_r"
    ],
    "emotion": {
      "name": "amused",
      "brow": "relaxed",
      "eyes": "crinkled",
      "mouth": "open-smile",
      "intensity": 0.88
    },
    "audio": {
      "cue": "laugh",
      "kind": "sound",
      "gain": 0.3,
      "duration": 0.5
    }
  },
  "action.nod": {
    "id": "action.nod",
    "durationSec": 0.45,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "dip",
        "first small nod acknowledges",
        "in"
      ],
      [
        "confirm",
        "second nod commits the answer",
        "out"
      ],
      [
        "hold",
        "keep the eyeline steady",
        "io"
      ]
    ],
    "action": "give two clear confirming nods",
    "parts": [
      "head",
      "torso"
    ]
  },
  "action.pat": {
    "id": "action.pat",
    "durationSec": 0.8,
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
        "approach",
        "reach toward the target's shoulder",
        "out"
      ],
      [
        "pat",
        "land two light reassuring taps",
        "io"
      ],
      [
        "reassure",
        "leave the hand warm before withdrawing",
        "out"
      ]
    ],
    "action": "comfort the target with two gentle pats",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head"
    ]
  },
  "action.point": {
    "id": "action.point",
    "durationSec": 0.65,
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
        "aim",
        "turn head toward the target",
        "out"
      ],
      [
        "point",
        "extend one finger with a clean line",
        "in"
      ],
      [
        "hold",
        "keep the accusation readable",
        "io"
      ]
    ],
    "action": "direct attention to the target",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head"
    ],
    "gaze": {
      "target": "target",
      "lead": "head",
      "hold": 0.35
    }
  },
  "action.present": {
    "id": "action.present",
    "durationSec": 0.9,
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
        "frame",
        "draw both hands around the target",
        "out"
      ],
      [
        "reveal",
        "open the arms and lift the chin",
        "back"
      ],
      [
        "offer",
        "hold the display for the audience",
        "io"
      ]
    ],
    "action": "present the target as a reveal",
    "parts": [
      "arm_u_l",
      "arm_l_l",
      "hand_l",
      "torso",
      "head"
    ],
    "vfx": {
      "style": "manga-reveal-burst",
      "intensity": 0.6,
      "duration": 0.28
    },
    "audio": {
      "cue": "reveal-chime",
      "kind": "sound",
      "gain": 0.45,
      "duration": 0.3
    }
  },
  "action.push": {
    "id": "action.push",
    "durationSec": 0.85,
    "subjects": [
      "actor"
    ],
    "params": [
      {
        "name": "target",
        "type": "dressing"
      }
    ],
    "phases": [
      [
        "brace",
        "set the rear foot and load the shoulder",
        "in"
      ],
      [
        "push",
        "drive the palm through the target",
        "io"
      ],
      [
        "recoil",
        "return weight to a stable stance",
        "out"
      ]
    ],
    "action": "push the target decisively",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "torso",
      "leg_u_r"
    ],
    "vfx": {
      "style": "impact-burst",
      "intensity": 0.65,
      "duration": 0.2
    },
    "audio": {
      "cue": "push-thump",
      "kind": "sound",
      "gain": 0.65,
      "duration": 0.18
    }
  },
  "action.raise_hand": {
    "id": "action.raise_hand",
    "durationSec": 0.75,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "signal",
        "catch the listener's eye",
        "out"
      ],
      [
        "raise",
        "lift the hand above shoulder height",
        "io"
      ],
      [
        "wait",
        "hold patiently for recognition",
        "out"
      ]
    ],
    "action": "raise a hand to claim the floor",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head"
    ]
  },
  "action.scatter": {
    "id": "action.scatter",
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
        "gather",
        "cup the object near the centerline",
        "in"
      ],
      [
        "scatter",
        "sweep the hand through a broad arc",
        "back"
      ],
      [
        "release",
        "leave the fingers splayed after the throw",
        "out"
      ]
    ],
    "action": "scatter the target across the work area",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "torso"
    ],
    "vfx": {
      "style": "manga-scatter-lines",
      "intensity": 0.75,
      "duration": 0.3
    },
    "audio": {
      "cue": "paper-rattle",
      "kind": "sound",
      "gain": 0.7,
      "duration": 0.35
    }
  },
  "action.scratch_head": {
    "id": "action.scratch_head",
    "durationSec": 0.8,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "search",
        "eyes look up for an answer",
        "in"
      ],
      [
        "scratch",
        "fingers rub behind the head",
        "io"
      ],
      [
        "admit",
        "return with an apologetic shrug",
        "out"
      ]
    ],
    "action": "scratch the head while stuck",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head"
    ],
    "emotion": {
      "name": "awkward",
      "brow": "knit",
      "eyes": "upward",
      "mouth": "small",
      "intensity": 0.55
    }
  },
  "action.shiver": {
    "id": "action.shiver",
    "durationSec": 0.7,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "shock",
        "shoulders rise toward the ears",
        "back"
      ],
      [
        "shiver",
        "rattle the torso in two quick pulses",
        "io"
      ],
      [
        "warm",
        "wrap arms closer and breathe out",
        "out"
      ]
    ],
    "action": "shiver through a sudden chill",
    "parts": [
      "torso",
      "head",
      "arm_u_l",
      "arm_u_r"
    ],
    "vfx": {
      "style": "manga-chill-lines",
      "intensity": 0.58,
      "duration": 0.35
    },
    "audio": {
      "cue": "shiver-rattle",
      "kind": "sound",
      "gain": 0.3,
      "duration": 0.3
    }
  },
  "action.sip": {
    "id": "action.sip",
    "durationSec": 0.9,
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
        "lift the target from below",
        "out"
      ],
      [
        "sip",
        "tilt it to the mouth and drink",
        "in"
      ],
      [
        "lower",
        "return it with a satisfied breath",
        "io"
      ]
    ],
    "action": "take a measured sip from the target",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head"
    ],
    "audio": {
      "cue": "sip",
      "kind": "sound",
      "gain": 0.22,
      "duration": 0.3
    }
  },
  "action.slam": {
    "id": "action.slam",
    "durationSec": 0.65,
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
        "load",
        "lift the target with angry control",
        "in"
      ],
      [
        "slam",
        "drive it down on the surface",
        "back"
      ],
      [
        "hold",
        "freeze over the impact",
        "io"
      ]
    ],
    "action": "slam the target to punctuate the point",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "torso"
    ],
    "vfx": {
      "style": "manga-impact-star",
      "intensity": 1,
      "duration": 0.24
    },
    "audio": {
      "cue": "desk-slam",
      "kind": "sound",
      "gain": 0.95,
      "duration": 0.2
    }
  },
  "action.tap_head": {
    "id": "action.tap_head",
    "durationSec": 0.7,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "lift",
        "bring knuckles beside the temple",
        "out"
      ],
      [
        "tap",
        "land two quick taps",
        "in"
      ],
      [
        "spark",
        "look up as the idea arrives",
        "back"
      ]
    ],
    "action": "tap the head to wake an idea",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head"
    ],
    "vfx": {
      "style": "manga-idea-spark",
      "intensity": 0.55,
      "duration": 0.3
    }
  },
  "action.think": {
    "id": "action.think",
    "durationSec": 0.9,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "focus",
        "narrow attention away from the room",
        "in"
      ],
      [
        "consider",
        "support chin with one hand",
        "io"
      ],
      [
        "resolve",
        "lift eyes when the answer forms",
        "out"
      ]
    ],
    "action": "think with chin and hand engaged",
    "parts": [
      "head",
      "arm_u_l",
      "arm_l_l",
      "hand_l"
    ],
    "emotion": {
      "name": "thinking",
      "brow": "knit",
      "eyes": "off-axis",
      "mouth": "pressed",
      "intensity": 0.7
    }
  },
  "action.touch_hair": {
    "id": "action.touch_hair",
    "durationSec": 0.75,
    "subjects": [
      "actor"
    ],
    "params": [],
    "phases": [
      [
        "reach",
        "hand rises to the hairline",
        "out"
      ],
      [
        "smooth",
        "fingers make one deliberate pass",
        "io"
      ],
      [
        "answer",
        "hand drops as eye contact returns",
        "out"
      ]
    ],
    "action": "smooth hair before answering",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head"
    ]
  },
  "action.type": {
    "id": "action.type",
    "durationSec": 1,
    "subjects": [
      "actor"
    ],
    "params": [
      {
        "name": "target",
        "type": "dressing"
      }
    ],
    "phases": [
      [
        "ready",
        "hover both hands over the target",
        "out"
      ],
      [
        "type",
        "alternate fingers in a brisk rhythm",
        "linear"
      ],
      [
        "send",
        "stop and look to the screen",
        "in"
      ]
    ],
    "action": "type a short urgent message",
    "parts": [
      "arm_u_l",
      "arm_l_l",
      "hand_l",
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head"
    ],
    "audio": {
      "cue": "keyboard-taps",
      "kind": "sound",
      "gain": 0.42,
      "duration": 0.75
    }
  },
  "action.unroll": {
    "id": "action.unroll",
    "durationSec": 1.1,
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
        "grip",
        "catch both ends of the roll",
        "in"
      ],
      [
        "unroll",
        "draw hands apart in one continuous sweep",
        "out"
      ],
      [
        "flatten",
        "press the far edge flat",
        "io"
      ]
    ],
    "action": "unroll the target across the surface",
    "parts": [
      "arm_u_l",
      "arm_l_l",
      "hand_l",
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "torso"
    ],
    "audio": {
      "cue": "paper-unroll",
      "kind": "sound",
      "gain": 0.65,
      "duration": 0.7
    }
  },
  "action.write": {
    "id": "action.write",
    "durationSec": 1,
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
        "position",
        "anchor the target with the free hand",
        "out"
      ],
      [
        "write",
        "move the wrist through legible strokes",
        "linear"
      ],
      [
        "finish",
        "lift the pen and inspect the line",
        "in"
      ]
    ],
    "action": "write a deliberate note on the target",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head",
      "torso"
    ],
    "audio": {
      "cue": "pen-scratch",
      "kind": "sound",
      "gain": 0.35,
      "duration": 0.65
    }
  },
  "action.illuminate": {
    "id": "action.illuminate",
    "durationSec": 0.85,
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
        "aim",
        "raise the object toward the target",
        "out"
      ],
      [
        "illuminate",
        "hold a focused beam on the target",
        "io"
      ],
      [
        "reveal",
        "turn attention to what the light found",
        "out"
      ]
    ],
    "action": "use the object to illuminate the target",
    "parts": [
      "arm_u_r",
      "arm_l_r",
      "hand_r",
      "head",
      "torso"
    ],
    "vfx": {
      "style": "manga-light-cone",
      "intensity": 0.8,
      "duration": 0.45
    },
    "audio": {
      "cue": "flashlight-click",
      "kind": "sound",
      "gain": 0.5,
      "duration": 0.12
    },
    "gaze": {
      "target": "target",
      "lead": "head",
      "hold": 0.4
    }
  }
};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["action"].
    return world;
  },
  members: definitions,
};
