# Documentation index

This directory is the project’s docs-first single source of truth. Read the
document owning a contract before changing implementation or an episode.

## Start here

- [STATUS.md](STATUS.md) — verified state, evidence, limits, and next work.
- [REPOSITORY_MAINTENANCE.md](REPOSITORY_MAINTENANCE.md) — upkeep and contribution rules.
- [NARROW_EPISODE_DSL.md](NARROW_EPISODE_DSL.md) — canonical `episode.yml` language.

## Design contracts

- [NARROW_EPISODE_DSL.md](NARROW_EPISODE_DSL.md): complete agent-authored YAML language.
- [SCHEMAS.md](SCHEMAS.md): registry, procedure asset, compiler IR, and validation contracts.
- [ARCHITECTURE.md](ARCHITECTURE.md): module seams and runtime data flow.
- [PIPELINE.md](PIPELINE.md): assets-first production and QA workflow.
- [DECISIONS.md](DECISIONS.md): durable technology, licensing, and migration decisions.
- [HANDOFF.md](HANDOFF.md): current implementation status and executable checks.
- [schemas/](schemas/): exported JSON Schema artifacts.

## Precedence

For public behavior, the DSL and schemas win. Architecture defines module
ownership; pipeline defines operating order; decisions define durable choices;
status and handoff report current evidence and limits. README files explain the
project for users but do not override contracts.

If implementation or an episode contradicts a contract, update the owning
document, then change code or content. `.scratch/` is working material and
evidence capture, not a public contract; promote only reconciled conclusions.

All maintained Markdown in this documentation set stays below 200 lines.
