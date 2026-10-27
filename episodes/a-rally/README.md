# a-rally — one serve, one return, as a shot

Milestone **S-A2** of the asset programme: the accepted serve of
`episodes/a-badminton` and the rally R8 made authorable, in one shot. The same
hall and set, two `figure/athlete_a` bodies, `prop/shuttle`, `prop/racket` in
the server's **left** hand (R7). `episode.yml` is the authored input; this note
holds what the bake and the render measured, so the next session does not
re-derive it.

Audio is ellipsis-only silence: no TTS, no network. The observation is the
shuttle's two arcs and the two contacts.

## What the shot does

`make` (exit 0, **zero motor diagnostics**) bakes a 4.96 s performance (119
frames at 24 fps) with:

```json
[{"kind":"projectile.struck","prop":"shuttle","at":2.207,"velocity":[-533,-447]},
 {"kind":"projectile.struck","prop":"shuttle","at":2.590,"velocity":[533,-447]},
 {"kind":"projectile.settled","prop":"shuttle","at":4.075,"position":[1387.94,691]}]
```

- **The serve is the accepted one, exactly.** The accepted preamble: the
  pickup (the crouched palm), then the strike at 2.207 s, 40.00°, 697 px/s. The
  shot keeps a-badminton's pickup because the accepted serve's *low* strike is
  what the crouch gives; a shuttle started `held-by(server)` is struck 84 px
  higher and its ink reaches the chin ([evidence](../../evidence/tickets/S-A2-RALLY.md)).
- **The return** is the receiver meeting the descending shuttle at 2.590 s and
  striking it back on the serve's arc mirrored: 40.00°, `[533,-447]`, 697 px/s
  (force 1.0 over forceSec 0.16). The contact is at (864, 347) — the shuttle's
  cork — with the receiver's hand at its rest height (y 353); the contact still
  is the last baked frame before the launch, `stills/t2.583.png` (frame 61;
  `projectile.struck` is recorded at 2.590 s, between frames 61 and 62).
- **The return's flight** runs to its rest at 4.075 s on the hall's painted
  floor line, to the server's right.

`grep -c 'motor warning' artifacts/sa2-r3-2026-10-27/make.log.txt` is 0; an
empty `motor.diagnostics` is the bake's encoding of "no diagnostics".

## The staging: court distance

