# S-A2 · the rally, as a shot — the measured record

Working evidence for milestone S-A2 (`docs/0_ROADMAP.md` §Slice A packages). The
shot's own home is [`episodes/a-rally/README.md`](../../episodes/a-rally/README.md)
(what it bakes, what it cannot do, the commands); this ticket holds the tables
that are too long for it: the full cue sweep, the per-frame draw-plane evidence,
the contact-gap measurement, the camera keys and the branches that were
rejected.

Rendition under review: `artifacts/sa2-r4-2026-10-27/` (video sha256
`115e61d5…`, episode sha256 `b1bf6010…`, 1280×720, 24 fps, 108 frames,
4.50 s). Events: serve 2.307 s `[-533,-447]`, return 2.680 s `[533,-447]`,
settle 4.167 s `[1387.94, 691]`, zero motor diagnostics. The shot ends 0.333 s
after the settle.

## 1 · The cue sweep for this staging

Receiver on the accepted `background` lane (x 672, scale 0.722, arm envelope
113 px), 574 px from the server (x 1246). A row is "in the band" when a second
`projectile.struck` lands with empty `diagnostics`. The camera's beat sits
before the serve (1.65–2.30 s), so the serve cue is 2.300 s (struck 2.307 s) and
the whole sweep is r3's +0.100 s.

| receiver cue (s) | second `projectile.struck` | contact (x, y) | motor diagnostics |
| --- | --- | --- | --- |
| 2.305 | 2.672 | (864, 344) | `[]` |
| **2.310** | **2.680** | **(864, 347)** | **`[]`** |
| 2.320 | 2.690 | (854, 352) | `[]` |
| 2.350 | 2.708 | (839, 364) | `[]` |
| 2.400 | 2.733 | (835, 371) | `[]` |
| 2.450 | 2.750 | (817, 388) | `[]` |
| 2.500 | 2.774 | (813, 397) | `[]` |
| 2.550 | 2.792 | (815, 402) | `[]` |
| 2.565 | 2.800 | (806, 410) | `[]` |
| 2.572 | 2.800 | (806, 410) | `[]` |
| 2.580 | 2.800 | (806, 410) | `[]` |
| 2.585 | 2.808 | (798, 420) | `[]` |
| 2.590 | 2.808 | (798, 420) | `[]` |
| 2.595, 2.600 | — | — | `strike missed: receiver never touched shuttle; a struck contact needs the prop inside the 113 px arm envelope — stage it held or in flight, not on the floor` |

The band with empty diagnostics is **2.305–2.590 s = 0.285 s**; 2.595 and later
are the named miss. The chosen cue is 2.310 s: the highest contact in the band
(the shuttle's cork at the hand's rest height); by 2.590 the contact has dropped
to the receiver's shin. Every landing returns on the serve's mirrored arc
`[533,-447]`. r3's band (2.205–2.465 s, with whole-body refusals at 2.470/2.480)
was measured before the camera existed; those refusals do not reproduce here
because the receiver's push declares its presentation end at 2.91 s.

## 2 · The contact, measured

At the contact frame (64, 2.667 s), from the bake:

| quantity | value |
| --- | --- |
| receiver's drawn hand (reach) | (808, 340) |
| hand ink radius (9.5 design px × 0.722) | 6.9 stage px |
| shuttle's drawn body box (`x0,x1,y0,y1`, world) | 792, 888, 232, 366 |
| hand centre → box | **inside the box** |
| hand ink overlap with the box | **6.9 px, at the cork end** |
| one frame earlier (2.625 s) | centre 11.4 px from the box, ink 4.5 px short |

The reviewer's "~30 px from the shuttle's skirt" is the hand-to-skirt distance
*after* the launch (2.60–2.70 s), not the contact: the skirt's wide end is
~108 px above the hand at the contact. The drawing touches the cork; what did
not read was the contact's size in the full-stage wide, which the camera buys.

## 3 · The camera keys

