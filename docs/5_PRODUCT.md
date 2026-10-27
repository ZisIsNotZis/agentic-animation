# EXPLICIT

- Direction **B, sunlit story frame**, was selected by the person from three
  rendered studies. B's warm interior, thin contours, character proportions and
  clear exchange are the working direction; A (paper-cut shop) and C
  (ink-and-gouache courtyard) stay as references and are not mixed into B.
- The refined identity of `figure/lin_b_draft` was accepted (“seems much better,
  go on”) and is the production figure.
- Cast: the new figures may be recommended for new episodes, provisional on the
  person seeing a slice they appear in.

# CONFIRMED

- The canteen counter is the scene successive milestones are judged on: the
  character work, the materials treatment and the acting beats all land there, so
  comparisons hold the beat fixed and vary one layer.
- A carried prop keeps its authored orientation instead of swinging with the
  forearm, and a low reach may be split between crouch and waist rather than
  requiring one exact squat depth.
- A hand-held transfer pair keeps a visible gap between the two drawn bodies at
  the moment of the exchange.

# INFERRED

Product decisions, each with the branch it rejected and where its evidence
lives. A decision here is about what the product *is*; the mechanism behind it is
in [7_DSL](7_DSL.md), [7_SCHEMAS](7_SCHEMAS.md) or [8_MOTOR](8_MOTOR.md).

## The drawing direction

Thin variable contours, anatomical proportions, a receding warm interior and one
declared light source. **Rejected:** paper-cut silhouettes (edges must survive
articulation) and ink-and-gouache (fine edges and texture stability are not
affordable yet). **Reason it won:** it is the only one of the three whose detail
survives at 1280×720 and whose light can be declared rather than painted
per-frame. Evidence: [M1](../evidence/art/ART_DIRECTION_M1.md).

## Character identity and native artwork

A figure is artwork plus geometry, not a rig over generic shapes: five drawn views
cover eight orientations, each with a skeleton, articulated parts, independent
face/eye/mouth/hand shapes, and explicit occlusion. The drawn joints *are* the
physics joints, and a visible palm must agree with the authoritative contact
point. A figure that declares no artwork keeps the legacy procedural path, so old
assets never break.

Orientation is one of eight (front, back, left, right and four quarters); five
drawn views cover them, left/right and the mirrored quarters are renderer
mirrors, and an orientation sheet measures that adjacent views cannot collapse
into near-duplicates. Algorithmic fabric is a seeded weave clipped to the robe,
deterministic per figure and anchored in figure-local coordinates.

**Rejected:** upgrading the legacy puppets. They have no articulated posture, so
every contact beat with them lifts a prop while the figure never bends; acting
needs native artwork. **Cost accepted:** a new figure is expensive, which is why
casts are deliberate and reused (the spectator appears in two slices on purpose).
Evidence: [M2](../evidence/art/ART_CHARACTER_M2.md).

## Cast

| figure | body | slices | state |
| --- | --- | --- | --- |
| `figure/lin_b_draft` | lean student, teal wrap tunic | canteen milestones M2–M6 | recommended production figure |
| `figure/athlete_a` | tall, lean, sportswear | A | built; preferred for new episodes, provisional on the person's look |
| `figure/gymnast_b` | compact, heavy, chalk-white hands | B | built; preferred for new episodes, provisional on the person's look |
| `figure/host_c` | older, robe; also the tea guest | C | not built |
| `figure/spectator_d` | small, loud silhouette | A and B, deliberate reuse | not built |

Old figures (`aqiang`, `elder`, `awei`, `liu`, `lin`) stay installed and
selectable; the preference is expressed by the figure category's `use`, never by
editing episodes.

## The world the figures stand in

One set is made coherent at a time: layered art whose paint order is declared,
supports whose painted top is declared as the same number, a safe actor area, and
depth that is a static declared paint plane rather than a camera variable.
**Rejected:** parallax, depth-of-field blur, per-element focus filters, 3D
projection — each buys a boundary the artwork does not draw. **Reason:** a set
piece must be able to stand *between* two actors (the badminton net at plane 45
between a far player at 40 and a near one at 50), which a flat background or a
foreground layer alone cannot express. Evidence:
[M3](../evidence/art/ART_WORLD_M3.md) and the declarations in
[7_SCHEMAS](7_SCHEMAS.md#set-world-declarations).

## Materials and light

Region pigment families, scale-keyed contours, and one declared light model
(window, left) as additive passes over the set *and* the actors. Each pass
composites in the mode that leaves the drawn values alone: `color` for pigment,
`soft-light` for both light passes, because a pigment glaze must not move values
and a light pass must move them with its declared direction. **Rejected, with
reasons kept:** a feathered matte holding washes off props (presented boundaries
the art does not draw), a raised prop layer (existed only to escape a wash that
destroyed ink), paper-fibre tiles (the tiling was the frame's most visible
feature), and straight restatements of ink the art already draws. Evidence:
[M4](../evidence/art/ART_MATERIALS_M4.md).

## Acting

Four shapes on top of a correct motor, as data on the intent rather than a second
motion path: **anticipation** (a shaped pre-roll opposite the beat), **key pose**
(the decisive frame is a pose a viewer recognises), **accent** (one accelerated
span into the pose, a redistribution of the existing cap, not a new speed), and
**settle** (one decaying overshoot, convergence, never oscillation). Every shape
defaults to 0, and 0 reproduces the pre-M5 trajectory exactly. **Rejected:** a
second animation pipeline, ragdoll physics, and any shape that bypasses a limit —
the hand keeps its cap, contact still binds only at physical touch. Evidence:
[M5](../evidence/art/ART_ACTING_M5.md), mechanism in [8_MOTOR](8_MOTOR.md).

## Film language

The camera moves because attention moves: a wide that establishes, a push that
lands on the beat's subject *before* the beat, a hold while the subject acts, a
return to the wide when the unit becomes the pair. Audio is semantic and
restrained — one accent per beating shot, silence elsewhere, every named cue in
the compiled `audio.cues`. **Rejected:** one continuous drifting move, decorative
transitions, and a framed shot that slices a drawn head: a head is wholly inside
or wholly outside the frame, and a headless object insert is deliberate only
because both heads are above the edge. Evidence:
[M6](../evidence/art/ART_FILM_LANGUAGE_M6.md).

## Transfer is the quality test

A capability has transferred only when a genuinely different situation needs no
engine or episode work: a different set, different figures, a different effect,
and prose-authored from scratch rather than copied from a template. What M7
found is the honest limit of the current product: a set without declared supports
or layer passes has no counterpart for `on(counter)`; two legacy figures share a
face and do not read as two people; a declared prop scale is a legibility
decision, not an art detail. Evidence:
[M7](../evidence/art/ART_TRANSFER_M7.md).

## Preservation boundaries

Frozen M0 media and audio, every accepted rendition, and every installed asset
stay untouched. A new revision is additive: a draft library, a copied episode, a
rendered comparison. Nothing in this product replaces a difficult interaction with
an easier demonstration, and a changed composition is declared, never implied.