| actor | staged at | ground | scale | z |
| --- | --- | --- | --- | --- |
| server | 0.65 → x 1246 | 0.602 → 650 | 0.88 | 50 |
| receiver | 0.35 → x 672 | 0.57 → 615.6 | 0.722 | 40 (behind the net's 45) |

**574 px apart** — the accepted shot's court distance, not r1's 288. The
receiver stays on the accepted `background` lane; R8's interception walks him
the 102 px to the descending shuttle (672 → 774) and meets it. The net's mesh is
drawn over the receiver's legs (inspect `stills/t1.900.png`), so the depth reads
as two sides of a court.

r1 staged the receiver at `entrance: center` (960) because it measured no
reachable mark at the background lane *for a cue 0.54 s after the strike* — the
shuttle had already dropped below that shoulder. With the cue at 0.010 s after
the serve's cue the walk has the whole flight, and the background lane is
reachable; the band below is its own measurement.

## The cue band, measured for this staging

The receiver's push is the second strike; its cue is the beat it sits on. R8's
0.26 s band was measured on the EP fixture (receiver x 1500) and does not
transfer, so the shot has its own sweep ([full table](../../evidence/tickets/S-A2-RALLY.md)):

- **The band with empty diagnostics is 2.205–2.465 s = 0.260 s**, every cue in
  it landing a second `projectile.struck` on the serve's mirrored arc
  `[533,-447]`. Two later cues (2.470, 2.480) still land but raise a whole-body
  refusal on the receiver's follow-through; 2.490 and later are the named miss.
- **The chosen cue is 2.210 s** — 0.010 s after the serve's cue, the highest
  contact in the band: the meeting is (864, 347) at the shuttle's cork and the
  hand's rest height, where by 2.465 it has dropped to (797, 417) at his shin.
- **How the cue is authored.** The DSL has no explicit cue time: a beat happens
  where it sits in the cursor, and the cursor advances by the durations before
  it. The receiver's push therefore sits on its own beat 10 ms after the serve's
  cue — a `movement.to(receiver, receiver)` no-op with `durationSec: 0.010`,
  because state calls advance no cursor and a `…` beat is 0.55 s. Putting both
  pushes on one cue was measured and silently drops the return ([why](../../evidence/tickets/S-A2-RALLY.md)).

## The prop's draw plane — a defect, fixed

r1's stills showed the shuttle over the server's mouth/chin (held) and over his
chest (in flight). The cause was mechanical: `staging/index.ts` `held-by` wrote
the holder's plane + 2 into the compiled object plane, and nothing recomputes a
staged plane on release, so a prop that *starts* held was drawn above every
actor for the whole shot. The renderer already raises a prop to its holder's
plane only while the bake reports a hold, so the fix is one line: a `held-by`
object keeps its own plane (35) and the renderer's per-frame rule does the rest.
Two tests pin it and fail before the fix (`staging.test.ts`,
`figureArtwork.test.ts`); the per-frame evidence and the check that
`episodes/a-badminton` is drawing-identical are in
[the ticket](../../evidence/tickets/S-A2-RALLY.md).

## The return's force

The return is the serve's arc mirrored — `force 1.0` over `forceSec 0.16`,
`[533,-447]` — and it stays in frame (settle x 1388 inside the 1920 stage).
Softer and harder impulses were measured and rejected at the bake:
[the ticket](../../evidence/tickets/S-A2-RALLY.md).

## The camera

No camera track: the composition's full-stage wide (zoom fit 0.667) for the
whole shot.

- A `camera.follow(shuttle, 0.75)` drops the frame with the shuttle to the floor
  when the return lands (frame top world y 120 vs head tops at y 50) and slices
  **both** heads from the descent on.
- A `camera.follow(receiver, 0.75)` keeps y 0 (no cut) but at this staging
  centres x at 0 and crops the set's right edge, and its first key loses to the
  composition key at frame 0 — a one-frame wide-to-follow jump.
- The wide keeps the whole court, the net and both heads in every frame; the
  action is smaller but legible at 1280×720 (the rendition's stills are cut from
  it and were inspected at full resolution).

## What the shot cannot have

- **No racket swing, and the receiver has no racket.** `swing.grip`/`release`
  are undeclared (slice B) and the only racket is the server's off hand (R7), so
  both contacts are the bare-hand strike the motor can bake.
- **One elevation only** (40°); the return differs from the serve only in
  direction.
- **The shuttle is drawn at 2.4× real size** (R4's `stageWidth` 116 floor, the
  motor-driven prop drawn at scale 1) — a recorded, accepted limit.
- **The return passes behind the server.** With the fixed plane the free shuttle
  draws at plane 35, so as the return crosses him the server's body (50) hides
  it for ~2 frames around 3.0 s (a still there shows no shuttle at all, which is
  why the flight still is cut at its apex, 2.800 s). This is the accepted depth
  model (a-badminton's free shuttle is behind the receiver's shoe); it is not
  ink on a face.
- **The receiver's lane is the accepted background one**, and the pair is 574 px
  apart only because the cue is early enough for R8's walk; a later cue shrinks
  the walk and the band ends at 2.465 s.

## Renditions

| directory | what it decided |
| --- | --- |
| `artifacts/sa2-r3-2026-10-27/` | **current.** 1280×720, 24 fps, 119 frames, 4.96 s; video sha256 `4f9e565c…`. Court-distance staging, the accepted pickup and serve, the return at cue 2.210 s, the prop draw-plane fix and its tests, no camera track. Its stills are five: pickup, serve, **contact at 2.583 s (frame 61)**, flight at the apex, settle. |
| `artifacts/sa2-r2-2026-10-27/` | **superseded, kept.** 119 frames, 4.96 s; video sha256 `9c3f8530…`. Same shot as r3 but its contact still was cut at 2.600 s (frame 62, after the launch) and its episode predates the final timing comment; a re-render moved the video hash (render non-determinism across runs), so r3 supersedes it instead of overwriting it. Its `verify.sh` verifies its own video and reports `episode.yml` moved, expected for a superseded identity. |
| `artifacts/sa2-r1-2026-10-27/` | **superseded, kept.** 66 frames, 2.75 s; video sha256 `67da56dc…`. The close (288 px) staging and the `held-by` start; its stills are the evidence of the plane defect (shuttle ink on the server's chin/chest) and were rejected. |

`bake-identity.json` is the one home of each rendition's identity; each names
its stills and the command that cuts them. A rendition is superseded, never
overwritten.

```bash
npm run anim -- check episodes/a-rally/episode.yml      # exit 0
npm run anim -- make episodes/a-rally/episode.yml       # exit 0, zero motor warnings
npm run anim -- render-yaml episodes/a-rally/episode.yml
bash episodes/a-rally/artifacts/sa2-r3-2026-10-27/verify.sh   # exit 0, cuts 5 stills
node tools/prop-track.mjs episodes/a-rally/performance.json shuttle
```

`episodes/a-rally/dist/` is the renderer's build output and is not tracked: the
hand-off deletes it. `git check-ignore -v episodes/a-rally/dist/a-rally.mp4`
answers `.gitignore:32:!episodes/*/dist/*.mp4` — a negation, i.e. that path is
*not* ignored, so it must not be staged.

## Reviews

Not yet reviewed. See [REVIEWS](REVIEWS.md).
