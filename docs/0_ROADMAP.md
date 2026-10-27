# EXPLICIT

The person's verdicts, as they were given. A verdict here is an acceptance of a
deliverable at the revision named beside it, never an acceptance of work that
revision did not contain.

- **M2 milestone — met.** “我感觉没啥问题，自动推进”, after being shown the M2
  facial-object entry and its AV checklist; listening and lip-sync were not
  itemized ([record](../evidence/tickets/M2-MILESTONE-ACCEPTANCE.md)).
- **M2 production path — opened for `figure/lin_b_draft` only.** “old characters
  shall still be there, just not the top choice”. Every other figure's
  production replacement, and any publication or spending, stays closed.
- **M3 — met.** “Looks good enough” at the M3 gate bundle.
- **Slice A, the badminton serve — accepted.** “probably yes, not very natural,
  but again we prefer vertical-improvement, not do everything as best as it can
  and next step.” The rendition is the one its artifacts note records as
  accepted ([renditions](../episodes/a-badminton/artifacts/README.md)); “not
  very natural” is their observation, not a defect to chase, and no polish pass
  is owed.
- **The serve-versus-rally fork — withdrawn by the person.** A rally needs the
  serve too, so the serve is on both paths; the rally's extra work is a
  scheduling question, not a question for them.
- **The working rule for the asset programme.** *“we prefer vertical
  improvement, not do everything as best as it can and next step.”* Read as
  depth: a layer is accepted at the level where it can be judged and the next
  cut goes deeper; one layer is never perfected before the one under it begins.
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
  its skills and its practice (image-generation models excepted), then continue
  the main engine goal with ready-made example assets; every step ships as a
  vertical slice a person can see.

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
| M4 materials | delivered, **awaiting the person's judgment**: pigment in `color`, both light passes in `soft-light`, ink contrast 0.964–1.063 in all eight regions, no matte/cut-out/tile/raised layer; +65% wall time over the M3 baseline at concurrency 4 ([materials](../evidence/art/ART_MATERIALS_M4.md)) |
| M5 acting | delivered, **awaiting the person's judgment**: six beats with anticipation, accent and settle; third perceptual review ACTING PASS ([acting](../evidence/art/ART_ACTING_M5.md)) |
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

State: A's serve is accepted and R8 landed the in-flight interception, so its
rally shot (S-A2) is next; B's capability is proven but
its shot does not bake (framing and three sub-pixel invariants); C is not
started.

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
- **ER the independent review** — returned `NOT SATISFIED`
  ([verbatim](../evidence/tickets/S-A1-ER-REVIEW.md)). Two thirds of its
  shortfall was one defect (the actor y-clamp written into the projectile's
  ground, so the shuttle bounced 41–56 px above its line) and one sampling
  artifact (6 fps stepping over two hops).
- **R6 depth defects and the serving rendition** — landed: court-depth scale on
  the `background` entrance, a held prop on its holder's plane and free on its
  own staged plane, and the defect that hid both — `StagedActor.z` was dropped
  twice before the drawing. Re-rendered as the accepted rendition below.
- **R7 the racket in the server's off hand** — landed. The serve is untouched
  (struck 2.207 s `[-533,-447]`, settled 3.717 s `[476.56,691]`). The mechanism
  outlives the shot: a second hold channel on `ActorState` (`off`: bind, carry,
  release, socket, retract) that never places, offers or strikes; `holdsL`/
  `reachL` through the bake into the renderer's left arm; `held-by(actor[, hand])`
  starting a prop in a hand at frame 0. Naming no hand is byte-identical to
  pre-R7 on the five other prop-holding episodes. Not carried, on purpose: the
  shot opens with the racket in hand (a bench pickup would add ~3 s and move the
  strike time R7 pins), and a motor-driven prop is drawn at scale 1 while its
  declared stage scale sizes the motor's box (the racket's drawn handle sits
  ~11 px below the socket) — one declaration for drawn size and physical body is
  R4's unfinished class.
- **R8 the rally's own package — landed.** A `push` naming a prop that declares
  `projectile` and is already falling is now an interception solved at the cue:
  the motor walks the prop's own integrator forward to the first floor contact
  and takes the earliest substep where the hand's reach disc (arm + hand radius)
  touches the drawn box, the root mark is inside what the walk can cover by
  then, and the hand can travel there on its honest 480 px/s ramp. The drive
  waits at that fixed aim and keeps the facing it was solved for, so overlap is
  a closing speed instead of one lucky frame. A cue with no such mark is an
  authored `strike missed` at the cue, staged at no pose — which is why the two
  whole-body freezes are gone. Measured on EP's fixture: seven of eleven cues
  (1.90–2.16 s, a 0.26 s band) land a second strike with empty diagnostics, the
  other four are plain misses, the serve stays 1.407 s `[1000,-839]`, and
  `episodes/a-badminton` keeps struck 2.207 s `[-533,-447]` / settled 3.717 s
  `[476.56,691]`. Not bought: the band is this receiver's at x 1500 (re-staging
  shifts it), bounces are not modelled, and a crouched or mid-gesture striker
  falls into the named miss. Six re-baked episodes have byte-identical motor
  output ([evidence](../evidence/tickets/R8-INTERCEPTION.md)).
- **S-A2 the rally, as a shot — open, the next package, and the next thing the
  person can judge.** R8 is invisible on its own, so the route does not stop at
  it: the mechanism lands, then a shot carries the rally. New episode
  `episodes/a-rally` reusing the set, the two athletes, the shuttle and the
  racket — the accepted serve's rendition and events are immutable, so the
  rally does not edit `episodes/a-badminton`. Deliverables: `episode.yml`, a
  1280×720 rendition with its identity and `verify.sh`, stills of the return's
  contact and of the rally after it, `README.md` with the shot's measured
  limits, `REVIEWS.md`. Acceptance: a second `projectile.struck` inside the
  shot's own bake with empty motor diagnostics, with its cue inside the band that
  bake measures (R8's 0.26 s holds at the fixture's staging; a re-staged receiver
  needs its own measurement, and a shot that has to move him says so), the serve
  still the one the person accepted, the return's contact visible in a still, and
  an independent agent viewer pass before the person is asked. Not-doing: no new
  asset, no change to `episodes/a-badminton`'s events or artifacts, no pickup
  beat.

## Open work items

- **M4, M5, M6, M7 milestone judgments** — the person's, listed above.
- **The racket's pickup in frame** — one authored beat, costs the accepted shot's
  timing; awaiting the person's word.
- **The cast review** — provisional yes, open for the person's look.
- **R8** — landed ([evidence](../evidence/tickets/R8-INTERCEPTION.md)).
- **S-A2 the rally shot** — open, the next package; the first rally the person
  can judge.
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
