# M6 film language

Roadmap row: "focus-driven camera, meaningful transitions, semantic audio cues
and restrained sound", accepted as "better explanation/rhythm in actual
audiovisual clips, not decorated slides". Progress is owned by [STATUS](../../docs/0_ROADMAP.md).

## What the milestone must show

A short episode whose camera moves **because attention moves**: a wide that
establishes, a push that lands on the beat's subject **before** that beat
happens, a hold while the subject acts, and a return to the wide when the unit
becomes the pair rather than the person. Each shot is chosen per beat; one
continuous drifting move is not film language.

A transition earns its place only by carrying meaning — a reveal, a time skip, a
change in who holds power — and is expressed with camera and cut decisions until
the engine has a transition primitive.

Audio is semantic and restrained: one accent per beating shot, silence where
nothing is happening, and every named cue must appear in the compiled
`audio.cues`. A cue that is named but unresolvable is a defect, not a detail.

## Vertical slice: `episodes/m6-film`

`episodes/m6-film/episode.yml` is the whole committed artefact. Shot ladder
against the base medium two-shot at z 1.0: establish 0.00–2.95; push onto the
actor at 2.95–3.60 completing before `prop.pickup` at 4.15 so the close frame is
held while the lift runs; hold through the sip beat; wide at 8.57–9.37 so the
pair is the unit while the other actor speaks; a 4.6× scale jump out of that wide
onto the prop at 11.27–12.47 (0.72 → 3.3, the insert's zoom authored at the beat,
not inherited from the recipe's person-push default) landing on `action.present`
and the reveal chime at 12.77; wide again at 14.72–15.52 so the closing line
shrinks the speaker. Cues:
`sip`, `reveal-chime`, `laugh`, `ending-cadence`, one per beating shot, other
shots deliberately silent.

## Framing rule: never slice a drawn head

A framed shot — one whose push or hold names an actor or an object — never cuts a
drawn head. The vertical placement must leave every drawn head either wholly
inside the frame or wholly outside it; when the frame's top or bottom edge would
cross a head, the placement moves to the nearer side that removes the
intersection, measured on the drawn head bounds the figure FK already produces,
so the rule follows the pose rather than a nominal standing band. Heads may be
pushed out of frame on purpose: an object insert showing counter and hands with
both heads above the top edge reads as a deliberate insert, while a sliced face
reads as a mistake. During the move into or out of such a shot the travelling
edge necessarily crosses the head; the rule governs the placement the shot lands
on and is held at.

Clearance is 24 world px beyond the drawn head's edge, and a placement the
painted stage cannot reach is rejected: when no legal placement clears every
head, the unshifted placement is kept rather than moving the frame off the stage.

### The camera viewport is the rendered frame (measured)

The camera maths and the renderer share one convention. `PerformanceFrame` applies
`scale(z) translate(-x, -y)` about the composition's top-left corner, so a stage
point lands at `z*(p - camera)` and the frame covers `video/z` world px with its
top edge at `camera.y`. Measured on the m6-film bake (500 frames, 1280x720) by
cutting declared set art out of the MP4 and reading its pixel row:

- 0.00 s, z 0.6667, camera (0, 0): counter front face top y430 at row 287
  (predicted 286.7), y660 at 440 (440.0), y690 at 460 (460.0).
- 5.90 s, z 1.35, camera (455.96, 42.50): y430 at row 524 (523.1); thermos ink
  y296.8 at 344 (343.3) and y420.3 at 511 (510.0).
- 13.10 s, z 3.3, camera (879.76, 315.19): the counter top surface's back edge
  y368 at row 169 (174.3) and its front edge y430 at 377 (378.9).

So the viewport is `video/z` at every zoom and there is no second convention to
reconcile. **Retracted: the ~12 % gap recorded here as open** ("~807/z tall",
"rendered top ≈295.6"). It came from dividing a declared prop band (125.5 world
px at z 3.3) by a measured pixel fraction (50.2 % of a 540 px still), which weighs
the drawn prop against its declared band, not the viewport against the frame.

### Open: drawn actors and props do not sit on their declared bands at z 3.3

In the 13.10 insert the set art is on its computed rows and the drawn flask is
not. Its light stripes (art y 61 and 84) render 76 px apart there — 23 art units
x 3.3, so the *scale* is right — but 49 px lower than the bands place them:
`propFrameBand` reports the flask's ink at y 296.7–420.2 while the drawing covers
≈311.6–435.1. The same prop and the same actor render exactly on their declared
rows at z 1.35, so this is neither a scale error nor the camera, and its cause is
not established. Until it is, a probe taken from drawn figure or prop pixels
inside the z-3.3 insert reads ≈15 world px below what placed them; if the drawn
head drifts with it the chin sits ≈306 and the viewer gets ≈9 world px of
clearance where the rule computes 24. The frame edge itself is unaffected.

## Defects found in this slice (viewer review 2026-10-17; all five now fixed)

1. **The floor pickup distorted — fixed by staging, not by the rig.** At the
   push-in the actor reaching for a thermos placed on the FLOOR read as a dive:
   her head dropped to hip height and one shin splayed out behind her. The reach
   allocation was not at fault — it spends crouch before waist (`minimalTouchPosture`
   searches pitch ascending with the crouch as the inner loop) — the posture was
   geometrically forced: a floor thermos puts its declared grip socket 42 world px
   above the ground line, the drawn arm reaches 178 design px from the shoulder,
   and the crouch capacity is `nativeCrouchDrop` = 128.08 design px, so the baked
   bind saturated the capacity: waist pitch 70.5° peak (65.5° at reviewer frame
   142), crouch 1.0, hip drop 128 design px (113 world px) that the planted feet
   cannot follow. The declared `waist.pitchMax` is 40°, and the envelope that would
   bound the crouch is deferred. So the reach, not the pose code, was wrong: a
   canteen thermos belongs on the counter — a declared support of the accepted set
   (`supports.counter`, resting line y400 stage px) — and
   `episodes/m6-film/episode.yml` stages it `on(counter)` instead of `center`. The
   bind is now a 60 px stride plus an arm reach: peak waist pitch 1.8°, peak crouch
   0.25 (28 world px hip drop), 0° and 0 at the former defect frame 142, both feet
   planted from the bind on, and the thermos lifts off y400 to the carry line y418
   by t5.54, ahead of the close frame that holds through her sip. Nothing else
   moved: the shot ladder, every beat time and all four cue times are
   byte-identical to the pre-fix bake, and the leg envelope stays deferred with
   nothing on this slice waiting for it.

2. **Pushes crop at the shins — fixed.** `camera.punch_in` framed its target's
   arithmetic centre while only the horizontally-staged pair bounded the zoom, so
   at z 1.35 a standing figure's bottom frame edge landed above the ground line.
   The camera evaluation now frames the SUBJECT: a person's drawn head-and-torso
   bounds (from the same skeleton FK the renderer draws, so a folded figure is
   framed where she actually is), an object's declared silhouette body box. In a
   framed shot the subject's band owns the zoom and the vertical placement and the
   rest of the room may fall outside it; the pull back to the room keeps the old
   containment. `containCamera`'s staged-pair zoom cap no longer holds a push
   below the wide.

3. **The prop does not gain emphasis — resolved by the same framing change.** A
   prop target now resolves to its live position and its declared silhouette
   instead of falling back to the previous camera centre, so the reveal jump is a
   genuine object shot. The emphasis itself is the authored zoom (defect 5): an
   object shot at the person default reads as a detail, not a subject.

4. **A framed shot sliced the heads — fixed by the framing rule.** The object
   push that centres the thermos put the frame's top edge through both faces: at
   the held insert (frame 314, 13.10 s) the drawn head band was y 116.9–291.2
   world while the frame covered y 231.6–764.9, so the edge cut the nose and
   mouth and kept the full legs, shoes and floor. Both heads now sit wholly
   above the frame: the nearer side was downward, because clearing them upward
   needs y −440, outside the painted stage. The insert's top edge is the
   placement 24 world px below the chin at 291.2, and the horizontal centre and
   the thermos position are untouched by the rule, so it is a counter-and-hands
   shot with the heads out of frame. Held frames that slice a
   head fall from 132 (frames 288–353) to none; the residual slices are the moving
   frames of this push and of the pull back, where the travelling edge must cross
   the head.

5. **The insert had no subject — fixed by authoring the beat's zoom.** Cleared
   heads are not a composition: at z 1.35 the held insert (frame 314, 13.10 s) was
   two headless torsos over a counter with an 85 px thermos in it (15.7% of frame
   height), and the viewer could not say what the camera was looking at. Three
   things were wrong together. The push drew its zoom from `camera.punch_in`'s
   person default, so it is now an authored argument of the beat
   (`camera.punch_in(thermos, 3.3)`, `library/camera/punch_in` taking an optional
   zoom defaulting to 1.35 so every other call site is numerically untouched).
   `propFrameBand` framed a prop from `prop.y` as if it were the art origin, but
   `prop.y` is the BASE anchor the renderer places the art from, and the declared
   `body` silhouette was dropped in `projectedProp` projection, so the band sat
   below the drawn object and the object push aimed under it; the band now reads
   the declared body box at the base offset. The insert is therefore a prop shot:
   the flask's declared silhouette spans y 324.2–418.2 world and its full drawn
   extent y 296.7–422.2, the camera lands at z 3.3, and on the rendered frame the
   flask spans x 523–846, y −13–395 of 1280x720 — 56.7% of frame height, its
   centre at 53% of frame width, the cap cut by the top edge, with the counter
   line, the hand and her torso giving context. Both drawn heads (y 116.9–291.2)
   stay wholly out above the top edge.

   The heads and a centred flask cannot both have it: the hold puts the flask's
   top at world y 296.7 and the chin at 291.2, so a frame that keeps the heads out
   has its top edge inside a 5.5 px window, and the flask necessarily hangs from
   that edge instead of sitting centred. The head rule was kept and the flask
   reads as a tight insert; vertical centring was given up, not the rule.

## Prop inserts are framed on the object, not on the room

An object push frames the prop's declared silhouette and the authored zoom decides
how much of the frame it owns: 35–50% of frame height is what makes a small prop
read as the subject at normal viewing size, while the person-push default (1.35)
leaves it a 16% detail. An insert is allowed to run off the top or bottom edge
(the cap does here) but never through a drawn head.

## Evidence and the stale-still lesson, again

The first attempt to judge this slice sent frames cut from an earlier render to a
vision reviewer, who then reported a defect the current revision had already
fixed. That is the second time this class has cost a round, so the rule is now
stated as part of this milestone: **an evidence frame is cut from the rendered
video of the current revision and carries its bake identity** — episode and
manifest sha256, video sha256, frame count, duration and revision — as in
`/tmp/m6v3/bake-identity.json`. A directory reused from a previous round is not
evidence, whatever its contents look like. The reviewed set is
`/tmp/m6v3/t{2.00,5.90,10.40,13.10,17.90}.png` at revision `fb5baa6`, and the
render itself is moved out of the repository because generated video is not
committed here, even though `.gitignore` deliberately un-ignores
`episodes/*/dist/*.mp4`. The prop-insert round's set is
`/tmp/m6v4/t{2.00,5.90,10.40,13.10,17.90}.png` with `/tmp/m6v4/bake-identity.json`,
cut the same way from the current revision's render.

## Delivered, independent review PASS (revision `fb5baa6`)

Evidence bundle `~/.local/share/agentic-animation/art-baselines/m6-20261018T0840+0800/`:
`bake-identity.json`, five frames cut from that render, the segment itself, and the
review. A vision reviewer judged the five frames at normal viewing size and returned
PASS: clean framing across all shots, the frame-4 insert no longer bisects heads,
poses and prop interactions physically coherent, the reaching figure normal, the hand
wrapping the handle without clipping, the thermos upright, the bodies distinct.
`main` is 288/288 at that revision. Rhubarb is absent, so lip articulation remains
unproven while audio and subtitles are unaffected.

## Verified working in this slice

The carried thermos stays upright (rotation 0 through the carry and the rest, the
base on the declared support line), the two bodies do not merge into one blob,
`check` is green with nine spoken takes, and `make` writes a manifest whose
`audio.cues` carries 23 entries while the compiled tracks reference exactly the
four authored cues. Reviewer frames re-rendered after the counter staging (24 fps,
frames 48, 142, 250, 314, 430): the establish at 2.00 s shows the thermos resting
upright on the counter between the two bodies, the 5.90 s push holds the actor
upright with both feet planted and the thermos in her hand, the wide shots at
10.40 s and 17.90 s are unchanged, and the 13.10 s push is the prop insert
(see defect 5): the flask fills the frame's upper half with both drawn heads
wholly above the top edge.
