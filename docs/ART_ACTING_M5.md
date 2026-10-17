# M5 — Acting: preparation, key poses, accents, settling

## Outcome and visible deliverable

Upgrade the *acting* of the named beats — pickup, handover, putdown, point,
surprise, push/recovery — so that each reads with a readable preparation, a
distinct key pose, an accent and a settle, **without losing contact, support or
prop ownership**. The visible deliverable is one rendered canteen sequence
(accepted M3 set + M4 treatment + `figure/lin_b_draft`) in which those beats
are legible frame by frame at 24 fps, plus a comparison against the current
performance of the same beats.

Scope and budget are owned by the [roadmap](ART_PRODUCTION_UPGRADE.md) M5 row.
Animation mechanics are owned by [WORLD_PUPPET_MOTOR](WORLD_PUPPET_MOTOR.md);
the set is [ART_WORLD_M3](ART_WORLD_M3.md); the treatment is
[ART_MATERIALS_M4](ART_MATERIALS_M4.md); authoring stays
[NARROW_EPISODE_DSL](NARROW_EPISODE_DSL.md).

## What "acting" means here (derived from the M5 row)

The motor already moves bodies correctly. What it lacks is *performance
shape*:

1. **Anticipation** — a beat that spends a few frames opposite to the intended
   motion before it starts (weight shift before a lift, a lean back before a
   push). Currently most beats start from rest and move directly.
