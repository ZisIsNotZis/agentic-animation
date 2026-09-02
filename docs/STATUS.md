# Project status

Last reconciled: 2026-09-02. Status: **plugin-host architecture implemented; docs reconciled to [WORLD_PLUGIN_CONTRACT.md](WORLD_PLUGIN_CONTRACT.md)**.

The canonical contract is [WORLD_PLUGIN_CONTRACT.md](WORLD_PLUGIN_CONTRACT.md); [PLUGIN_HOST_MIGRATION_PLAN.md](PLUGIN_HOST_MIGRATION_PLAN.md) is historical reference for how Steps 1-2 were executed.

## Done now

- The plugin-host engine is implemented: filesystem discovery of
  `library/<category>/plugin.js`, `before`/`after`/`priority` ordering with
  cycle detection, per-frame whole-world plugin chaining, start/tick/stop
  lifecycle with stable invocation IDs, JSON-only plugin state, and
  checkpoint/replay support.
- Procedure semantics live as static members of category plugins; the
  TypeScript-authored procedure catalog was removed and
  `loadProcedureDefinitions` discovers plugins.
- `library/<category>/<name>/manifest.json` asset manifests replaced registry
  metadata; asset identity is the category-relative path and there is no
  registry index.
- The 14 canonical categories exist as plugin categories: `figure`, `voice`,
  `set`, `prop`, `dressing`, `layout`, `action`, `emotion`, `gaze`, `movement`,
  `camera`, `effect`, `sound`, `music` (face_rig/face_overlay are reserved in
  the face model).
- Episode demos use the plugin-host call grammar: `<actor>.<category>.<terminal>(...)`
  for actor procedures, subject-less `camera.*`, `effect.*`, `sound.*`,
  `music.*`, and `<object>.prop.<terminal>(...)` for object subjects.
- Active episode asset references use canonical slash paths such as
  `figure/aqiang`, `voice/zh/aqiang`, and `set/agent_stage`, and active asset
  metadata uses `manifest.json`.
- Earlier baseline checks that passed: `npm run typecheck`; `npm run test:all`
  with 128 passed, 7 skipped, 0 failed; all three episode validation commands;
  `npm run skill:audit`; and `git diff --check`.

## Not done

- Existing MP4 files have not been regenerated against the plugin-host runtime.
- The three episodes have not yet been fully re-verified through final media QA
  under the plugin-host runtime.
- Legacy terminology and historical generator/schema concepts may remain in
  non-authoritative source, tests, and schema artifacts.

## Explicitly preserved

Existing checked-in MP4 files remain untouched. Generated audio, video, manifests, screenshots, caches, and temporary QA artifacts remain outside the source change set.

## Next

Re-verify the demo episodes through the plugin-host runtime end to end, regenerate representative renders, and record evidence here.
