# Project status

## Engine milestone

Status: **closed (engine milestone)** — the plugin-host engine is implemented
end-to-end; three demonstration episodes validate, compile and render through
the canonical YAML pipeline. Deferred backlog does not block engine usability.
The canonical engine contract is [WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md);
[tickets/PLUGIN_HOST_MIGRATION_PLAN](tickets/PLUGIN_HOST_MIGRATION_PLAN.md) is historical reference.
The supported production workflow is owned by [PIPELINE](PIPELINE.md).

## Art-quality work

The approved [M0–M8 roadmap](ART_PRODUCTION_UPGRADE.md) remains active.
[M0](ART_BASELINE_M0.md) is a complete known-defective comparison capture, not
production approval. [M1](ART_DIRECTION_M1.md) is accepted with B selected and
A/B/C preserved. **M2 milestone judgment is met:** the user accepted the current
candidate (“我感觉没啥问题，自动推进”) at the trusted `m2-facial-object-20261014T0010`
entry; he did not itemize listening/lip-sync. On 2026-10-16 he opened the
production-path gate for `figure/lin_b_draft` only (“old characters shall still
be there, just not the top choice”): it is now the preferred production figure
via the figure category manifest `use` recommendation, while old figures stay
installed. No publication or spending was approved. Facts and accepted-revision
binding:
[tickets/M2-MILESTONE-ACCEPTANCE.md](tickets/M2-MILESTONE-ACCEPTANCE.md).
Current M2 evidence, remaining limits and next actions are owned only by
[ART_CHARACTER_M2](ART_CHARACTER_M2.md).
Task history and independent documentation findings live in the
[readiness ticket](tickets/M2-DOC-READINESS.md); historical STATUS evidence is
preserved in the [STATUS repair ticket](tickets/M2-STATUS-REPAIR.md).
M3–M8: M3 is delivered and judged met — the user said “Looks good enough” at
the gate bundle `m3-20261016T2305+0800`
([tickets/M3-MILESTONE-ACCEPTANCE.md](tickets/M3-MILESTONE-ACCEPTANCE.md));
`set/canteen_counter_m3` now backs the canteen scene in `showcase-props`,
while every legacy set stays installed. One M3 criterion was honestly failing
and routed onward: the putdown is geometrically on the painted top but
occluded by the clustered receiver
([ticket](tickets/BACKLOG-M5-PUTDOWN-VISIBILITY.md)). M5 WP3 closes it on
`episodes/m5-acting`: the rest is clear of the bodies with the carrying
step-back and shaped placement (measured in [ART_ACTING_M5](ART_ACTING_M5.md)).
A fresh image review of the WP3 evidence set failed three hard defects — the
two actors' drawn bodies colliding at the handover, the placed prop resting one
pixel high with the report comparing its anchor, and the pickup/point poses
folding instead of acting. All three are closed at their causes (drawn-body
separation, the scaled prop solid on the painted line, least-pitch grab
postures and a shaped, completed point) and pinned by
`packages/core/test/actingInvariants.test.ts`. M5 remains at its own gate. M4 is delivered and awaiting the
user's milestone judgment: the materials/light treatment composites with
non-luminance blend modes (`color` for pigment, `soft-light` for both light
passes), so ink contrast is 0.964–1.063 in all eight regions with no matte,
cut-out, tiled texture or raised layer, and the fifth perceptual review returned
ART PASS ([ART_MATERIALS_M4](ART_MATERIALS_M4.md)). Cost is measured, not
assumed: +65% wall time over the M3 baseline (53–70% across three sessions) at
concurrency 4. Routed onward: cross-session render non-determinism
([ticket](tickets/BACKLOG-RENDER-NONDETERMINISM.md)), and counter/floor staging
depth plus vector-puppet joint stiffness at the handover (M5).
M5 is delivered and awaiting the user's milestone judgment: `episodes/m5-acting`
performs six beats (pickup, handover, putdown, point, surprise, push) with
anticipation, accent and settle, and the third perceptual review returned
ACTING PASS on corrected evidence ([ART_ACTING_M5](ART_ACTING_M5.md), bundle
`m5-20261017T225432+0800`). Acting shapes are additive motor-intent data
(`anticipation`/`accent`/`settle`, defaults 0) — 11 existing episodes re-bake
byte-identically — and three invariants now guard the class: no actor-body
overlap, a placed prop's base on its declared support, and joint angles inside
their documented envelopes.
M6–M8 are planned, not delivered.

## Motion and demonstrations

Motor slices 1–2 are shipped, vocabulary migration (3) is delivered:
seven actions (bow, nod, shiver, point, raise_hand, dismiss, think) are motor
intents with their regex pose paths deleted, independently reviewed at
`d863f96`. Falls (4) are shipped: failed recovery cuts balance for a
balance-cut collapse (trigger, contract and limits owned by
[WORLD_PUPPET_MOTOR](WORLD_PUPPET_MOTOR.md#slices)). Eight-view
orientation/fabric is shipped separately, not motor Slice 3.
Motion implementation, geometry authority and scoped evidence are owned by
[WORLD_PUPPET_MOTOR](WORLD_PUPPET_MOTOR.md), including its
[body geometry contract](WORLD_PUPPET_MOTOR.md#body-geometry-ssot-drawn--collider).
Demonstration coverage and usage are owned by [SHOWCASES](SHOWCASES.md).
Historical validation counts, runtime checks and Visual-QA rounds are retained
in the repair ticket, not treated here as final-revision acceptance.

## Preservation boundary

Existing checked-in MP4 files remain untouched. Generated audio, video,
manifests, screenshots, caches and temporary QA artifacts stay outside the
source change set. Demonstrations are not finished commercial productions.

## Deferred engine backlog

Optional extensions, not prerequisites for the closed engine milestone:

- Per-frame plugin-owned canvas behavior (`run()` bodies beyond identity).
- Bailan visual asset upgrade: three distinct outlined character puppets,
  repointed cast and upgraded cultivation/arena sets.
- Full-episode showcase `render-yaml`; not required for rendering demos.