2. **Key pose** — the decisive frame of a beat is a pose a viewer can recognise
   as the beat (the moment the thermos leaves the floor; the moment hands meet;
   the moment the prop's base touches the counter).
3. **Accent** — one frame range accelerates hard into the key pose and the rest
   is slower, rather than a single linear ease across the whole beat.
4. **Settle** — after the accent, an overshoot of a few percent followed by a
   decaying settle, instead of stopping dead at the target.
5. **Contact and support discipline** (non-negotiable, already law): support
   markers, `footSupport`, prop ownership and the force chain must remain
   correct throughout; a nicer pose that breaks contact is a regression.

## Entry findings (user-raised and review-raised, routed here)

- **Putdown visibility** — the M3 honest failing criterion
  ([ticket](tickets/BACKLOG-M5-PUTDOWN-VISIBILITY.md)): the rest point is
  geometrically on the painted counter top but the receiver's body occludes it.
  Owning fix: the receiver steps clear after the bind (already probed: the
  self-target walk now works; the blocker is post-bind posture at walk start and
  carry-turn prop continuity).
- **Joint stiffness** (M4 perceptual review, P2): elbow/wrist angles at the
  handover read as rigid puppet joints. Owning fix: pose shaping in the reach
  and bind phases, not new geometry.
- **Counter/floor staging depth** (M4 perceptual review, P2): the counter reads
  as floating relative to the floor grid. Owning fix: staging/contact shadow in
  the episode or set, not a motor change.
- **Seven actions still procedural** (motor slice 3 leftovers): hand-to-face and
  prop-effect actions remain on the old path. M5 may migrate those it needs for
  these beats; the rest stay with their reason.

## Non-goals

1. No new puppets, sets or DSL constructs; no parallel animation pipeline.
2. No ragdoll or new physics solver; the existing FK/IK motor and force chain
   are the authority.
3. No camera-language change (M6 owns focus-driven camera); existing framing
   only.
4. No audio or SFX work (M6/M8 own cues; the two known unshipped cues stay
   unshipped).
5. No speech-content, TTS or subtitle changes beyond what a beat needs.
6. No long-form renders; the roadmap's ≤30 s per-iteration budget holds.

## Engine and library seams

- Motor: `packages/core/src/motor/index.ts` (intent timing, anticipation,
  easing, settle), `skeleton.ts` (pose shaping), trajectory bake (additive
  fields only; existing bakes must stay valid).
- Authoring: intent arguments in the existing vocabulary — a new optional
  timing/shape parameter is acceptable only if it is additive, schema-first and
  documented in NARROW_EPISODE_DSL.md.
- Library: `library/action/*` recipes carry the acting defaults; no new
  categories.

## Acceptance criteria

**Art (perceptual, fresh reviewer + user gate)** — each named beat shows a
readable preparation, a distinct key pose, an accent and a settle; the
handover's hands meet and stay met; the putdown's prop is visibly resting on the
painted top; joints do not read as rigid lock-ups; the counter no longer reads
as floating. Judged on actual frames and at least one moving clip, not on
numbers alone.

**Function (decidable)** — support and contact invariants hold through every
beat (existing marker tests plus new ones for the changed beats); prop ownership
is continuous; no motor diagnostic; `anim check` passes; typecheck, `npm test`,
`npm run smoke` green; `git diff --check` clean; legacy episodes keep their
existing trajectories except where a beat was deliberately retimed (listed
explicitly).

**Production (measured)** — render wall time per beat recorded against the M4
baseline at the same concurrency, with any regression stated; no new
dependencies or services; the M4 +65% figure remains the reference cost.

## Evidence plan

Short clips at 1280×720/24 fps, ≤15 s each, ≤30 s per iteration, on the
accepted set and figure. Comparison: current performance vs candidate for each
beat, same framing and timing. A named archive bundle under
`~/.local/share/agentic-animation/art-baselines/m5-<timestamp>/` carries the
stills, clips, gate logs and a criterion→evidence MANIFEST. Evidence never
enters Git.

## WP3 round (2026-10-18): the six beats, measured

**Authored episode.** `episodes/m5-acting/episode.yml` is one silent acting study on the accepted `set/canteen_counter_m3` with `figure/lin_b_draft` (audio is M6/M8; the ellipsis statements are the scene clock). It emits the six named beats plus the receiver's carrying step-back; every beat carries WP2's shape params in the existing call form. The pickup statement carries nine beats, not five: the receiver must not begin his approach before the giver has straightened, or he parks inside her bow arc and the separation projection has to slide him clear. Bake: 345 frames / 14.35 s, 0 frames without a supported foot, no motor diagnostic.

**Image review round, and what it closed.** A fresh eight-image review failed the first WP3 evidence set. Each finding was reproduced as a number, fixed at its cause, and pinned by a test in `packages/core/test/actingInvariants.test.ts` (red on the pre-fix revision, green now):

| Finding | Measured cause | Before → after |
| --- | --- | --- |
| Handover `catastrophic character collision` | separation used the upright torso half-width, so a bowed torso and head leaned into the neighbour | actor–actor drawn torso/head overlap 7292 px² worst (f63; 24 frames over 25 px²) → 0; handover key f119 centre gap 186 px, head gap 78.3 px |
| Putdown `floating in front of the counter's front face` | the motor's solid was not scaled like the drawn prop, so the drawn ink base rested 1 px high | drawn prop base 399.00 vs 400.00 declared → 400.00; the support's layer composites below the prop plane; prop and contact shadow inside the painted top band (stage 368–430) |
| Pickup `ragdoll contortion` + thermos still on the floor at the key pose | the grab search spent the crouch last (73.5° waist, crouch 0.49) and the evidence frame was the bind, not the lift | bind pitch 73.5° / crouch 0.49 → 45° / crouch 0.95; key pose f48 with the thermos 32 px off the floor |
| Point `rod-like forearm, does not read as pointing` | the aim was the hand-radius-inclusive reach, and the 0.65 s interval ended before the hand arrived, so the pose was never held | the hand's best was x 848.9 at f173, the retract's first frame, with the elbow at 84.7° on the frame the first evidence set called the key pose (f168) → hand (859.3, 285.7), elbow interior 144.0°, held 8 frames (f227–234) |
| Preparation `rigid whole-body planar hinge` | one smoothstep ramp, no counter-dip | lean profile −0.01, −1.5, −4.0, −6.6, −8.8, −10, −10 → +0.6, +2.0 (dip), 0, −0.8, −5.2, −10 (slow start, fast release) |

The three invariants the round adds: (a) no actored episode draws one actor's torso or head inside another's (checked over every episode that compiles, tolerance 25 px²); (b) a placed prop's DRAWN base sits on the declared support at its x and the support's top art composites below the prop plane; (c) acting joint angles stay inside `skeleton.waist.pitchMax`, a low grab spends the crouch before the waist, and a point's drawn elbow stays shaped (100–165°) and reaches its aim.

| Beat | Shape authored | Preparation (measured) | Key pose | Accent (acting hand) | Settle |
| --- | --- | --- | --- | --- | --- |
| pickup | anticipation 0.3, accent 0.8, settle 0.5 | counter-dip to +2.0° then lean −10° held (f0–5) | bind f47, lift key f48 (2.00 s), thermos 32 px up | 149 → 260 px/s (1.75×, max 366) | shaped hold after the bind |
| handover | accent 0.85, settle 0.55 | receiver walks up behind the giver's arc (no anticipation: bilateral cue) | contact bind f119 (4.96 s); hands 3 px apart, arms shaped | giver elbow interior 97.9°, receiver 173.5° at the bind | elbow interior 173.5° → 63.6° through the carry; the hold keeps breathing |
| putdown | anticipation 0.25, settle 0.7 | carrying step-back 190 px (0 facing flips) + lean −10° | release f189 (7.88 s), rest f190 | placement hand max 546 px/s | shaped placement: outward travel before the hand opens; rest x 798.9, drawn base 400.0 on the declared line |
| point | anticipation 0.22, accent 0.8, settle 0.6 | lean −10° over 0.22 s | aim f229 (9.54 s), hand (859.3, 285.7), elbow 144.0°, held f227–234 | 744 → 859 px in 16 frames, full cap into the pose | overshoot capped inside the bone reach, then convergence and retract |
| surprise | anticipation 0.3, accent 0.9, settle 0.65 | lean −10° over 0.3 s | hand apex f268 (11.17 s), y 137 | 147 → 286 px/s (1.94×) | decaying overshoot, then retract; `emotion.shocked` carries the face |
| push/recovery | anticipation 0.25 | lean −10° over 0.25 s | contact after f278 | drive hand capped at 480 px/s, braces on contact | pusher shapes n/a by contract; the target staggers and takes recovery steps |

Ownership through the bake: `lin` holds frames 47–118, `awei` 119–188, 0 frames without a supported foot, 144 contact frames, no motor diagnostic.

**Putdown visibility closed** ([ticket](tickets/BACKLOG-M5-PUTDOWN-VISIBILITY.md)). A holder sent behind its facing takes a 0.3 s foot replant and walks backward at half speed without turning, and a shaped placing release carries the hand outward before the prop opens. At the rest frame the drawn prop base is exactly the declared 400 line at x 798.9, the painted top band spans stage y 368–430 at that x, the art contact shadow sits on the top band, and the rest is clear of both bodies (awei's torso edge 73 px away). The earlier report's "rest y 396 vs declared 400" compared the prop's anchor with the surface: the anchor carries the solid's 4-unit ink offset, so the base — not the anchor — is the value the invariant measures.

**Joint stiffness addressed** (M4 P2). The receiver's bind settles into a shaped breathing hold instead of a locked carry: the elbow interior travels 173.5° → 63.6° through the carry as the arm folds from the extended bind, and the stationary hold keeps moving. Contact and ownership stay exact because the breath is applied to the hand the prop rides.

**Counter/floor depth** (M4 P2). Set-side only, no motor change: the counter's floor contact shadow is three nested footprints plus a base contact line and end occlusion, so the counter base reads against the boards.

**Legacy trajectories.** Of the ten episodes that compile in this harness, seven bake byte-identical motor tracks against the pre-fix revision (sha256 of the actor/prop tracks); `m5-acting` is the intended change, and two re-bake at the handover adjacency because the collider is now the drawn body: `showcase-camera` (walk halt spacing) and `showcase-props` (its pre-existing contact-cue diagnostic moves from 2.167 s to 2.333 s). `ai-work-adventure` and `liu-secret` do not compile without authored speech alignment in this harness and are not exercised here.

**Evidence** (`/tmp/m5view3/`, never in Git): 960-wide JPEGs shot at the frames the bake derives — `pickup-prep` f5, `pickup-key` f48, `handover-prep` f95, `handover-key` f119, `putdown-key` f189, `putdown-rest` f204 and a `putdown-rest-crop.jpg`, `point-key` f229, `surprise-key` f268 — plus `probe.json` with the drawn-vs-bake table. `putdown-rest` is f204, the settle's end: at f190 the prop has reached its rest but the placing arm is still settling (reach influence 0.963), which is what the review read as a frozen shelf. A fresh image review of this set is the next gate; WP4 owns the moving clips and the bundle.

## Render truth: the second image review and what it found

A second image review reported that the render contradicted the bake on all four acting defects. A marker probe — one figure part repainted in a copy of the manifest, then that part's ink located in the rendered PNG — finds the renderer obeys its bake at every beat key frame: each drawn pose channel equals the baked one within 0.5°, the drawn hand sits on the baked reach within 2–5 px (the hand art's own centre offset), and the drawn prop follows the baked anchor. The reviewed stills were pictures of the **12.15 s pre-fix bake** carrying the 14.35 s bake's frame numbers: frame 5 agrees with a current render (0 differing px) while frame 53 differs by 24 855 px and draws the holder's body at stage x 657.5 where the 14.35 s bake puts him at 748.7. The number was right and the picture was of another revision — the M4 failure mode again, in the evidence path rather than in the renderer.

**Closed mechanically.** `packages/studio/test/renderTruth.test.ts` derives each beat's key frame from the compiled bake (its call cues plus the bake's own bind, lift, release and aim), then judges what the renderer draws there through the renderer's pose path (`evaluatePerformance` → `solveActorFigure` → `designHandToWorld`): the pose, the hand on its reach, the prop on its declared line, the elbow's bend, the crouch. A negative control asserts the same measurement fails when pointed at another frame, so a stale index cannot pass. Evidence frames now come from that derivation, never from a copied number.

