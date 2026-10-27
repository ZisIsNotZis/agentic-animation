# a-rally — one serve, one return, as a shot

Milestone **S-A2** of the asset programme: the accepted serve of
`episodes/a-badminton` and the rally R8 made authorable, in one shot. The same
hall and set, two `figure/athlete_a` bodies, `prop/shuttle`, `prop/racket` in
the server's **left** hand (R7). `episode.yml` is the authored input; this note
holds what the bake and the render measured, so the next session does not
re-derive it. The long tables live in
[the ticket](../../evidence/tickets/S-A2-RALLY.md).

Audio is ellipsis-only silence: no TTS, no network. The observation is the
shuttle's two arcs and the two contacts.

## What the shot does

`make` (exit 0, **zero motor diagnostics**) bakes a 4.50 s performance (108
frames at 24 fps) with:

```json
[{"kind":"projectile.struck","prop":"shuttle","at":2.307,"velocity":[-533,-447]},
 {"kind":"projectile.struck","prop":"shuttle","at":2.680,"velocity":[533,-447]},
 {"kind":"projectile.settled","prop":"shuttle","at":4.167,"position":[1387.94,691]}]
```

- **The serve is the accepted one.** The accepted preamble: the pickup (the
  crouched palm), then the strike at 2.307 s, 40.00°, 697 px/s. The shot keeps
  a-badminton's pickup because the accepted serve's *low* strike is what the
  crouch gives; a shuttle started `held-by(server)` is struck 84 px higher and
  its ink reaches the chin. The strike time is 0.100 s later than r3's because
  the camera's beat sits before the serve (see "The camera").
- **The return** is the receiver meeting the descending shuttle at 2.680 s and
  striking it back on the serve's arc mirrored: 40.00°, `[533,-447]`, 697 px/s
  (force 1.0 over forceSec 0.16). The contact still is the last baked frame
  before the launch, `stills/t2.667.png` (frame 64; `projectile.struck` is
  recorded at 2.680 s, between frames 64 and 65), and the drawn hand is on the
  shuttle's cork (see "The contact, measured").
- **The return's flight** runs to its rest at 4.167 s on the hall's painted
  floor line, to the server's right. The shot ends at 4.50 s — **0.333 s after
  the settle**, not the 0.88 s of frozen frames r3 carried.

`grep -c 'motor warning' artifacts/sa2-r4-2026-10-27/make.log.txt` is 0; an
empty `motor.diagnostics` is the bake's encoding of "no diagnostics".

## The staging: court distance

| actor | staged at | ground | scale | z |
| --- | --- | --- | --- | --- |
| server | 0.65 → x 1246 | 0.602 → 650 | 0.88 | 50 |
| receiver | 0.35 → x 672 | 0.57 → 615.6 | 0.722 | 40 (behind the net's 45) |

**574 px apart** — the accepted shot's court distance, not r1's 288. The
receiver stays on the accepted `background` lane; R8's interception walks him
the ~100 px to the descending shuttle and meets it. The net's mesh is drawn over
the receiver's legs (`stills/t1.900.png`), so the depth reads as two sides of a
court.

## The cue band, measured for this staging

The receiver's push is the second strike; its cue is the beat it sits on. R8's
0.26 s band was measured on the EP fixture (receiver x 1500) and does not
transfer, so the shot has its own sweep ([full table](../../evidence/tickets/S-A2-RALLY.md)):

- **The band with empty diagnostics is 2.305–2.590 s = 0.285 s**, every cue in
  it landing a second `projectile.struck` on the serve's mirrored arc
  `[533,-447]`; 2.595 s and later are the named miss.
- **The chosen cue is 2.310 s** — 0.010 s after the serve's cue, the highest
  contact in the band (the shuttle's cork at the hand's rest height); later
  cues drop the contact to the receiver's shin.
- **How the cue is authored.** The DSL has no explicit cue time: a beat happens
  where it sits in the cursor, and the cursor advances by the durations before
  it. The receiver's push therefore sits on its own beat 10 ms after the serve's
  cue — a `movement.to(receiver, receiver)` no-op with `durationSec: 0.010`,
  because state calls advance no cursor and a `…` beat is 0.55 s. Putting both
  pushes on one cue was measured and silently drops the return
  ([why](../../evidence/tickets/S-A2-RALLY.md)).

## The contact, measured

At the contact frame (64, 2.667 s) the receiver's drawn hand — a circle of
radius 9.5 design px, 6.9 stage px at his 0.722 scale — has its centre **inside**
the shuttle's drawn body box (x 792–888, y 232–366 world), so the hand's ink
overlaps the box by 6.9 px at the **cork** end. One frame earlier (2.625 s) the
centre is 11.4 px from the box and the ink is 4.5 px short. The reviewer's
"~30 px from the skirt" is the hand-to-skirt distance *after* the launch
(2.60–2.70 s), not the cork at the contact: the skirt's wide end sits ~108 px
above the hand. So the drawing touches; the missed read was the size of the
contact in the frame, which the camera now buys.

## The camera

Three framings, one shot, all through the existing camera calls:

| call | interval (s) | framing |
| --- | --- | --- |
| composition (no call) | 0.000–1.650 | full-stage wide, zoom fit 0.667 — the pickup, frame 0 included |
| `camera.punch_in(receiver, 1.3)` | 1.650–2.300 | push 0.667 → 1.3 over 0.65 s; the receiver is the subject, `fitPushCamera` fits the staged pair (x 491–1546) and the head rule moves y to 0 |
| hold (inside `punch_in`) | 2.300–2.910 | the medium two-shot holds through the serve, the contact (2.680) and the first part of the return |
| `camera.wide()` | 2.910–3.710 | pull back to the full court (z 0.72) for the landing and the tail |

- **No drawn head is sliced at any frame**, and **the shuttle's ink stays inside
  the frame at every frame** — checked per frame through `evaluatePerformance`
  over all 108 frames (0 head slices, 0 shuttle-out frames).
- **No wide-to-follow flash at frame 0**: the frame opens on the composition and
  the push only starts at 1.650 s.
- **The serve beat is readable, but not in the wide.** A 0.65 s push cannot fit
  between the serve cue (2.30) and the contact (2.68) — 0.38 s — and the DSL's
  beat cursor has no 0.65 s beat there, so the push is authored to complete *on*
  the serve's cue: the launch is shown in the medium two-shot (both heads whole,
  the shuttle at the palm). The pickup's last walk is seen mid-push.
