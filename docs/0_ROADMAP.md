# EXPLICIT

The person's verdicts, as they were given. A verdict here is an acceptance of a
deliverable at the revision named beside it, never an acceptance of work that
revision did not contain.

- **M2 milestone — met.** “我感觉没啥问题，自动推进”, after being shown the entry
  `m2-facial-object-20261014T0010` and its AV checklist; listening and lip-sync
  were not itemized ([record](../evidence/tickets/M2-MILESTONE-ACCEPTANCE.md)).
- **M2 production path — opened for `figure/lin_b_draft` only.** “old characters
  shall still be there, just not the top choice”. Every other figure's
  production replacement, and any publication or spending, stays closed.
- **M3 — met.** “Looks good enough” at the gate bundle `m3-20261016T2305+0800`.
- **Slice A, the badminton serve — accepted.** “probably yes, not very natural,
  but again we prefer vertical-improvement, not do everything as best as it can
  and next step.” The rendition is the accepted one below; “not very natural” is
  their observation, not a defect to chase, and no polish pass is owed.
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
| M6 film language | `episodes/m6-film`, focus-driven camera, semantic cues | independent review PASS at `fb5baa6` |
| M7 transfer | `episodes/m7-transfer`, second layout/character/light | independent review PASS at `8f8f1e8` |

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

Three slices, each needing genuinely new native artwork, under the capability
contract in [7_DSL](7_DSL.md#capability-contract) and the ownership rule in
[6_ARCHITECTURE](6_ARCHITECTURE.md#ownership-and-the-conflict-rule).

- **A · the badminton serve and rally.** A serve from the palm, a 40° arc, a
  bounce, a camera that follows the shuttle; the rally is the shot that extends
  it later. One 40° elevation, a settle 1440–1560 px downrange, no authored toss
  and a 0.09 s contact window bound the serve's current reach.
- **B · a giant swing on a high bar.** A body rotates a full circle about a fixed
  bar while a second figure reacts; the support is the bar, not the ground.
- **C · pouring tea.** A host tilts a pot into a cup; the tilt is authored
  intent and the stream, cup level and steam are derived from it.

State: A's serve is accepted and its rally is at R8; B's capability is proven but
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
- **R8 the rally's own package — open, the next package.** Its goal: place a
  receiver's hand or racket where the descending shuttle *will* be, so a return
  lands from a cue a person could author. Baseline, measured on EP's fixture
  across cues 1.90/1.96/2.00/2.04/2.08/2.12/2.16/2.20/2.26/2.32/2.40 s: exactly
  one (2.12 s) yields a second `projectile.struck` (2.218 s). The rest fail as a
  plain `strike missed` or as `whole-body proposal exhausted` on
  `joint-rate/elbow_r` / `segment-angle-rate/hand_r`. The shuttle sits inside the
  hand circle ~0.07 s and inside the arm's 137 px envelope ~0.39 s; the mechanism
  must buy the difference. Acceptance: (a) at least six of the eleven cues yield
  a second `projectile.struck` (a ≥0.25 s hand-authorable window) with empty
  diagnostics; (b) every remaining failure names its class, never a NaN or a
  freeze; (c) the serve's events stay struck 1.407 s on the same arc and the
  accepted episode's shuttle numbers do not move; (d) the full suite green and no
  other episode's bake digest changed. Expected mechanism, to be proven or
  replaced: an interception aim on the ballistic path solved against the arm
  envelope and the walk, then a sweep with the flight so overlap is the closing
  speed. Not-doing: no authored elevation/force change, no rally DSL, no
  tolerance widening, no re-polish of the accepted serve. R8 is bake-level; the
  person judges a rally only after a shot carries one.

## Open work items

- **M4, M5, M6, M7 milestone judgments** — the person's, listed above.
- **The racket's pickup in frame** — one authored beat, costs the accepted shot's
  timing; awaiting the person's word.
- **The cast review** — provisional yes, open for the person's look.
- **R8** — the next package.
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
