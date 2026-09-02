# Project status

Last reconciled: 2026-09-02. Status: **plugin-host migration incomplete; paused for manual design confirmation**.

The authoritative scope and sequence are documented in [PLUGIN_HOST_MIGRATION_PLAN.md](PLUGIN_HOST_MIGRATION_PLAN.md). No further implementation should start until the user confirms the world contract, taxonomy, lifecycle, ordering, coordinate, and face model.

## Done now

- The canonical `World` shape, normalized canvas schema, plugin-chain prototype, deterministic ordering, lifecycle chaining, and focused tests exist.
- Active episode asset references were migrated to canonical slash paths such as `figure/aqiang`, `voice/zh/aqiang`, and `set/agent_stage`.
- Active asset directories were moved out of historical `v1` paths and active asset metadata was renamed to `manifest.json`.
- The smoke fixture was migrated to copy canonical category directories and `npm run smoke` passes.
- The latest baseline checks passed: `npm run typecheck`; `npm run test:all` with 128 passed, 7 skipped, 0 failed; all three episode validation commands; `npm run skill:audit`; and `git diff --check`.
- Existing MP4 files were not regenerated.

## Not done

- Step 1 has not been manually approved before implementation; this is now the stopping boundary.
- The engine does not yet discover and execute `library/<category>/plugin.js`; no category plugin files are currently present.
- The production compiler still depends on `packages/core/src/procedures/catalog.ts` and `packages/core/src/procedures/resolver.ts`.
- `library/action/manifest.json` is still a centralized procedure manifest rather than plugin-owned category discovery.
- Semantic action, face, gaze, movement, camera, effect, sound, and music behavior has not been fully moved into category plugins.
- The full migration has not yet removed all legacy terminology and historical generator/schema concepts from maintained source and tests.
- The three episodes have not yet been verified through the final plugin-host runtime, and no new video render or final media QA has been performed.

## Explicitly preserved

Existing checked-in MP4 files remain untouched. Generated audio, video, manifests, screenshots, caches, and temporary QA artifacts remain outside the source change set.

## Next action after confirmation

Implement Step 2, then migrate and verify Step 3 exactly as specified in [PLUGIN_HOST_MIGRATION_PLAN.md](PLUGIN_HOST_MIGRATION_PLAN.md).
