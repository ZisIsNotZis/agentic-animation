# S-A1 review 3 — the D1 wrapper's rendition, refused on the shot

The verdict verbatim of a fresh blind reviewer (`reviewer`, run `aad0eadc`, 2026-10-23) on
`episodes/a-badminton/artifacts/sa1-d1w-2026-10-21/`. Contract: the four stills and
`episode.mp4`, one question — does the shot deliver a badminton serve that reads: a shuttle
struck from the server's own hand, its arc, its bounce and its rest on the court floor, a
camera that follows it, and a net standing between the two players. Nothing else was given:
not this tree's docs, not the bake identity, not the motor's numbers, not the producer's
reasoning. It read only the named files and frames decoded from that video, and changed
nothing.

**Verdict: FAIL.** Its text, unedited:

> I read only the four named stills and the video (plus, to measure them, frames decoded from
> that video). No other file was opened; nothing was changed.
>
> **Verdict: FAIL.** This shot does not deliver a badminton serve.
>
> ## What the artefacts actually are
>
> - `stills/t2.208.png`, `t2.375.png`, `t2.500.png`, `t2.917.png`: PNG IHDR **852×480**, not
>   the 1280×720 stated. Judged at their natural 852×480.
> - `episode.mp4`: AV1, **852×480**, 132 frames, 24 fps, 5.500 s.
> - `stills/` also holds three stray byte-identical duplicates: `.500.png` = `t2.500.png`,
>   `.917.png` = `t2.917.png`, `375.png` = `t2.375.png`.
> - The stills are exact video frames except one (finding 10).
>
> ## Findings — defects of the shot
>
> **1. There is no serve. The shuttle is airborne before the shot starts and nothing ever
> strikes it.** At t=0.000 (frame 1) the shuttle is already free-falling over the empty near
> court at bbox x[438,480] y[250,309], its nearest player pixel 111.7 px away. In every frame
> I read (1, 5, 30, 38, 45, 50, 54, 60, 68, 78, 132 and the four stills) no racket appears in
> either player's hands — I checked the right player's hands at their closest approach
> (t=2.208, hand skin at x 458–465, y 152–173: only a ~5×10 px dark blob at x 466–470, no
> shaft, no head). No hand ever contacts the shuttle.
>
> **2. The only body contact is a shoulder clip, and it is not an impulse.** `stills/t2.208.png`
> and t=2.208–2.292 (frames 54–57): the shuttle's black outline at x 440–446 sits against the
> right player's blue shirt at x 439+ (gap 0 px; 1 px at t=2.042). The shuttle's velocity does
> not change across that moment (rise ~4–6 px/frame before and after, apex at t=2.333). It is
> not a struck shuttle.
>
> **3. The shuttle never crosses the net.** Its whole flight is on the camera side of the net.
> At t=2.208 the shuttle's white fill reads 242–249 in rows y 126–136 at x 436, where the net's
> top tape reads 212 elsewhere (x 470–560) — the shuttle is drawn in front of the tape. At
> t=2.667 it sits in front of the mesh (bbox x[369,416] y[148,214]). The far half of the court
> is empty in all 132 frames. A serve that never crosses the net is not a serve.
>
> **4. There is no arc: the path is a slow sag, a short rise, a fall, then a sideways glide.**
> Shuttle bottom y: 309 (t=0.000) → 311 (t=0.167) → 301 (t≈1.417) — it *descends* for the first
> 1.4 s with nothing acting on it; then rises to apex y_top 96 at t=2.333 (~9.4 px/frame); falls
> to y 282 by t=2.917; then travels x 341→230 at a near-constant y≈238–252 from t=2.833 to
> 3.708. Not a projectile arc over a net — a floating sprite that sags, bobs and slides.
>
> **5. There is no bounce.** The path shows no reversal at floor level; after the single landing
> the shuttle slides ~111 px sideways at floor height (t=2.833–3.708). No impact, no rebound, no
> contact shadow anywhere under the shuttle.
>
> **6. "Rest" is a completely frozen frame, not a settle.** Last shuttle motion t=3.708 (frame
> 90). Frames 98–132 (**t=4.042–5.458, 35 frames, 1.42 s**) are pixel-identical; the camera had
> already stopped at t=3.417. Nothing settles, wobbles or rolls. The shuttle's rest bbox is
> x[215,262] y[220,287] — straddling the mat's left edge (mat edge x≈245 at y=287), i.e. at the
> sideline by the umpire's chair, not clearly on the court.
>
> **7. The camera does not follow the shuttle.** Phase-correlated pan (px/frame): a constant
> **(+2,−1)** from t=0.042 to 2.167 — while the shuttle moves the *opposite* way (screen centre
> x 459→399); then an instantaneous reversal to **(−11, 0)** at t=2.208 for 8 frames; static
> 2.583–2.792; vertical jolts of **+17/+25/+18 px** at 2.833–2.917, dead stop, **−8/−9/−7/−4/−2**
> at 3.000–3.167, stop, **+2/+5/+7/+9/+7** at 3.250–3.417; then **no camera motion at all for
> the last 2.04 s**. Net camera displacement over the shot is ≈(−1, +12) px, while the subject
> swept 220 px left and ends in the left third of the frame. A subject-relative follow never
> happens; the moves are unmotivated snaps with no easing.
>
> **8. The net does not stand between the two players.** Both players occlude the net's top
> tape: at t=2.208 the tape (brightness 212, rows y 126–142) is absent at x 242–267 (left
> player's blue torso) and x 438–464 (right player's torso), and present at x 270 and x 470–560.
> Yet the mesh line rows y 146–149 (236–241) are drawn across both bodies. Both figures have the
> same apparent torso height (91 px, and 90/91 px at t=5.458) and their boots sit on the net's
> base line y≈215. So both stand on the camera side of the net, equidistant, and neither is on
> the far court. There is no receiver anywhere in the shot. The net's depth compositing is also
> internally contradictory (tape behind the players, mesh in front of them).
>
> **9. The right player's body leaves the floor and lies horizontally in mid-air.** Blue-pixel
> bbox: t=1.208 y[167,201] (h=34), t=1.542 y[185,207] (h=22, x 400–446), t=1.833 y[126,201]
> (h=75), back upright by t=2.208 (y[92,183], h=91). From t≈1.2 to 1.9 s he is a horizontal band
> 8–30 px above the net's floor line (y≈215), unsupported, with no serve motion and no racket.
> This is the only "action" in the shot and it reads as levitation.
>
> ## Findings — not defects of the shot (limits I accept, and evidence notes)
>
> - **10. Evidence, not shot:** `stills/t2.917.png` is bit-identical to video frame 72
>   (t=2.9583), not frame 71 (t=2.9167; mean abs diff 0.64, max 219). It is 41.7 ms late and
>   shows the camera state right after the +18 px jolt.
> - **11. Contract, not shot:** stills and video are 852×480, while the brief says 1280×720.
> - **12. Style limits I would accept:** flat 2-D illustration, sprite shuttle with a fixed
>   silhouette and tip always down (bbox ≈43–47 × 59–67 px throughout; no tumble, no
>   foreshortening, no squash), static scoreboard 11:08, empty hall, no motion blur, no contact
>   shadows in the style at all.
