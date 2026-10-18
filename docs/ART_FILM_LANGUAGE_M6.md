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

## Open defects in this slice (found by viewer review, 2026-10-17)

1. **The floor-pickup pose distorts — open, blocked on the deferred leg
   envelope.** At the push-in the actor reaching for the thermos reads as a dive:
   her head drops to hip height and one shin splays out behind her. The reach
   allocation is not at fault — it already spends crouch before waist (`minimalTouchPosture`
   searches pitch ascending with the crouch as the inner loop) — the posture is
   geometrically forced: the thermos's declared grip socket sits 42 world px above
   the ground line, the drawn arm reaches 178 design px from the shoulder, and the
   crouch capacity is `nativeCrouchDrop` = 130 design px, so the baked bind is
   waist 66°, crouch 0.94, hip drop 123 design px. The search samples the crouch
   in 0.25 steps and returns the least fold that touches at any of them, so no
   smaller fold it can consider reaches the object, and the planted feet cannot
   follow a 123 px drop without one leg trailing. The honest fix is the deferred leg envelope —
   a declared deeper crouch plus the stance that follows it — so this shot is not
   half-fixed here; the figure's declared `waist.pitchMax` is 40°.

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
   object shot: the thermos is centred and 1.9× larger at z 1.35. Its cost is a
   look the viewer should judge: as an object close-up it crops both bodies at the
   neck, where the old shot kept them whole and unemphatic.

## Verified working in this slice

The carried thermos stays upright (rotation 0 through the carry and the rest, the
base on the declared support line), the two bodies do not merge into one blob,
`check` is green with nine spoken takes, and `make` writes a manifest whose
`audio.cues` carries 23 entries while the compiled tracks reference exactly the
four authored cues. Reviewer frames re-rendered after this fix (24 fps, frames
48, 142, 250, 314, 430): the wide shots at 2.00 s, 10.40 s and 17.90 s are
unchanged, the 5.90 s push frames the reaching actor's head and torso inside the
floor, and the 13.10 s push centres and enlarges the thermos.
