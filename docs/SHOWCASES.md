# Showcases

Minimal episodes, each demonstrating one capability slice of the evaluated
invocation pipeline (docs/WORLD_PLUGIN_CONTRACT.md). Each is a single scene,
under fifteen seconds, with edge-tts voices. Compile with `make`, render with
`render-yaml`.

| Episode | Demonstrates |
| --- | --- |
| `showcase-states` | Persistent `emotion.*` states, `gaze.at` constraint, `say` intrinsic with subtitles |
| `showcase-actions` | Blocking timed actions, per-call `{...call, durationSec}` override, `mode: "nonblock"` layering |
| `showcase-camera` | `camera.punch_in` / `camera.wide`, semantic `movement.to` locomotion |
| `showcase-effects` | `effect.*` resources (`lights_down`, `ai_glitch`, `screen_error`) layered with `sound.*` cues |
| `showcase-props` | Object-subject `prop.pickup` / `prop.handover` / `prop.putdown` with support settling |
| `showcase-voice` | `voice.speed` state, `voice.interrupt` cut-in, `music.ending` closing cue |
| `showcase-snow` | `particle.snow` deterministic snowfall, `music.xuehua` BGM loop, collapse + scream beat |

## The special one: showcase-snow

《雪花飘飘~北风萧萧》. `particle.snow({count, seed, durationSec})` overlays a
deterministic (seeded) particle snowfall for the whole scene without blocking
the timeline. `music.xuehua({durationSec})` loops a synthesized pentatonic
homage to 《一剪梅》 (the checked-in cue is an original synth, not the
copyrighted recording). awei collapses to his knees while a long
"不啊——" scream plays, then lin bows.

## Override syntax

Brace groups may contain real JavaScript. The override form keeps the call as
one expression: `{...action.slam(aqiang, desk), durationSec: 1.2}` or
`{...action.push(aqiang, awei), mode: "nonblock"}`. The scheduler uses the
overridden timing; the generator body still validates against its own
factory-declared duration.

## Guarantees exercised by these episodes

- **Real displacement**: `action.push` writes a transform track with a dx/dy
  delta so the target actually staggers backward; `movement.to` eases the
  mover toward its target. Only `transform` tracks project position —
  movement tracks are leg choreography and never move actors.
- **Teleport lint**: `make` scans the manifest for implausible per-frame
  actor jumps (>260px) and prints loud `[make] teleport warning: ...` lines.
- **Props exist**: scene-staged objects are projected into the manifest
  (position, scale, procedural art) — a declared object is always visible.
- **Persistent emotions**: expression events hold until the next expression;
  `emotion.crying` adds tears to the face rig.
- **One brace parser**: dialogue, schema validation, compiler, and audio
  synthesis all share the same depth-aware group scan — nested object
  arguments never leak into spoken text or subtitles.
