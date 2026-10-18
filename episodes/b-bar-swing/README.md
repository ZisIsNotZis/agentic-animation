# b-bar-swing — what the bake measures, and the two limits it hits

Slice B's vertical: one giant swing on `set/outdoor_bar`, shot side-on, with
`figure/gymnast_b` and `figure/athlete_a` (two actors, staged scale 0.88).
`episode.yml` is the authored input; this note holds the measured numbers a
later slice needs so the reasoning is not re-derived from guesses.

Current state at the time of writing: `check` is OK, `make` bakes the episode
but the mount is refused (`segment-angle-rate/hand_r 172.388 > 35`), so the
bake's `rotation` channel is 0 on every frame — no turn.

## The framing limit: the circle is taller than the stage at two actors

The turn is rigid: the renderer turns the whole drawn body about the grip the
hands hold, which the motor bakes as a design point. Measured from the bake,
that point is (262, 46.755) in the 400×720 figure box, and the farthest drawn
point from it is the sole-box corner at (155, 714):

- orbit radius 675.77 design px, so the drawn circle is **1351.5 design px
  across**;
- at 2 actors (0.88) that is 1189.4 world px = 792.9 screen px at the widest
  legal zoom (z = 0.6667, and `clampCameraToStage` pins the camera to y 0 there,
  so the frame is exactly the 1080-world-px stage);
- the frame holds 1080 world px, so the circle is **109.4 world px (72.9 screen
  px) too tall at any bar or ground position** — not a placement problem;
- a whole circle needs k ≤ 720 ÷ (2 × 675.77 × 2/3) = **0.7991**. The staging
  ladder is 1 actor 0.92, 2 actors 0.88, 3 actors 0.70, 4+ actors 0.58, and a
  narrow episode's scene actor accepts only `facing`
  (`packages/core/src/schemas/narrowEpisode.ts:167`), so no other scale knob is
  authorable on this path — `framing`, `setup`, `entrance` and `prominence` are
  staging inputs the YAML route never sets. Two actors therefore cannot frame
  the turn, full stop.

## The standing line is not owned by the set

The staged standing line is `setupY()`'s default, 0.64 × 1080 = **691.2 world
px** (`packages/core/src/staging/index.ts:186`). The set's declared `ground`
support paints the same line (691) by coincidence, not by contract. Measured:
moving `set/outdoor_bar`'s ground support and its painted `data-support-top`
from 691 to 900 and re-running `make` left both actors standing at y 691.2
(the athlete's sole targets at 645.44 = 691.2 − 45.76) — the figure then stands
in mid-air over the painted floor.

With the drawn shoulder 487.8 design px above the standing line (measured from
the bake at the mount beat; the motor's own model reads 482 there, which is
where the "483" estimate came from) and a one-arm grip of 153 design px, a
fully framed circle needs the standing line at:

| staging | scale | circle fits? | standing line the circle needs |
| --- | --- | --- | --- |
| 1 actor | 0.92 | no — 1243.4 world px across | empty interval |
| 2 actors | 0.88 | no — 1189.4 world px across | empty interval ([1158.6, 1049.2]) |
| 3 actors | 0.70 | yes — 946.1 world / 630.7 screen | 921.6 … 1055.5 |
| 4+ actors | 0.58 | yes — 783.9 world / 522.6 screen | 763.6 … 1059.7 |

So even the scales whose circle fits need a standing line 72–363 px deeper than
the 691.2 the staging can produce. **A fully framed giant swing therefore needs
a declared standing support that drives the staged actor's y, together with at
least three actors in the shot.** Until the staging owns that datum, the honest
shot is the full stage with the top of the arc out of frame.

## The mount limit: the hand path and the placement slide pull opposite ways

The motor hangs a body from its own shoulder joint: `hang.x = pivot.x −
shoulderFromWaist.x × scale`, so the placement's sideways slide during a mount
equals the bar's x offset from the standing shoulder. Two gates then bound that
offset from both sides, and no bar position satisfies both:

- **Offset 0 (bar directly above him)** — the hand travels straight up from the
  hanging rest hand, through the shoulder (closest approach 4.0 px). The arm
  solve flips: `segment-angle-rate/hand_r 172.388 > 35.000`.
- **Offset 90, bar y 176** — the chord clears the shoulder, but the mount now
  slides 90 px sideways: `joint-rate/elbow_r 7.954 > 6.000` while the hand is
  still travelling.
- **Offset 118, bar y 196** — `segment-angle-rate/hand_r 7.915 > 7.000` at the
  takeover, i.e. 13 % over.
- **Offset 130, bar y 216** — near-full-extension grip, but the slide is 130 px:
  `joint-rate/elbow_r 7.954 > 6.000`.

Root cause is in the mount, not in the set: the hand travels a straight line at
`MOUNT_HAND_RATE` (480 px/s) and the placement glides a straight line at
`MOUNT_ROOT_RATE` (240 px/s), and the reach is only one bone long (141.9 world
px at 0.88). A wider chord (which needs a larger offset) and a gentler slide
(which needs a smaller one) cannot both be had. Closing this needs a motor-side
mount: an arced hand path that keeps outside the shoulder, or a placement glide
that slows when the pivot is offset from the standing shoulder. Widening either
gate would hide it rather than fix it.

## Evidence

`/tmp/b-swing2/` (never in Git): `measure-swing.mts` reads the compiled
`performance.json` through `evaluatePerformance`, maps the drawn silhouette
through `actorTurn`, and reports the rotation span, the grip error and the
swing's screen extents; `circle-envelope.mts` derives the orbit radius, the
per-scale circle diameter and the standing line each scale needs; `measure.json`
and `bake-identity.json` carry the numbers and the bake identity (frames,
duration, manifest and motor sha256, revision).
