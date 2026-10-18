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

1. **The floor-pickup pose distorts.** At the push-in, the actor reaching for the
   thermos reads as a torso bent backwards about 45° with broken knee geometry —
   a skeletal glitch rather than a person reaching down. This is the deepest
   visible residue of the crouch/reach work: the crouch capacity is unbounded
   (the declared leg envelope is deferred), so waist and legs can be pushed into
   a posture the drawing does not survive.
2. **Pushes crop at the shins.** `camera.punch_in` frames its target's arithmetic
   centre, so at z 1.35 a standing figure is cut at the shins, which reads as
   accidental scaling rather than camerawork. A push must frame the subject —
   head and torso for a person, the silhouette for an object — which means
   authoring a target offset, not only a zoom.
3. **The prop does not gain emphasis.** The push meant to reveal the thermos does
   not centre or enlarge it; it is a slight zoom of the whole two-shot.

## Verified working in this slice

The carried thermos stays upright (rotation 0 through the carry and the rest, the
base on the declared support line), the two bodies do not merge into one blob,
`check` is green with nine spoken takes, and `make` writes a manifest whose
`audio.cues` carries 23 entries while the compiled tracks reference exactly the
four authored cues.
