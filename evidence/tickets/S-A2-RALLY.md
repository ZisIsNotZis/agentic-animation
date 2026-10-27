# S-A2 · the rally, as a shot — the measured record

Working evidence for milestone S-A2 (`docs/0_ROADMAP.md` §Slice A packages). The
shot's own home is [`episodes/a-rally/README.md`](../../episodes/a-rally/README.md)
(what it bakes, what it cannot do, the commands); this ticket holds the tables
that are too long for it: the full cue sweep, the per-frame draw-plane evidence,
and the force and staging branches that were rejected.

Rendition under review: `artifacts/sa2-r3-2026-10-27/` (video sha256
`4f9e565c…`, episode sha256 `04b0ac96…`, 1280×720, 24 fps, 119 frames,
4.96 s). Events: serve 2.207 s `[-533,-447]`, return 2.590 s `[533,-447]`,
settle 4.075 s `[1387.94, 691]`, zero motor diagnostics.

## 1 · The cue sweep for this staging

Receiver on the accepted `background` lane (x 672, scale 0.722, arm envelope
113 px), 574 px from the server (x 1246). A row is "in the band" when a second
`projectile.struck` lands with empty `diagnostics`.

| receiver cue (s) | second `projectile.struck` | contact (x, y) | motor diagnostics |
| --- | --- | --- | --- |
| 2.205 | 2.581 | (849, 357) | `[]` |
| **2.210** | **2.590** | **(864, 347)** | **`[]`** |
| 2.220 | 2.590 | (864, 347) | `[]` |
| 2.250 | 2.608 | (849, 359) | `[]` |
| 2.300 | 2.633 | (843, 368) | `[]` |
| 2.350 | 2.650 | (826, 383) | `[]` |
| 2.400 | 2.674 | (823, 392) | `[]` |
| 2.450 | 2.692 | (806, 408) | `[]` |
| 2.460 | 2.700 | (797, 417) | `[]` |
| 2.465 | 2.700 | (797, 417) | `[]` |
| 2.470 | 2.708 | (788, 427) | `whole-body proposal exhausted: receiver at 2.883s; segment-angle-rate/hand_r 7.765 > 7.000` |
| 2.480 | 2.708 | (788, 427) | `whole-body proposal exhausted: receiver at 2.875s; joint-rate/elbow_r 6.872 > 6.000` |
| 2.490, 2.500, 2.550, 2.600 | — | — | `strike missed: receiver never touched shuttle; a struck contact needs the prop inside the 113 px arm envelope — stage it held or in flight, not on the floor` |

The band with empty diagnostics is **2.205–2.465 s = 0.260 s**. The 2.470 and
2.480 cues still land a strike but raise a whole-body refusal on the follow-
through, so they are outside it. 2.490 and later are the named miss. The chosen
cue is 2.210 s: the highest contact in the band (the shuttle's cork at the
hand's rest height); by 2.465 the contact has dropped to the receiver's shin.
Every landing returns on the serve's mirrored arc `[533,-447]`.

## 2 · The prop's draw plane, before and after

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

## 3 · Branches rejected

| what was tried | what the number showed |
| --- | --- |
| receiver on the accepted `background` lane with a cue 0.54 s after the strike (r1's first probe) | no reachable mark at that shoulder: the shuttle had already dropped below it — the cue, not the lane, was wrong |
| receiver at `entrance: center` (pair 288 px) | reachable, but the two follow-through arms read as a high five and the contact hand is hidden behind the shuttle — rejected by the manager, which is why the lane went back to `background` |
| starting the shuttle `held-by(server)` (no pickup, r1) | the held shuttle's ink covers the server's chin and the strike is 84 px above the accepted low strike; the pickup preamble was restored |
| both pushes on the serve's own cue (one brace group) | one strike only — the serve at 2.205 s, settling at 477.11 — with `motor.diagnostics` **empty**: the second push is silently dropped while the shuttle is still held by another actor. With the receiver's push first, the bake loses the serve and raises `strike missed: server never touched shuttle; …` |
| return `force 1.0 / forceSec 0.10` | lands at 1115 and settles 1210 — a soft drop; the full 0.16 returns the serve's own arc and settles 1388 |
| return `force 1.2 / forceSec 0.16` | settles 1776, near the stage edge, and faster than the accepted serve with no reason |
| `camera.follow(shuttle, 0.75)` | the frame drops with the shuttle to the floor when the return lands (top at world y 120 against head tops at 50) and slices both heads from the descent on |
| `camera.follow(receiver, 0.75)` | keeps y 0 but centres x at 0, crops the set's right edge, and its first key loses to the composition key at frame 0 — a one-frame wide-to-follow jump |

## 4 · What the shot records as limits

- One elevation (40°) for both strikes; the return is the serve's arc mirrored.
- No racket swing (slice B), and the receiver carries no racket, so both
  contacts are bare-hand strikes.
- The shuttle is drawn at 2.4× real size (R4's `stageWidth` 116 floor).
- The free shuttle draws at plane 35, so the return is hidden behind the
  server's body for about two frames around 3.0 s — the accepted depth model,
  not ink on a face.
- The receiver's lane is the accepted `background` one; the walk R8 solves is
  102 px, and the band closes at 2.465 s when the contact reaches his shin.

## 5 · Commands

| command | result |
| --- | --- |
| `npm run anim -- check episodes/a-rally/episode.yml` | exit 0 |
| `npm run anim -- make episodes/a-rally/episode.yml` | exit 0, zero motor warnings |
| `npm run anim -- render-yaml episodes/a-rally/episode.yml` | exit 0, 119 frames |
| `bash episodes/a-rally/artifacts/sa2-r3-2026-10-27/verify.sh` | exit 0, five stills cut |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 349 pass, 0 fail |
| `git diff --check` | clean |
