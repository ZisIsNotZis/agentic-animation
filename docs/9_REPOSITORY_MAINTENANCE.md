# INFERRED

## Repository maintenance

### Scope and source of truth

This repository is in active development. Keep public behavior data-driven:
`episode.yml` is the authored source, category plugins and manifests own reusable
craft, the compiler produces performance IR, and Remotion renders that IR.
Generated manifests, audio, images, and videos are evidence or build outputs,
not hand-maintained contracts.

When behavior changes, update the owning document in `docs/` first. Keep the
index and the README navigational; do not create parallel design documents.
Use `.scratch/` for temporary task lists and raw evidence, then promote only
reconciled conclusions to their level document and delete the note.

### How a document is shaped

A document is one level (`docs/<level>_<NAME>.md`) and one source zoning inside
it: `# EXPLICIT` for what the person said, `# CONFIRMED` for what they agreed to,
`# INFERRED` for what an agent decided — in that order, and each fact appears
once. A document states current fact, the evidence that proves it, and the
decision tree that reached it, so it never carries an event date, a commit hash
or a diary entry: those are captures and belong in `evidence/`. Below 200 lines;
the ceiling is what keeps a document readable at one sitting.

`npm run docs:lint` observes all of this, plus every relative link. It runs as
part of `npm test`, so a document that breaks the shape fails the suite rather
than waiting for a reviewer to notice.

### Normal change loop

1. Inspect current source, existing changes, and the owning document.
2. Make the smallest scoped change; preserve unrelated user work.
3. Run the narrowest relevant check, then the current typecheck/tests.
4. For render or asset work, inspect representative visual/audio artifacts.
5. Record command results, skips, and blockers in [0_ROADMAP](0_ROADMAP.md) or task evidence.
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

### Content and asset rules

- Use only the canonical YAML DSL; deprecated authoring forms are rejected.
- Reference reusable assets by category-relative library path; do not add `id`, `version`, or `implementationKey` to category asset metadata.
- Scene context belongs in episode locations and world composition, not unrelated asset namespaces.
- Keep model and license provenance with asset `manifest.json` metadata; asset
  identity is its category-relative directory path, and there is no registry index.
- Do not add no-op or silent fallbacks for missing story requirements.
- Do not commit secrets or generated outputs unless the owning contract requires them.
- Episodes are demos until a release explicitly says otherwise.

### Releases and collaboration

The package is `0.0.0` while the DSL and IR are evolving. Treat schema, DSL, plugin-contract, and renderer-input changes as potentially
breaking; document them in `DECISIONS.md` and update status evidence. A release should include
tested artifacts and representative QA, not merely a passing typecheck.

Issues should contain reproduction steps, input, environment, and evidence.
PRs should identify the owning document, include focused validation, and call
out limitations. Maintainers retain review and merge authority.
