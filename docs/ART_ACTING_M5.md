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

## Work-package split

| Package | Coverage and owner | Depends on | Acceptance |
| --- | --- | --- | --- |
| WP1 contract | This document; docs only | roadmap, M3/M4 docs, routed tickets | ≤200 lines; references resolve; `git diff --check` clean |
| WP2 motor acting | Anticipation / accent / settle parameters and pose shaping; owns `packages/core/src/motor`, additive bake fields, tests | WP1 | Unit tests for each shape; support/contact invariants unchanged; legacy trajectories diffed and disclosed; typecheck/test/smoke green |
| WP3 beat authoring | Retimes the six named beats in a dedicated episode; owns `episodes/m5-acting`, `library/action` defaults | WP2 | Each beat renders with a readable prep/key/accent/settle; putdown visibility closed; joint stiffness addressed |
| WP4 integration and gate | Comparison clips, gate logs, evidence bundle, milestone presentation | WP2+WP3 | Evidence plan satisfied; fresh perceptual review arranged; user judges |

End state: the user judges the presented comparison. Production replacement of
any further asset remains the user's call, exactly as for M2–M4.
