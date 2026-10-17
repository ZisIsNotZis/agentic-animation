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

**Authored episode.** `episodes/m5-acting/episode.yml` is one silent acting study on the accepted `set/canteen_counter_m3` with `figure/lin_b_draft` (audio is M6/M8; the ellipsis statements are the scene clock). The script emits the six named beats plus the receiver's carrying step-back; every beat carries WP2's shape params in the existing call form.

| Beat | Shape authored | Preparation (measured) | Key pose | Accent (hand speed early → late, ratio) | Settle |
| --- | --- | --- | --- | --- | --- |
| pickup | anticipation 0.3, accent 0.8, settle 0.5 | torso lean −10° held over the 0.3 s pre-roll | first hold f53 / 2.208 s | 153 → 215 px/s (1.41×, max 327) | hold settle after the bind (elbow/forearm keep moving; see handover row) |
| handover | accent 0.85, settle 0.55 | receiver approach (the bilateral cue takes no anticipation) | contact bind f66 / 2.750 s | 53 → 196 px/s (3.69×, max 263) | bind-to-carry elbow 14.6→61.9°, forearm −77.4→−12°; stationary hold still moves 5.5° upper / 3.7° forearm |
| putdown | anticipation 0.25, settle 0.7 | carrying step-back 190.5 px (0 facing flips) + lean −10° | release f136 / 5.667 s | placement hand max 546 px/s | shaped placement: outward travel before the hand opens; rest at 797.6, y396 vs declared 400 |
| point | anticipation 0.22, accent 0.8, settle 0.6 | lean −10° over 0.22 s | aim f168 / 7.000 s (reach x 805.2) | 84.5 → 307 px/s (3.64×) | overshoot to x 819.1 (+13.9 px, cap 14) then convergence |
| surprise | anticipation 0.3, accent 0.9, settle 0.65 | lean −10° over 0.3 s | hand apex f206 / 8.583 s (y 254) | 198 → 230 px/s (1.16×, max 286; short travel limits the contrast) | decaying overshoot past the apex, then the retract; `emotion.shocked` supplies the face and impact vfx |
| push/recovery | anticipation 0.25 | lean −10° over 0.25 s | contact f249 / 10.375 s | drive hand max 480 px/s, braces at contact (0.67 ratio) | pusher shapes are n/a by contract; the target staggers 50.9 px (max 140 px/s) and takes recovery steps |

Invariants through the bake: 0 frames without a supported foot, 84 contact frames, `lin` holds frames 53–65, `awei` 66–135, first free fall f136, no motor diagnostic.

**Putdown visibility closed** ([ticket](tickets/BACKLOG-M5-PUTDOWN-VISIBILITY.md)). The earlier routes failed on the carrier's facing mirror (a held prop jumps across the body) and on the post-arrival walk cycle. The fix is motor-side and minimal: a holder sent behind its facing takes a 0.3 s foot replant and then walks backward at half speed **without turning**, and a shaped placing release carries the hand outward before the prop opens. Geometric evidence at the rest frame f150: prop rest x 797.6, y 396 (declared counter 400, Δ4 px); drawn thermos solid x 770.6–841.1; nearest body part 26.8 px (awei's forearm), awei torso 45.8 px, lin torso 112.7 px; the art contact shadow spans x 770.6–824.6 at y 404.3, entirely clear of both bodies.

**Joint stiffness addressed** (M4 P2). The receiver's bind now settles into a shaped breathing hold instead of a locked carry: the bind-to-carry phase moves the elbow 47.3° and the forearm 65.4°, and the stationary hold keeps moving (upper 5.5°, forearm 3.7°) where the pre-M5 hold could sit identical for 6 frames. Contact and prop ownership stay exact because the breath is applied to the hand the prop rides, not to the drawn arm alone.

**Counter/floor depth** (M4 P2). Set-side only, no motor change: the counter's floor contact shadow is now three nested footprints plus a base contact line and end occlusion, so the counter base reads against the boards rather than floating. No other set art changed.

**Legacy trajectories.** All 11 existing episodes recompile with byte-identical motor bakes (sha256 of the full actor/prop tracks; only `m5-acting` is new). The push fix (approach follows the target's live mark) changes no existing episode because their targets are stationary at their staged marks.

**Evidence** (`/tmp/m5view/`, never in Git): 960-wide JPEGs `pickup-prep/key`, `handover-prep/key`, `putdown-prep/key`, `point-prep/key`, `surprise-prep/key`, `push-prep/key` (frames 5/53, 60/66, 127/136, 154/168, 183/206, 228/249), the full `putdown-rest` f150 and `putdown-rest-crop.jpg` (the prop, its shadow and the nearby bodies at 960 px). A fresh vision review confirms the perceptual criteria; WP4 owns the moving clips and the bundle.

**Gates.** `npm run typecheck` exit 0; `npm test` 276/276 (5 new in `packages/core/test/actingBeats.test.ts`); `npm run smoke` SMOKE PASSED; `anim check episodes/m5-acting/episode.yml` OK; `git diff --check` clean. The legacy trajectory check compiled all 11 existing episodes against the pre-WP3 and post-WP3 motor: every motor bake sha256 is identical, and `m5-acting` is the only added entry.

**Residual limits.** The study is silent; the surprise's accent contrast is limited by a short travel; the push's accent/settle live in the target's stagger and recovery by motor contract; the set shadow is judged on frames by the vision reviewer. No moving clip is claimed here.

## Work-package split

| Package | Coverage and owner | Depends on | Acceptance |
| --- | --- | --- | --- |
| WP1 contract | This document; docs only | roadmap, M3/M4 docs, routed tickets | ≤200 lines; references resolve; `git diff --check` clean |
| WP2 motor acting | Anticipation / accent / settle parameters and pose shaping; owns `packages/core/src/motor`, additive bake fields, tests | WP1 | Unit tests for each shape; support/contact invariants unchanged; legacy trajectories diffed and disclosed; typecheck/test/smoke green |
| WP3 beat authoring | Retimes the six named beats in a dedicated episode; owns `episodes/m5-acting`, `library/action` defaults | WP2 | Each beat renders with a readable prep/key/accent/settle; putdown visibility closed; joint stiffness addressed |
| WP4 integration and gate | Comparison clips, gate logs, evidence bundle, milestone presentation | WP2+WP3 | Evidence plan satisfied; fresh perceptual review arranged; user judges |

End state: the user judges the presented comparison. Production replacement of
any further asset remains the user's call, exactly as for M2–M4.
