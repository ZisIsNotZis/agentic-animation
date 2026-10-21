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

`make` (exit 0) writes a 5.5 s `performance.json` with **zero motor diagnostics** and:

```json
[{"kind":"projectile.struck","prop":"shuttle","at":2.207,"velocity":[-533,-447]},
 {"kind":"projectile.settled","prop":"shuttle","at":3.633,"position":[509,650.16]}]
```

Zero motor diagnostics is stated as its encoding, not as a key: `bakeSceneMotor` omits
`motor.diagnostics` when it is empty (`if (diagnostics.length) movie.diagnostics =
diagnostics`), and `make` prints one `motor warning: …` line per entry — it printed none.
`grep -c diagnostics episodes/a-badminton/performance.json` returns 0, which is what an
empty list looks like; "empty" and "not recorded" are the same thing here only because the
CLI's warning channel is the second witness.

`Δy/Δx = 447/533` → **40.00°**, launch speed 697 px/s. Staging at scale 0.88:
server `[0.65, 0.602]`, receiver `[0.35, 0.602]`, shuttle `[0.538, 0.64]`,
racket `[0.229, 0.593]` (placed `on(bench)`).

The camera track carries one event, opening on the strike (the push and the
follow share a brace group):

```json
{"operation":"follow","target":"shuttle","duration":2,"z":0.75}
```

**`make` also warns, and no earlier record of this episode says so.** Seven lines, on every
bake of this episode (the log is kept at `artifacts/sa1-er-2026-10-21/make.log.txt`):

```
[make] sudden-move warning: shuttle jumps 33px at frame 63 (832,380 -> 810,404) — objects must move continuously
…
[make] sudden-move warning: shuttle jumps 55px at frame 69 (703,581 -> 681,631) — objects must move continuously
```

They come from `detectPropDiscontinuities` (`packages/studio/src/performance/teleports.ts`),
whose threshold is **30 stage px between consecutive frames**, and they fire on the descent
between the arc's apex and the first floor contact — the physics that produces the bounce,
not a defect in it: at 697 px/s along 40° the vertical speed is 447 px/s at launch, and
`GRAVITY` is 2600 px/s², so at the 2.917 s contact it is 447 + 2600 × 0.71 ≈ 1400 px/s —
58 px in one frame, against a 30 px threshold. The warning is the price of a fast projectile
at 24 fps and it is not being suppressed. A reader who sees these
seven lines in `make` should read them as expected for this shot; a warning **outside**
frames 63–69 is a new fact.

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

The video **is** committed, in this episode's declared home for renditions:
`episodes/a-badminton/artifacts/sa1-er-2026-10-21/episode.mp4`, beside its identity.
`episodes/a-badminton/dist/` is reserved for an accepted delivery and does not exist yet.

`episodes/a-badminton/artifacts/sa1-er-2026-10-21/bake-identity.json` carries the identity
of the artefact these stills were cut from, at `git rev-parse HEAD` **6a8d967**, and
`bash episodes/a-badminton/artifacts/sa1-er-2026-10-21/verify.sh` recomputes every field of
it and cuts the stills (exit 0 = intact; a non-zero exit names the field that moved). The
identity is not restated here — one home.

Five stills, cut with `ffmpeg -ss <t> -frames:v 1` from that video (they are derived and not
tracked; `verify.sh` recreates them):

| still | t | frame | what it is |
| --- | --- | --- | --- |
| `t2.208.png` | 2.208 s | 53 | the strike — the shuttle leaves the palm |
| `t2.500.png` | 2.500 s | 60 | mid-arc — the shuttle over the net |
| `t2.917.png` | 2.917 s | 70 | the first floor contact |
| `t3.167.png` | 3.167 s | 76 | the bounce — its apex |
| `t4.583.png` | 4.583 s | 110 | the hold — the shuttle at rest |

Inspected by eye at full resolution by the producer: the arc reads across the net and the
court reads. The producer's reading of the rest and the bounce did **not** survive review —
see §"S-A1 review (ER)" for what the stills actually show, and for the heads.

## S-A1 review (ER) — the shot does not pass yet

ER (fresh `reviewer`, run `b9628190`, blind contract, stills at file resolution plus a
6 fps sample of the video) answered **NOT SATISFIED**; its text is filed verbatim at
[tickets/S-A1-ER-REVIEW](../../docs/tickets/S-A1-ER-REVIEW.md). What it read: the arc and
the court read; the bounce, the rest, the follow and the shuttle's scale do not.

Two of its findings are mechanically checkable, and both need a correction:

1. **The bounces exist — its 6 fps sample stepped over both.** `node tools/prop-track.mjs
   episodes/a-badminton/performance.json shuttle` (landed with this note) prints the path:

   | beat | frame | t | y |
   | --- | --- | --- | --- |
   | apex | 57 | 2.375 s | 329.48 |
   | first contact | 70 | 2.917 s | 635.17 |
   | first hop apex, 62 px | 75 | 3.125 s | 573.44 |
   | second contact | 81 | 3.375 s | 648.32 |
   | second hop apex, 16 px | 84 | 3.500 s | 632.06 |
   | rest, held to the end | 87 | 3.625 s | 650.16 |

   Each hop lasts 4–5 frames, ~0.2 s, so a 6 fps sample lands on one point of it. Its
   perception still holds: a 62 px hop on a 720 px frame, with nothing drawn under it,
   does not read as a bounce.
2. **The projectile's floor is not the set's floor — the defect it actually saw.** The
   shuttle is staged at y 691.2 and the hall paints its floor at 691; its contacts are at
   635.17 and 648.32 and it rests at 650.16. It bounces and comes to rest **41–56 px above
   the line it started on**, with no ground shadow at contact, so the still at 3.167 s —
   labelled "the bounce, its apex" — shows a shuttle hanging in empty air. The defect was
   found by the reviews, not recorded by the producer: EA's five limits are swing,
   elevation, toss, head-cut and scale, and none of them is this. The mechanism is
   `supportYAt`, which seeds a projectile's ground with the actor clamp (`groundY`
   0.602 × 1080 = 650) and then accepts only a declared surface with a *smaller* y — so the
   hall's painted floor at 691 can never win. It is a defect, not a staging choice.

Confirmed by both, no correction needed: the shuttle is drawn ~3× a real shuttlecock
(`stageWidth` 130 at scale 0.65 beside a 633 px figure) and passes in front of the
receiver's legs; the follow at `zoom 0.75` pans only ~120 px and reads as a wide; the
players never move.

**Corrected: the heads are not cut in this rendition.** The producer recorded a cut "above
the eyebrows from the first floor contact onward"; the review found both heads whole with
margin above them at 2.917 s, and the hair touching the top edge at most at 3.625 s. The
frame arithmetic agrees: the 0.75 follow's frame spans world y 0 → 120 and the drawn hair
tops sit at ≈ 80. The cut is real at `zoom: 1` — which is why 0.75 was chosen — and it is
not present at 0.75, so R3 stays a question about the pan reading as a follow.

**S-A1 is not reached.** The shot bakes, renders and is bound to its revision — the
independent viewer does not pass it. The repair workset is
`docs/ART_ASSET_PROGRAM.md` §"The repair workset".
