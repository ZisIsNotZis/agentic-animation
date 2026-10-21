# a-badminton — one serve, measured

Milestone **S-A1** of the asset programme: `set/badminton_hall`, two
`figure/athlete_a` bodies, `prop/shuttle` and `prop/racket`, in one shot. The
server takes the shuttle off the floor, serves it from his own palm, and
`camera.follow(shuttle)` tracks the 40° arc, the bounce and the rest.
`episode.yml` is the authored input; this note holds what the bake and the
render measured, so the next session does not re-derive it.

Audio is ellipsis-only silence: no offline TTS, and the observation is the
shuttle, the arc, the bounce and the camera.

## The reachable strike, measured again in the episode route

The engine facts are in [SLICE-A-ENGINE](../../docs/tickets/SLICE-A-ENGINE.md)
§E1/§E2; these are the ones this episode re-measured through `check`/`make`:

| what was tried | what the bake said |
| --- | --- |
| `action.push(server, shuttle, 1.1)` with the shuttle staged on the floor | refused: `whole-body proposal exhausted: server at 0.350s; joint-rate/elbow_r 7.251 > 6.000` |
| `prop.pickup(server, shuttle)` with the server in the default `front` orientation | refused: `segment-angle-rate/foot_r 12.046 > 7.000` at 0.000 s |
| the same pickup after `pose.orient(server, "left")` | binds clean: the palm takes the shuttle at 1.83 s, `diagnostics: []` |
| pickup budgeted with 3 ellipsis beats (1.65 s) and the push on the next beat | the push starts before the grab completes and seeds its drive hand off the rest pose: `segment-angle-rate/hand_r 44.582 > 7.000` at 1.800 s |
| pickup budgeted with 4 ellipses (2.2 s) | clean |

Two facts behind those rows: a native figure with **no declared orientation**
bakes with the `front` skeleton, whose crouch-reach is unsolvable, so
`pose.orient` is what makes a floor pickup possible at all; and `prop.*` calls
are **state**, not timed — they advance no cursor, so a pickup's motor time has
to be paid for with silent beats (`…` = 0.55 s).

## The compiled events

`make` (exit 0) writes a 5.5 s `performance.json` with an empty
`motor.diagnostics` and:

```json
[{"kind":"projectile.struck","prop":"shuttle","at":2.207,"velocity":[-533,-447]},
 {"kind":"projectile.settled","prop":"shuttle","at":3.633,"position":[509,650.16]}]
```

`Δy/Δx = 447/533` → **40.00°**, launch speed 697 px/s. Staging at scale 0.88:
server `[0.65, 0.602]`, receiver `[0.35, 0.602]`, shuttle `[0.538, 0.64]`,
racket `[0.229, 0.593]` (placed `on(bench)`).

The camera track carries one event, opening on the strike (the push and the
follow share a brace group):

```json
{"operation":"follow","target":"shuttle","duration":2,"z":0.75}
```

`zoom: 0.75` rather than the recipe's default 1.0 is measured, not taste: at
z 1 the follow's vertical travel (the evaluator pins the viewport inside the
painted stage, so the frame's y runs 0 → 323) cuts both players' heads above
the eyes from the first floor contact onward. At 0.75 the frame is 960 world px
tall, its y range is 0 → 120, and the heads survive to the eyebrows — the cut
is reduced, not removed (the drawn hair tops sit at world y ≈ 80). See
"What the shot could not have".

## The force and the drive length

