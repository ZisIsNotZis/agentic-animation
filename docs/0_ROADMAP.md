# EXPLICIT

The person's verdicts, as they were given. A verdict here is an acceptance of a
deliverable at the revision named beside it, never an acceptance of work that
revision did not contain.

- **M2 milestone — met.** “我感觉没啥问题，自动推进”, after being shown the M2
  facial-object entry and its AV checklist; listening and lip-sync were not
  itemized ([record](../evidence/tickets/M2-MILESTONE-ACCEPTANCE.md)).
- **M2 production path — opened for `figure/lin_b_draft` only.** “old characters
  shall still be there, just not the top choice”. Every other figure's
  replacement, and any publication or spending, stays closed.
- **M3 — met.** “Looks good enough” at the M3 gate bundle.
- **Slice A, the badminton serve — accepted.** “probably yes, not very natural,
  but again we prefer vertical-improvement, not do everything as best as it can
  and next step.” The rendition is the one its
  [artifacts note](../episodes/a-badminton/artifacts/README.md) records as
  accepted; “not very natural” is their observation, not a defect to chase.
- **The serve-versus-rally fork — withdrawn by the person.** A rally needs the
  serve too, so the serve is on both paths; its extra work is scheduling.
- **The working rule for the asset programme.** *“we prefer vertical
  improvement…”* read as depth: a layer is accepted where it can be judged and
  the next cut goes deeper; no layer is perfected before the one under it.
- **Quality bar — coarse is correct.** A defect counts only when it is visible
  at normal viewing size; prefer the convenient mechanism inside that, and spend
  effort on not looking wrong rather than on being exact. Two bounds keep their
  force: a carried item must not read as spilling, and a hand must not read as
  passing through the middle of a prop.
- **Cast — provisional yes, open for review.** The new figures may be
  recommended for new episodes, but the yes is provisional on the person seeing
  a slice they appear in; one sentence reverses it
  ([cast](../evidence/media/README.md)).
- **Priority order.** Absorb every valuable Huashu mechanism into this engine,
  its skills and its practice (image generation excepted), then continue the
  engine goal with ready-made example assets; every step ships as a vertical
  slice a person can see.

# CONFIRMED

Delivered and independently reviewed; each verdict names the revision it covers.

| milestone | deliverable | verdict |
| --- | --- | --- |
| M6 film language | `episodes/m6-film`, focus-driven camera, semantic cues | independent review PASS, bound to the revision its evidence names ([M6](../evidence/art/ART_FILM_LANGUAGE_M6.md)) |
| M7 transfer | `episodes/m7-transfer`, second layout/character/light | independent review PASS, bound to the revision its evidence names ([M7](../evidence/art/ART_TRANSFER_M7.md)) |

Engine milestone is closed: the plugin-host engine compiles and renders the
canonical `episode.yml` path end to end.

# INFERRED

The plan this repository is being built to, and each milestone's state. State is
a fact about the tree, so it lives here and nowhere else.

## Art-quality milestone state

| milestone | state |
| --- | --- |
| M0 baseline | delivered: a known-defective comparison capture, not production approval ([baseline](../evidence/art/ART_BASELINE_M0.md)) |
| M1 direction | accepted: B selected, A/B/C preserved ([directions](../evidence/art/ART_DIRECTION_M1.md)) |
| M2 character | judged met; `figure/lin_b_draft` is the recommended production figure ([character](../evidence/art/ART_CHARACTER_M2.md)) |
| M3 world | judged met; `set/canteen_counter_m3` backs the canteen scene ([world](../evidence/art/ART_WORLD_M3.md)) |
| M4 materials | delivered, **awaiting the person**: pigment in `color`, both light passes in `soft-light`, ink contrast 0.964–1.063 everywhere, +65% wall time ([materials](../evidence/art/ART_MATERIALS_M4.md)) |
| M5 acting | delivered, **awaiting the person**: six beats with anticipation, accent and settle, third perceptual review ACTING PASS ([acting](../evidence/art/ART_ACTING_M5.md)) |
| M6 film language | delivered and PASS (§CONFIRMED); awaiting the person's judgment |
| M7 transfer | delivered and PASS (§CONFIRMED); awaiting the person's judgment |
| M8 default production | planned, not started |

