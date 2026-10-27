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

The engine facts are in [SLICE-A-ENGINE](../../evidence/tickets/SLICE-A-ENGINE.md)
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
 {"kind":"projectile.settled","prop":"shuttle","at":3.717,"position":[476.56,691]}]
```

(These are the numbers after R1 put a projectile's ground on the set's floor; the EA run
measured `3.633 s [509,650.16]` on the actor clamp, which R1 replaced.)

Zero motor diagnostics is stated as its encoding, not as a key: `bakeSceneMotor` omits
`motor.diagnostics` when it is empty (`if (diagnostics.length) movie.diagnostics =
diagnostics`), and `make` prints one `motor warning: …` line per entry — it printed none.
`grep -c diagnostics episodes/a-badminton/performance.json` returns 0, which is what an
empty list looks like; "empty" and "not recorded" are the same thing here only because the
CLI's warning channel is the second witness.

`Δy/Δx = 447/533` → **40.00°**, launch speed 697 px/s. Staging at scale 0.88:
server `[0.65, 0.602]`, receiver `[0.35, 0.602]`, shuttle `[0.538, 0.64]`,
racket held by the server (`held-by(server, left)`; R7 — before it, `on(bench)` at
`[0.229, 0.593]`).

The camera track carries one event, opening on the strike (the push and the
follow share a brace group):

```json
{"operation":"follow","target":"shuttle","duration":2,"z":0.75}
```

**`make` also warns, and no earlier record of this episode says so.** Eight lines on every
bake of this episode, on the descent between the arc's apex and the first floor contact —
frames 63–70 and 33–59 px since R1 put the floor back where the set paints it (frames 63–69,
33–55 px before). The log of the reviewed rendition, whose descent was 41 px shorter, is at
`artifacts/sa1-er-2026-10-21/make.log.txt`; a fresh `make` prints the current eight.

They come from `detectPropDiscontinuities` (`packages/studio/src/performance/teleports.ts`),
whose threshold is **30 stage px between consecutive frames**, and they fire on the descent
between the arc's apex and the first floor contact — the physics that produces the bounce,
not a defect in it: at 697 px/s along 40° the vertical speed is 447 px/s at launch, and
`GRAVITY` is 2600 px/s², so at the 2.917 s contact it is 447 + 2600 × 0.71 ≈ 1400 px/s —
58 px in one frame, against a 30 px threshold. The warning is the price of a fast projectile
at 24 fps and it is not being suppressed. A reader who sees these
seven lines in `make` should read them as expected for this shot; a warning **outside**
frames 63–70 is a new fact.

`zoom: 0.75` rather than the recipe's default 1.0 is measured, not taste: at
z 1 the follow's vertical travel (the evaluator pins the viewport inside the
painted stage, so the frame's y runs 0 → 323) cuts both players' heads above
the eyes from the first floor contact onward. At 0.75 the frame is 960 world px
tall, its y range is 0 → 120, and the heads survive to the eyebrows — the cut
is reduced, not removed (the drawn hair tops sit at world y ≈ 80). See
"What the shot could not have".

## The racket in the off hand (R7)

`racket: held-by(server, left)` is the whole authoring change. The prop starts the scene
*in* the hand (no ownership change and no per-frame jump is baked), the motor carries it on
the left palm's socket for the shot's length, and the episode's script is untouched: the
serve is struck from the same palm at the same time.

What to check, and with what:

```bash
node tools/prop-track.mjs episodes/a-badminton/performance.json shuttle   # struck 2.207 s, settled 3.717 s
python3 -c "import json;f=json.load(open('episodes/a-badminton/performance.json'))['sceneTrack'][0]['motor']['actors']['server'];print(f[0].get('holdsL'),f[0].get('holds'),f[-1].get('holdsL'))"
```

The second command prints `racket None racket`: the OFF hand carries the racket from frame 0
to the last frame, and the striking hand never holds it. The off hand's channel is
`holdsL`/`reachL` in the bake; the renderer solves the drawn left arm onto `reachL`.

**Two limits this shot records.**

1. **No pickup beat.** The shot opens with the racket already in his hand. A bench pickup
   would add ~3 s of walking to a shot the person accepted, and the strike's time is one of
   R7's own acceptance terms. The *mechanism* still picks up with the off hand
   (`prop.pickup(server, obj, {hand: "left"})`), exercised in
   `packages/core/test/handHold.test.ts` rather than in this shot. If the pickup belongs in
   frame, it is one authored beat away.
2. **A motor-driven prop draws at scale 1.** `evaluatePerformance`'s motor path writes
   `scale: 1` for a prop the bake owns, while the *motor* builds the touch box and the handle
   socket at the declared stage scale (`prop/racket`'s 340/200 = 1.7). The racket's drawn
   handle therefore sits ~11 px below the motor's socket. The shuttle has the same mismatch
   (its accepted 2.4×-real size is the scale-1 drawing); changing it would move the accepted
   shot, so it is recorded, not fixed here.

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
- **The shuttle is drawn large, and R4 could only shrink it so far.** The asset's
  `stageWidth` is 116 (scale 0.58), whose ink is 55.7 x 77.7 stage px against a 633 px
  figure — 2.4x a real 65 mm shuttlecock across and 2.5x its 87 mm length, against 2.6x
  and 2.8x at the 130 it was reviewed at. It cannot go to real size: below 116 the native
  pair's receiver fails its palm solve (`whole-body proposal exhausted: receiver at
  2.067s; segment-angle-rate/hand_r 8.419 > 7.000`, measured at 115), and below 72 even a
  legacy-figure strike stops touching the shrunken contact body. The drawn size and the
  physical body the palm must touch are the same declaration, which is what bounds it.
- **It still crosses the receiver's shoe on the way down.** At 116 the shuttle's ink
  intersects the receiver's shoe over 6 frames around the first contact (7 at 130), and no
  z-order change fixes it: a held prop draws above the actor layer. The first contact lands
  at the receiver's own x, so the cure is staging or framing — R5 or R3, not this asset.

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
[REVIEWS](REVIEWS.md) has what the stills actually show, and what the heads do.

## Reviews

Two independent viewer reviews have been taken of this episode, and the record of both —
each verdict, the corrections it forced, and the rendition each was bound to — is
[REVIEWS](REVIEWS.md). The shot is not accepted until one of them passes.