**Open finding: the pre-roll hinges the waist** (review item 4). Anticipation shifts the weight with a 10° waist lean on straight legs. Bending the knees needs the crouch, and the crouch is not a free acting channel: a pre-roll crouch leaves a planted-foot support reserve and puts the point's fixed world aim 7 px outside the arm's bone reach, so the whole-body proposal rejects the beat (`palm-contact/hand_r 6.958 > 0.020`, measured on the attempted shape). The proper fix re-solves the reach aim against the posture — a motor posture change beyond this round, so the attempt is reverted rather than tuned in.

**Residual limits.** The study is silent; the receiver's bind arm is at full stretch (173.5°) while the giver's is folded — a shaped bind would need a closer adjacency, which trades against the readable head gap; the surprise's accent contrast is limited by a short travel; the push's accent/settle live in the target's stagger by motor contract; a reach posture may exceed the declared waist envelope when the object is low enough to need it (`figure/lin_b_draft` measures 45° with the crouch spent). No moving clip is claimed here.

## Work-package split

| Package | Coverage and owner | Depends on | Acceptance |
| --- | --- | --- | --- |
| WP1 contract | This document; docs only | roadmap, M3/M4 docs, routed tickets | ≤200 lines; references resolve; `git diff --check` clean |
| WP2 motor acting | Anticipation / accent / settle parameters and pose shaping; owns `packages/core/src/motor`, additive bake fields, tests | WP1 | Unit tests for each shape; support/contact invariants unchanged; legacy trajectories diffed and disclosed; typecheck/test/smoke green |
| WP3 beat authoring | Retimes the six named beats in a dedicated episode; owns `episodes/m5-acting`, `library/action` defaults | WP2 | Each beat renders with a readable prep/key/accent/settle; putdown visibility closed; joint stiffness addressed |
| WP4 integration and gate | Comparison clips, gate logs, evidence bundle, milestone presentation | WP2+WP3 | Evidence plan satisfied; fresh perceptual review arranged; user judges |

End state: the user judges the presented comparison. Production replacement of
any further asset remains the user's call, exactly as for M2–M4.
