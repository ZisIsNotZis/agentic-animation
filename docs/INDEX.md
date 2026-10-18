# Documentation index

This directory is the project’s docs-first single source of truth. Read the
document owning a contract before changing implementation or an episode.

## Start here

- [STATUS.md](STATUS.md) — milestone state and links to owning evidence.
- [ART_CHARACTER_M2.md](ART_CHARACTER_M2.md#current-state-and-recovery) —
  M2 current state, evidence archive locations and recovery.
- [tickets/M2-DOC-READINESS.md](tickets/M2-DOC-READINESS.md) — task contract,
  historical provenance and documentation readiness audit.
- [REPOSITORY_MAINTENANCE.md](REPOSITORY_MAINTENANCE.md) — upkeep and contribution rules.
- [NARROW_EPISODE_DSL.md](NARROW_EPISODE_DSL.md) — canonical `episode.yml` language.
- [ART_ASSET_PROGRAM.md](ART_ASSET_PROGRAM.md) — the three new situations (rally,
  bar swing, pouring tea), four new native figures, capability contract, ownership
  and waves.

## Design contracts

- [NARROW_EPISODE_DSL.md](NARROW_EPISODE_DSL.md): complete agent-authored YAML language.
- [SCHEMAS.md](SCHEMAS.md): source, plugin, compiler IR, and validation contracts.
- [ARCHITECTURE.md](ARCHITECTURE.md): module seams and runtime data flow.
- [WORLD_PUPPET_MOTOR.md](WORLD_PUPPET_MOTOR.md): physical motion model — support/contact/reaction invariants, compile-time motor simulation, trajectory bake format.
- [WORLD_PLUGIN_CONTRACT.md](WORLD_PLUGIN_CONTRACT.md): canonical world/plugin contract — library layout, categories, world type, plugin lifecycle, ordering, and state rules.
- [SHOWCASES.md](SHOWCASES.md): minimal per-capability showcase episodes (states, actions, camera, effects, props, voice, particle snow).
- [tickets/PLUGIN_HOST_MIGRATION_PLAN.md](tickets/PLUGIN_HOST_MIGRATION_PLAN.md): historical migration plan; Steps 1-2 are implemented. Kept for reference, superseded by [WORLD_PLUGIN_CONTRACT.md](WORLD_PLUGIN_CONTRACT.md).
- [PIPELINE.md](PIPELINE.md): assets-first production and QA workflow.
- [ART_PRODUCTION_UPGRADE.md](ART_PRODUCTION_UPGRADE.md): approved M0–M8 art-quality roadmap, preservation boundaries, learning coverage and comparison budget.
- [ART_BASELINE_M0.md](ART_BASELINE_M0.md): frozen short-scene baseline and inspected evidence for that roadmap.
- [ART_DIRECTION_M1.md](ART_DIRECTION_M1.md): accepted B direction, preserved A/B/C studies and selection evidence.
- [ART_CHARACTER_M2.md](ART_CHARACTER_M2.md): B-character identity/draft-rig work and canonical-engine integration boundary.
- [ART_WORLD_M3.md](ART_WORLD_M3.md): M3 world contract — one coherent canteen set, set-metadata consumption, support agreement and package split.
- [ART_MATERIALS_M4.md](ART_MATERIALS_M4.md): M4 materials/light contract — declared material and light passes, layer compositing declaration, layered ablation plan and limits.
- [ART_ACTING_M5.md](ART_ACTING_M5.md): M5 acting contract — anticipation, key pose, accent, settle for the named beats.
- [DECISIONS.md](DECISIONS.md): durable technology, licensing, and migration decisions.
- [schemas/](schemas/): exported JSON Schema artifacts.

## Precedence

For public behavior, the DSL and schemas win. Architecture defines module
ownership; pipeline defines operating order; decisions define durable choices;
status routes current milestone state; each milestone document owns its evidence,
acceptance and next actions. Tickets own process history/provenance. README files explain the
project for users but do not override contracts.

If implementation or an episode contradicts a contract, update the owning
document, then change code or content. `.scratch/` is working material and
evidence capture, not a public contract; promote only reconciled conclusions.

All maintained Markdown in this documentation set stays below 200 lines.
