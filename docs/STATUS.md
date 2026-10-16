# Project status

## Engine milestone

Status: **closed (engine milestone)** — the plugin-host engine is implemented
end-to-end; three demonstration episodes validate, compile and render through
the canonical YAML pipeline. Deferred backlog does not block engine usability.
The canonical engine contract is [WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md);
[PLUGIN_HOST_MIGRATION_PLAN](PLUGIN_HOST_MIGRATION_PLAN.md) is historical reference.
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
M3–M8 are planned, not delivered.

## Motion and demonstrations

Motor slices 1–2 are shipped, and vocabulary migration (3) is delivered:
seven actions (bow, nod, shiver, point, raise_hand, dismiss, think) are motor
intents with their regex pose paths deleted, independently reviewed at
`d863f96`. Falls (4) remain pending. Eight-view orientation/fabric is shipped separately, not motor Slice 3.
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
