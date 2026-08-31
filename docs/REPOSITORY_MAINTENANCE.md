# Repository maintenance

## Scope and source of truth

This repository is in active development. Keep public behavior data-driven:
`episode.yml` is the authored source, versioned library assets own reusable
craft, the compiler produces performance IR, and Remotion renders that IR.
Generated manifests, audio, images, and videos are evidence or build outputs,
not hand-maintained contracts.

When behavior changes, update the owning document in `docs/` first. Keep this
index and the README navigational; do not create parallel design documents.
Use `.scratch/` for temporary task lists and raw evidence, then promote only
reconciled conclusions to [STATUS.md](STATUS.md) or the owning contract.

## Normal change loop

1. Inspect current source, existing changes, and the owning document.
2. Make the smallest scoped change; preserve unrelated user work.
3. Run the narrowest relevant check, then the current typecheck/tests.
4. For render or asset work, inspect representative visual/audio artifacts.
5. Record command results, skips, and blockers in `STATUS.md` or task evidence.
6. Review `git diff --check` and the scoped diff before handoff.

Useful checks:

```sh
npm run typecheck
npm test
npm run test:all
npm run anim -- doctor
npm run anim -- check episodes/ai-work-adventure/episode.yml
git diff --check
```

Do not call a connection failure, skipped test, or successful build visual QA.
State exactly what was and was not verified.

## Content and asset rules

- Use only the canonical YAML DSL; deprecated authoring forms are rejected.
- Pin reusable assets to immutable IDs such as `figure.office.awei.v1`.
- Keep model, asset, and license provenance with artifact metadata.
- Do not add no-op or silent fallbacks for missing story requirements.
- Do not commit secrets or generated outputs unless the owning contract requires them.
- Episodes are demos until a release explicitly says otherwise.

## Releases and collaboration

The package is `0.0.0` while the DSL and IR are evolving. Treat schema, DSL,
asset registry, and renderer-input changes as potentially breaking; document
them in `DECISIONS.md` and update status evidence. A release should include
tested artifacts and representative QA, not merely a passing typecheck.

Issues should contain reproduction steps, input, environment, and evidence.
PRs should identify the owning document, include focused validation, and call
out limitations. Maintainers retain review and merge authority.
