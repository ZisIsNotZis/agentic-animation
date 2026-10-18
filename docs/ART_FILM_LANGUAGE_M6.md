# M6 film language

Roadmap row: "focus-driven camera, meaningful transitions, semantic audio cues
and restrained sound", accepted as "better explanation/rhythm in actual
audiovisual clips, not decorated slides". Progress is owned by [STATUS](STATUS.md).

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
pair is the unit while the other actor speaks; a 1.9× scale jump out of that wide
onto the prop at 11.27–12.47 landing on `action.present` and the reveal chime at
12.77; wide again at 14.72–15.52 so the closing line shrinks the speaker. Cues:
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

## Defects found in this slice (viewer review 2026-10-17; all four now fixed)

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
   prop target now resolves to its live position and its silhouette instead of
   falling back to the previous camera centre, so the reveal jump is a genuine
   object shot: the thermos is centred and 1.9× larger at z 1.35.

4. **A framed shot sliced the heads — fixed by the framing rule.** The object
   push that centres the thermos put the frame's top edge through both faces: at
   the held insert (frame 314, 13.10 s) the drawn head band was y 116.9–291.2
   world while the frame covered y 231.6–764.9, so the edge cut the nose and
   mouth and kept the full legs, shoes and floor. Both heads now sit wholly
   above the frame: the nearer side was downward, because clearing them upward
   needs y −440, outside the painted stage. The insert holds at y 315.2–848.5 —
   24 world px of clearance below the chin at 291.2 — with the zoom (1.35), the
   horizontal centre and the thermos at y 418.2 unchanged, so it is a
   counter-and-hands shot with the heads out of frame. Held frames that slice a
   head fall from 132 (frames 288–353) to none; the residual slices are the moving
   frames of this push and of the pull back, where the travelling edge must cross
   the head.

## Verified working in this slice

The carried thermos stays upright (rotation 0 through the carry and the rest, the
base on the declared support line), the two bodies do not merge into one blob,
`check` is green with nine spoken takes, and `make` writes a manifest whose
`audio.cues` carries 23 entries while the compiled tracks reference exactly the
four authored cues. Reviewer frames re-rendered after the counter staging (24 fps,
frames 48, 142, 250, 314, 430): the establish at 2.00 s shows the thermos resting
upright on the counter between the two bodies, the 5.90 s push holds the actor
upright with both feet planted and the thermos in her hand, the wide shots at
10.40 s and 17.90 s are unchanged, and the 13.10 s push centres and enlarges the
thermos with both drawn heads wholly above the frame (see defect 4).