The pinned band is `force 1.0–1.2`; the episode writes `force 1.0` over
**`forceSec 0.16`**, not the library's 0.25. Measured, at this episode's strike
point (x ≈ 1020, not EP's 700):

| force / forceSec | settle (world x) | where it rests |
| --- | --- | --- |
| 1.4 / 0.25 (library default) | ~2380 | off the painted stage |
| 1.1 / 0.25 | −54.8 | off the floor support's left end (60) |
| 1.0 / 0.25 | 82.7 | the bench seat (y 640), frame's left edge |
| 1.0 / 0.18 | 429.2 | the bench seat (y 640) |
| 1.0 / 0.16 | **509.0** | the open court, left of the receiver's feet |

The flight's horizontal reach is what decides this: one force unit over 0.25 s
carries the shuttle ~870 px, and the stage has only ~960 px of clean court on
the serve's side. The shorter impulse keeps the pinned force and the 40°
elevation and puts the bounce and the rest on the court.

## What the shot could not have

- **No racket swing.** `swing.grip`/`swing.release` are undeclared (slice B owes
  them), so the racket is a prop on the bench and the serve is the hand strike
  the motor can bake. One hand holds one prop, so the racket cannot be in the
  same hand as the shuttle.
- **One elevation only.** 40° is one engine constant; a smash or lob is not
  authorable, so this is a serve and reads as one.
- **No authored toss.** `prop.release` opens the hand with no upward impulse, so
  the shuttle is struck out of the palm rather than tossed and hit.
- **A following shot can cut a drawn head** (E4, deliberate). Measured here: at
  `zoom: 1` the head is cut to the chin; at 0.75 to the eyebrows in the contact,
  bounce and hold frames; below z ≈ 0.72 the head fits but the pan shrinks to
  ~120 px and the shot stops reading as a follow. The shot keeps the pan.
- **The shuttle is drawn large** (the asset's declared `stageWidth` 130 at scale
  0.65 = 130 x 104 world px against a 633 px figure) and passes in front of the
  receiving player's legs. Asset-side, not authorable here.

## Evidence (2026-10-21, run `25e80bfb`)

Exit codes, in order: `check` **0**, `make` **0**, `render-yaml` **0**
(132 frames, 5.500 s), `npx tsc --noEmit` **0**, `git diff --check` clean.
`npm test` was **not** run: the integrating node owns the combined check and two
concurrent runs race on the fixtures `pretest` rewrites.

The video is deliberately **not** committed: it was moved to
`/tmp/aa-sa1/episode.mp4` and `episodes/a-badminton/dist/` does not exist, so it
cannot appear in `git status` (`episodes/*/dist/*.mp4` is un-ignored for
published deliveries, which is why the file had to leave the repo).

`/tmp/aa-sa1/bake-identity.json` carries the identity of the artefact these
stills were cut from, at `git rev-parse HEAD` **6a8d967**:

| field | value |
| --- | --- |
| episode sha256 | `fcb4de68c49974327719b1a62693cdfc3df013957fbb9432927dfd3f5fcdb15d` |
| performance.json sha256 | `7df6ee8780f5cabf008bd17a846a43d8d7b2a697e7a683c02a728c66c972dcff` |
| video sha256 | `6d3cbca5f03e3b4c58ddda505295f28d229e84f658c3029d40b454ccc3d8f907` |
| frames / duration | 132 / 5.500 s at 24 fps, 1280x720 |
| git HEAD | `6a8d967fe0776675ce7c41e8d1f3ffdb1611d2f5` |

Five stills, cut with `ffmpeg -ss <t> -frames:v 1` from that video:

| still | t | frame | what it is |
| --- | --- | --- | --- |
| `/tmp/aa-sa1/t2.208.png` | 2.208 s | 53 | the strike — the shuttle leaves the palm |
| `/tmp/aa-sa1/t2.500.png` | 2.500 s | 60 | mid-arc — the shuttle over the net |
| `/tmp/aa-sa1/t2.917.png` | 2.917 s | 70 | the first floor contact |
| `/tmp/aa-sa1/t3.167.png` | 3.167 s | 76 | the bounce — its apex |
| `/tmp/aa-sa1/t4.583.png` | 4.583 s | 110 | the hold — the shuttle at rest |

Inspected by eye at full resolution: the arc reads across the net, the bounce
reads as a bounce, the shuttle rests where the camera left it; both players'
heads are cut above the eyebrows from the first floor contact onward (see
"What the shot could not have").
