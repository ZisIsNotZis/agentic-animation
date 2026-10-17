# BACKLOG (M5): the pre-roll hinges the waist — knees need the crouch, the crouch is not free

**Status: OPEN, routed from the M5 WP3 second review (2026-10-18).** Owner: M5
WP5 or a motor posture package. Not attempted in the review round: the fix is a
posture/reach design change, not an episode or shape-parameter tweak.

## Finding

The anticipation shape (`anticipation`, docs/WORLD_PUPPET_MOTOR "Acting shapes")
shifts the weight with a 10° waist lean and returns; the legs stay straight, so
the preparation draws as a torso hinge. The review asked for knees instead. On
`episodes/m5-acting` the lean profile measures +0.6, +2.0, 0, −0.8, −5.2, −10 at
the pickup (f0–5) with the drawn pelvis at 0 px, i.e. no knee flex at all.

## Why it is not a parameter change (measured blocker)

Bending the knees means spending the crouch, and the crouch is not a free acting
channel — it is the planted-foot posture the leg IK and the whole-body proposal
own. Two attempts were baked and reverted (evidence:
`.tmp/m5probe/kneeflex-attempt.diff`, `.tmp/m5probe/kneeflex-attempt.log`):

1. `crouch = approach(crouch, anticipationCrouch(t, dur))` — the flex ends at
   0 but the pre-roll replants the feet, leaving a support reserve; the point's
   fixed world aim then falls outside the arm and the proposal rejects the beat.
2. The same clamped to `state.supportMinimum` — the reserve sticks (a walking
   figure already needs ~0.09), and the point's aim lands 6.958 px short.

Both variants emit a motor diagnostic, which is a hard fail by contract:

    whole-body proposal exhausted: awei at 8.775s; palm-contact/hand_r 6.958 > 0.020

## Required design change

The reach aim must be solved **against the posture at the moment the reach
starts** (and re-solved as the body lowers), so a pre-roll crouch cannot put a
fixed world aim outside the bone reach; the pre-roll must also release its flex
without leaving a support reserve behind (replant in place, or restore the
stance before the beat's reach is computed). That is a motor posture design
change with a support/contact re-verification, not a new shape constant.

## Acceptance when picked up

- Each anticipated beat on `episodes/m5-acting` draws a knee flex during the
  pre-roll (drawn pelvis ≥ 12 px below the standing line at the lean peak) and
  starts the beat with no crouch of its own (≤ 0.02).
- No motor diagnostic; support and contact invariants unchanged; the drawn hand
  still lands on the baked reach within 5 px at every key frame
  (`packages/studio/test/renderTruth.test.ts`).
- Any retiming of the beats re-derives the evidence frames from the bake and
  restates the bake identity in the evidence index (docs/ART_ACTING_M5.md
  "Evidence identity").