| call | interval (s) | value / framing |
| --- | --- | --- |
| composition (no call) | 0.000–1.650 | x 0, y 0, z 0.667 (full stage) — the pickup, frame 0 included |
| `camera.punch_in(receiver, 1.3)` | 1.650–2.300 | push from z 0.667 to the fitted pair: x 491, y 0, z 1.3 (`fitPushCamera` fits the staged pair horizontally, the head rule moves y to 0) |
| hold (inside `punch_in`) | 2.300–2.910 | x 447, y 0, z 1.3 — holds through the serve, the contact (2.680) and the first part of the return |
| `camera.wide()` | 2.910–3.710 | pull to x 0, y 0, z 0.72 — the full court for the landing and the tail |

Verified per frame through `evaluatePerformance` over all 108 frames: **0 drawn
head slices** (server head 49.8–199.4, receiver 123.2–245.9 world), **0 frames
with the shuttle's ink outside the frame**, and frame 0 is the composition wide
(no wide-to-follow flash).

## 4 · The prop's draw plane, before and after

`staging/index.ts` `held-by` wrote `z = (target.z ?? 40) + 2` into the compiled
object plane, and nothing recomputes a staged plane when a prop is released, so
a prop that *starts* held was drawn above every actor for the whole shot. The
renderer's `PerformanceEpisode.propPlane` already raised a prop to its holder's
plane only while the bake reports a hold; the compiled plane was the wrong half.
The fix makes a `held-by` object return its own plane (35) and lets the
renderer's per-frame hold plane do the rest, so "picked up mid-shot" and
"started in hand" are one mechanism.

| frame | t (s) | server holds | shuttle drawn plane, r1 (before) | a-badminton control (staged `center`) |
| --- | --- | --- | --- | --- |
| 0 | 0.000 | shuttle | 50 (holder) | 35 (own plane) |
| 13 | 0.542 | shuttle | 50 (holder) | 35 |
| 14 | 0.583 | — (struck) | **52 — above the server (50)** | — |
| 27 | 1.125 | — | **52** | — |
| 43 | 1.792 | (a-badminton picks up) | — | 50 (holder) |
| 53 | 2.208 | (a-badminton free) | — | 35 |
| 90 | 3.750 | — | — | 35 |