## Asset programme: the three new situations

Three slices, each needing genuinely new native artwork, under the rule that a
situation earns its assets by needing a capability the engine lacks
([use cases](4_USECASE.md#p1-the-three-new-situations-the-asset-programme)) and
that a capability is proven by transfer, not by one shot
([product](5_PRODUCT.md#transfer-is-the-quality-test)), and under the ownership
rule in [6_ARCHITECTURE](6_ARCHITECTURE.md#ownership).

- **A · the badminton serve and rally.** A serve from the palm, a 40° arc, a
  bounce, a camera that follows the shuttle; the rally is the shot that extends
  it later. One 40° elevation, a settle 1440–1560 px downrange, no authored toss
  and a 0.09 s contact window bound the serve's current reach.
- **B · a giant swing on a high bar.** A body rotates a full circle about a fixed
  bar while a second figure reacts; the support is the bar, not the ground.
- **C · pouring tea.** A host tilts a pot into a cup; the tilt is authored
  intent and the stream, cup level and steam are derived from it.

State: A's serve is accepted, R8 landed the in-flight interception and S-A2's
rally shot is delivered but unreadable to blind reviewers
([a-rally](../episodes/a-rally/README.md)); B's capability is proven but its
shot does not bake (framing and three sub-pixel invariants); C is not started.

## Slice A packages, in order

Each package runs in one session on its own lease, carries its own scoped tests
and `npx tsc --noEmit`, and reports; the combined check belongs to the
integrating node.

- **E2 the serve and the return** — landed. **E4 the tracking camera** — landed:
  `camera.follow(target, {sec, zoom})`, per-frame keys, stage-clamped. **EP two
  native figures could not bake together** — landed: the native pair bakes.
- **EA the episode** — landed: `episodes/a-badminton/`, the serve from the hand,
  `camera.follow(shuttle, {sec: 2.0, zoom: 0.75})`, 40° arc, bounce resting at
  world x 509. Its measured reach, force table and the five limits it could not
  land live in `episodes/a-badminton/README.md`.
- **ER the independent review** — `NOT SATISFIED`
  ([verbatim](../evidence/tickets/S-A1-ER-REVIEW.md)): one real defect (the
  projectile's ground was seeded from the actor clamp, so the shuttle bounced
  41–56 px high) and one sampling artifact (6 fps stepping over two hops).
- **R6 depth defects and the serving rendition** — landed: court-depth scale on
  the `background` entrance, a held prop on its holder's plane and free on its
  own staged plane, and the defect that hid both — `StagedActor.z` was dropped
  twice before the drawing. Re-rendered as the accepted rendition below.
- **R7 the racket in the server's off hand** — landed; the serve is untouched.
  A second hold channel on `ActorState` (bind, carry, release, socket, retract),
  `holdsL`/`reachL` through the bake into the renderer's left arm, and
  `held-by(actor[, hand])` starting a prop in a hand at frame 0; naming no hand
  is byte-identical on the five other prop-holding episodes. Left open, and now
  R9: a motor-driven prop is drawn at scale 1 while its declared stage scale
  sizes the motor's box, so its drawn handle sat ~11 px below the socket.
- **R8 the rally's own package — landed.** A `push` on a prop that declares
  `projectile` and is already falling is an interception solved at the cue: the
  prop's own integrator is walked forward and the drive aimed at the earliest
  substep the hand, the walk and the reach can all meet it, then held there, so
  overlap is a closing speed instead of one lucky frame; a cue with no such mark
  is a named miss staged at no pose, which is why the two whole-body freezes are
  gone. On EP's fixture seven of eleven cues (1.90–2.16 s) land with empty
  diagnostics, the serve stays 1.407 s, `episodes/a-badminton`'s events do not
  move, and six re-baked episodes are byte-identical
  ([evidence](../evidence/tickets/R8-INTERCEPTION.md)). Not bought: the band is
  that receiver's staging, bounces are not modelled, and a crouched or
  mid-gesture striker falls into the named miss.
- **S-A2 the rally, as a shot — delivered, and NOT PASSED by two blind
  reviews.** `episodes/a-rally` carries the accepted pickup and serve, the
  receiver walking into the descent and returning it inside a measured band
  (0.285 s, after the camera moved the serve to 2.307 s), the return's flight to
  its rest, and a camera that opens wide, holds a medium two-shot through the
  contact and pulls back; four renditions are kept, superseded, never
  overwritten. Both blind reviews are filed verbatim
  ([r3](../evidence/tickets/S-A2-REVIEW.md),
  [r4](../evidence/tickets/S-A2-REVIEW-R4.md)) and both decided on the picture,
  not the bake: **the off-hand racket is never drawn in a hand**, and **the
  returning palm meets the shuttlecock's cone edge while its cork hangs a hand's
  width away**, so the shuttle looks pushed by air rather than struck. They also
  name the asset itself: a translucent, 2.4×-real cone that reads as a
  lampshade. The bakes are right; the picture is not, and the two mechanical
  causes become R9 and R10 below. The person is not asked to look until those
  land and a third blind review passes.
- **R9 the held prop in the hand — open, the next package.** The racket is
  staged `held-by(server, left)` and the bake carries it on the off hand's
  socket, yet in the picture the handle floats 30–70 px from the palm and the
  head sits against the shoulder/chest; R7 already recorded the class as "a
  motor-driven prop is drawn at scale 1 while its declared stage scale sizes the
  motor's box" (its drawn handle ~11 px below the socket). Measure the drawn
  handle against the drawn palm per frame on a held prop, then make the drawn
  prop's declared handle sit in the palm — one declaration for drawn size,
  physical body and socket. Acceptance: measured handle-to-palm offset inside a
  hand width on every frame of a held window; two failing-first tests; the
  bakes of the episodes that hold a prop unchanged; `a-badminton`'s racket
  drawing re-rendered and reported (its serve's events must not move).
- **R10 the strike meets the point a player strikes — open, after R9.** R8's
  interception aims the drive at the box point the rest hand reaches soonest, so
  a palm can bind on the shuttlecock's cone edge while its cork hangs a hand's
  width away. Aim the interception at the prop's declared contact point — its
  grip socket where the asset declares one, the cork/point a strike reads as
  otherwise — while the contact itself still binds on the body box. Acceptance:
  on the EP fixture and on `episodes/a-rally`'s staging the drawn palm is inside
  a hand's width of the prop's declared contact point at the contact frame; R8's
  cue band does not shrink below 0.25 s; the serve's held-prop strike is
  untouched; suite and hashes green.

## Open work items

- **M4, M5, M6, M7 milestone judgments** — the person's, listed above.
- **The racket's pickup in frame** — one authored beat, costs the accepted shot's
  timing; awaiting the person's word.
- **The cast review** — provisional yes, open for the person's look.
- **S-A2's third independent review** — owed after R9 and R10, bound to the
  re-shot rendition.
- **The shuttlecock asset is the person's decision.** Both blind reviewers named
  it unprompted: at 2.4× real size, a translucent feather mesh with a black rim,
  it reads as a lampshade. A new revision (opaque feathers, a readable cork, a
  smaller declared size) is additive and does not rewrite the accepted asset,
  but it changes how the accepted serve's shuttle looks in any new rendition.
- **A push on a prop another actor is holding is a silent no-op** — measured in
  S-A2: two pushes on one cue bake one strike and no diagnostic, where the
  contract says an impossible beat fails loud. It costs a shot nothing today
  (the spacer authors around it) and hides a wrong cue forever.
- **Slice B** — the shot does not bake: a straight-up mount is singular, the
  staged standing line is not owned by the set so a full circle cannot fit any
  frame, and three sub-pixel invariants (`leg-annulus` 0.002 px,
  `support-anchor` 0.029 px, `grip-contact` 1.119 px) refuse the mount.
- **Slice C** — not started; `intent pour` is declared and fails loud, the teapot
  and teacup exist, the tea room and two cast members do not.
- **Carried from M2** — grasp at the handle socket, live orientation while held, a
  grasp hand shape, knee flexion under crouch
  ([register](../evidence/tickets/OPEN-CARRIED-PROP-GRASP.md)).
- **Backlog, each its own ticket** — render non-determinism across sessions, the
  putdown pre-roll knees, prop drop/bounce, the unshipped `shiver-rattle` cue,
  and the lost-M2 rescue ([rescue](../evidence/tickets/RESCUE-LOST-M2-WORK.md)).
