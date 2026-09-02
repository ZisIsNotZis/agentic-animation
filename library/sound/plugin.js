// sound category plugin (docs/WORLD_PLUGIN_CONTRACT.md): namespace of resource factories.
import { error_burst } from "./error_burst/index.js";
import { light_switch } from "./light_switch/index.js";
import { paper_snap } from "./paper_snap/index.js";
import { static_buzz } from "./static_buzz/index.js";

export default {
  error_burst,
  light_switch,
  paper_snap,
  static_buzz,
  cueAssets: {
    "sip": {
      "kind": "sfx",
      "file": "cues/sip.wav"
    },
    "paper-unroll": {
      "kind": "sfx",
      "file": "cues/paper-unroll.wav"
    },
    "reveal-chime": {
      "kind": "sfx",
      "file": "cues/reveal-chime.wav"
    },
    "paper-rattle": {
      "kind": "sfx",
      "file": "cues/paper-rattle.wav"
    },
    "push-thump": {
      "kind": "sfx",
      "file": "cues/push-thump.wav"
    },
    "desk-slam": {
      "kind": "sfx",
      "file": "cues/desk-slam.wav"
    },
    "laugh": {
      "kind": "sfx",
      "file": "cues/laugh.wav"
    },
    "flashlight-click": {
      "kind": "sfx",
      "file": "cues/flashlight-click.wav"
    },
    "keyboard-taps": {
      "kind": "sfx",
      "file": "cues/keyboard-taps.wav"
    },
    "shiver-rattle": {
      "kind": "sfx",
      "file": "cues/shiver-rattle.wav"
    },
    "object-whoosh": {
      "kind": "sfx",
      "file": "cues/object-whoosh.wav"
    },
    "pen-scratch": {
      "kind": "sfx",
      "file": "cues/pen-scratch.wav"
    },
    "close-click": {
      "kind": "sfx",
      "file": "cues/close-click.wav"
    },
    "error-chime": {
      "kind": "sfx",
      "file": "cues/error-chime.wav"
    },
    "digital-glitch": {
      "kind": "sfx",
      "file": "cues/digital-glitch.wav"
    },
    "power-down": {
      "kind": "sfx",
      "file": "cues/power-down.wav"
    },
    "power-up": {
      "kind": "sfx",
      "file": "cues/power-up.wav"
    },
    "error-burst": {
      "kind": "sfx",
      "file": "cues/error-burst.wav"
    },
    "paper-snap": {
      "kind": "sfx",
      "file": "cues/paper-snap.wav"
    },
    "static-buzz": {
      "kind": "sfx",
      "file": "cues/static-buzz.wav"
    },
    "light-switch": {
      "kind": "sfx",
      "file": "cues/light-switch.wav"
    }
  },
};