Tests pinning it, both failing before the fix: `packages/core/test/staging.test.ts`
("a held-by object keeps its own free plane; the hold plane is the renderer's
per-frame decision") and `packages/studio/test/figureArtwork.test.ts` ("a prop
staged held-by draws on its holder plane while held and on its own plane once
released"). `episodes/a-badminton` was checked drawing-identical across the fix:
a 2.1 s render byte-identical (`sha256 5b10912a…`), and frames at 1.5 s and
1.9 s pixel-identical (max channel diff 0).

## 5 · Branches rejected

| what was tried | what the number showed |
| --- | --- |
| receiver on the accepted `background` lane with a cue 0.54 s after the strike (r1's first probe) | no reachable mark at that shoulder: the shuttle had already dropped below it — the cue, not the lane, was wrong |
| receiver at `entrance: center` (pair 288 px, r1) | reachable, but the two follow-through arms read as a high five and the contact hand is hidden behind the shuttle — rejected by the manager, which is why the lane went back to `background` |
| starting the shuttle `held-by(server)` (no pickup, r1) | the held shuttle's ink covers the server's chin and the strike is 84 px above the accepted low strike; the pickup preamble was restored |
| both pushes on the serve's own cue (one brace group) | one strike only — the serve, settling at 477.11 — with `motor.diagnostics` **empty**: the second push is silently dropped while the shuttle is still held by another actor. With the receiver's push first, the bake loses the serve and raises `strike missed: server never touched shuttle; …` |
| return `force 1.0 / forceSec 0.10` | lands at 1115 and settles 1210 — a soft drop; the full 0.16 returns the serve's own arc and settles 1388 |
| return `force 1.2 / forceSec 0.16` | settles 1776, near the stage edge, and faster than the accepted serve with no reason |
| `camera.follow(shuttle, 0.75)` | the frame drops with the shuttle to the floor when the return lands (top at world y 120 against head tops at 50) and slices both heads from the descent on |
| `camera.follow(receiver, 0.75)` | keeps y 0 but centres x at 0, crops the set's right edge, and its first key loses to the composition key at frame 0 — a one-frame wide-to-follow jump |
| the punch-in starting on the serve's cue (2.30, nonblocking) | its 0.65 s push lands at 2.95, so the contact at 2.68 happens mid-push (z ≈ 1.05) — the contact is not held in the pushed framing |
| a receiver-follow at z 1.3–1.46 for the contact | its y is 92 at z 1.3, so the server's head (50–200) is sliced; at 1.46 it frames the receiver alone but drops the return's landing out of frame |
| a punch-in at z 1.15 | `framedCentreY` leaves y at 56 and slices the server's head (top 50); the pair fit with the head rule only works at the 1.3 chosen |

## 6 · The r3 review and what r4 answered

The blind review of `sa2-r3-2026-10-27` returned **NOT SATISFIED**
([verbatim](S-A2-REVIEW.md)). Its picture findings and r4's answer:

| finding | r4's answer |
| --- | --- |
| the far player's hand ~30 px from the shuttle's skirt; the reversal has "no visible contact" | measured: the drawn hand's centre is inside the shuttle's body box at the contact frame (ink overlap 6.9 px at the cork); the ~30 px reading is post-launch/to the skirt. The camera now makes the contact the subject (z 1.3, its still `t2.667`). |
| the near player's open palm "reads as a wave" | the arm is the serve's follow-through on its recipe's ~0.7 s recovery; the medium two-shot shows it as a follow-through at 127 px from the shuttle rather than a gesture filling the frame. Not otherwise addressed (the push recovery is the motor's). |
| both players planted on one half-court / the net geometry | the set's painted court and the staging are unchanged (a recorded limit: the net is a depth layer and the far side is not painted). The contact insert cuts the feet; the let-go restores the wide. |
| the shuttle 4–5× life size, never rotating | recorded limits (R4's `stageWidth` 116 floor; no angular rigidbody). |
| the serve has no racket contact; 1.9 s of stooping | slice B (no swing) — the pickup and palm strike are the accepted serve. |
| the shuttle passes through the near player at 2.85–3.05 s | the free shuttle draws at plane 35, behind the server (50); it is occluded, not in front. |
| the tail from 4.12 s to the end frozen (20 frames) | r4 ends 0.333 s after the settle (4.50 vs the settle at 4.167). |

## 7 · What the shot records as limits

- One elevation (40°) for both strikes; the return is the serve's arc mirrored.
- No racket swing (slice B), and the receiver carries no racket, so both
  contacts are bare-hand strikes.
- The shuttle is drawn at 2.4× real size (R4's `stageWidth` 116 floor) and has
  no angular rigidbody, so it keeps its upright orientation in flight.
- The free shuttle draws at plane 35, so the return is hidden behind the
  server's body for a couple of frames during the pull-back.
- The receiver's lane is the accepted `background` one; the walk R8 solves is
  ~100 px, and the band closes at 2.590 s when the contact reaches his shin.
- The medium two-shot (z 1.3) cuts the players at the shins; only the wide
  shows the full court, which is why the shot pulls back for the landing.

## 8 · Commands

| command | result |
| --- | --- |
| `npm run anim -- check episodes/a-rally/episode.yml` | exit 0 |
| `npm run anim -- make episodes/a-rally/episode.yml` | exit 0, zero motor warnings |
| `npm run anim -- render-yaml episodes/a-rally/episode.yml` | exit 0, 108 frames |
| `bash episodes/a-rally/artifacts/sa2-r4-2026-10-27/verify.sh` | exit 0, five stills cut |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 349 pass, 0 fail |
| `git diff --check` | clean |