- A shuttle-follow was rejected (it drops the frame to the floor with the
  landing and slices both heads); a receiver-follow at 1.3 keeps y 0 but centres
  x at 0 and crops the set, and at higher zooms it slices the server's head.

## The prop's draw plane — a defect, fixed

A `held-by` prop used to be staged at its holder's plane + 2 and nothing
recomputes a staged plane on release, so a prop that *starts* held was drawn
above every actor for the whole shot. The fix makes a `held-by` object return
its own plane (35) and lets the renderer's per-frame hold plane do the rest; two
tests pin it and fail before the fix. The per-frame evidence and the
`episodes/a-badminton` drawing-identical check are in
[the ticket](../../evidence/tickets/S-A2-RALLY.md).

## The return's force

The return is the serve's arc mirrored — `force 1.0` over `forceSec 0.16`,
`[533,-447]` — and it stays in frame (settle x 1388 inside the 1920 stage).
Softer and harder impulses were measured and rejected at the bake
([the ticket](../../evidence/tickets/S-A2-RALLY.md)).

## What the shot cannot have

- **No racket swing, and the receiver has no racket.** `swing.grip`/`release`
  are undeclared (slice B) and the only racket is the server's off hand (R7), so
  both contacts are the bare-hand strike the motor can bake. The off-hand carry
  holds it HANGING head-down at his side (R9): upright, the correctly-sized
  racket's hoop stood at head height and inked across his face in this shot's
  medium two-shot; the carry now keeps the hoop at knee height and its hand
  clear of the floor
  ([8_MOTOR](../../docs/8_MOTOR.md), "Prop placement (one authority)"). In the medium
  two-shot the server's serve follow-through arm is visibly extended while the
  shuttle is at the receiver's hand; the arm recovers on its own ~0.7 s ramp.
- **One elevation only** (40°); the return differs from the serve only in
  direction.
- **The shuttle draws at its declared size** (R4's `stageWidth` 116 → scale 0.58,
  ~1.4× real). The kept r4 rendition predates R9, when a motor-driven prop drew
  at scale 1, so that video shows it at 2.4× real; the rule is
  [8_MOTOR](../../docs/8_MOTOR.md) "Prop placement (one authority)".
- **The return passes behind the server.** With the fixed plane the free shuttle
  draws at plane 35, so as the return crosses him the server's body (50) hides
  it for a couple of frames (`stills/t3.300.png` shows it in flight during the
  pull-back). This is the accepted depth model; it is not ink on a face.
- **The medium two-shot cuts the players at the shins.** At z 1.3 the frame is
  554 world px tall, so the feet leave the frame for the contact insert; the
  pull-back to the wide restores the full court for the landing.

## Renditions

| directory | what it decided |
| --- | --- |
| `artifacts/sa2-r4-2026-10-27/` | **current.** 1280×720, 24 fps, 108 frames, 4.50 s; video sha256 `115e61d5…`. The r3 reviewer's NOT SATISFIED answered: a punch-in on the receiver held through the contact, a pull back to the wide, a 0.333 s tail, and the contact-gap measurement. |
| `artifacts/sa2-r3-2026-10-27/` | **superseded, kept.** 119 frames, 4.96 s; video sha256 `4f9e565c…`. Court-distance staging, the accepted pickup and serve, cue 2.210 s, no camera track; the rendition the blind review refused. |
| `artifacts/sa2-r2-2026-10-27/` | **superseded, kept.** 119 frames, 4.96 s; video sha256 `9c3f8530…`. Same shot as r3 with its contact still one frame late; a re-render moved the video hash. |
| `artifacts/sa2-r1-2026-10-27/` | **superseded, kept.** 66 frames, 2.75 s; video sha256 `67da56dc…`. The close (288 px) staging and the `held-by` start; its stills are the evidence of the plane defect. |

`bake-identity.json` is the one home of each rendition's identity; each names
its stills and the command that cuts them. A rendition is superseded, never
overwritten.

```bash
npm run anim -- check episodes/a-rally/episode.yml      # exit 0
npm run anim -- make episodes/a-rally/episode.yml       # exit 0, zero motor warnings
npm run anim -- render-yaml episodes/a-rally/episode.yml
bash episodes/a-rally/artifacts/sa2-r4-2026-10-27/verify.sh   # exit 0, cuts 5 stills
node tools/prop-track.mjs episodes/a-rally/performance.json shuttle
```

`episodes/a-rally/dist/` is the renderer's build output and is not tracked: the
hand-off deletes it. `git check-ignore -v episodes/a-rally/dist/a-rally.mp4`
answers `.gitignore:32:!episodes/*/dist/*.mp4` — a negation, i.e. that path is
*not* ignored, so it must not be staged.

## Reviews

Not yet reviewed. See [REVIEWS](REVIEWS.md).
