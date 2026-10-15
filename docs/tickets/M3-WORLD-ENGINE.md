# M3-WORLD-ENGINE — WP2 set-metadata engine consumption

## Task contract (dispatch record)

- Goal: implement the engine capability that consumes set metadata, per
  `docs/ART_WORLD_M3.md` "Engine capability additions" (schema → registry
  normalization once at load → compiler/staging → IR → renderer adapter →
  evaluator/Stage compositing), docs-first (SCHEMAS.md before code), TDD.
- Scope: `packages/core` (schemas/libraryMeta, assets, staging, compiler),
  `packages/adapters/renderer-remotion/src/index.ts`,
  `packages/studio` Stage/PerformanceEpisode seams, this ticket,
  `docs/SCHEMAS.md` (world-declarations section appended).
- Exclusions: no parallax, DOF blur, per-element filters, 3D/z, camera
  changes, focal-hierarchy features; no motor behavior change; no edits to
  `library/` set assets, episodes, or the archive root; synthetic fixtures in
  tests only; nothing staged, committed or pushed; no publication, production
  replacement, destruction, new dependencies or services; all pre-existing
  dirt (M2 candidate), staging and audio preserved.
- Owner: engine worker, sole writer for this package; parent owns dispatch,
  fresh review and the user gate.
- Acceptance: unit tests for normalization, invalid/missing declaration
  failure, support-agreement tolerance (red case included), layer order and
  foreground occlusion, legacy flat path equivalence; typecheck, `test:all`,
  `smoke`, `git diff --check` green; legacy sets/episodes behavior unchanged.
- Budget: 45 min, command timeouts, durable checkpoint by 25 min.
- Stop conditions: contract conflict with the code that would force a
  product decision (none hit; see Decisions).

## Baseline and preservation

- HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3`; tree carried the M2
  candidate dirt (docs, core/studio/CLI, staged `.gitmodules` + vendor
  submodules, untracked M2 files). All preserved; nothing staged by this
  package. `docs/SCHEMAS.md`, `libraryMeta.ts`, `registry.ts`,
  `compiler/index.ts`, `Stage.tsx`, `PerformanceEpisode.tsx` were already
  dirty from M2 — this package edited them additively on top.

## Decisions

- 2026-10-14 21:47 +0800, worker: a set is world-declaring exactly when its
  `scene.svg` carries `<g id="...">` groups. Rationale: every existing
  set already declares `layers`/`safeActorArea`/`coordinateSpace` in its
  manifest while its SVG paints no id groups, so declaration-presence cannot
  be the trigger without breaking the mandated legacy flat path; the painted
  resource opt-in mirrors the `figureArtwork` precedent (`artwork.json`
  presence). Missing/invalid declarations then fail loading (no fallback).
- 2026-10-14 21:47 +0800, worker: support agreement is decidable at load by
  a painted measurement: each declared support names `paint` (SVG element
  id) whose element carries `data-support-top="<y>"`; load rejects drift
  beyond `SUPPORT_AGREEMENT_TOLERANCE = 8` coordinateSpace units. Legacy
  sets (no groups) are not checked — `school_canteen`'s committed
  y450-vs-painted-y390 stays as-is outside M3 scope.
- 2026-10-14 21:47 +0800, worker: per-layer text is keyed
  `<instance>/<layerId>` in `locationScenes` (instance-prefixed to stay
  collision-free across locations); legacy entries keep the instance key
  with the whole-document blob. `setViewBox` rides the IR so layer SVGs
  project intrinsic coordinateSpace onto the 1920x1080 stage.
- 2026-10-14 21:47 +0800, worker: foreground set layers composite at
  zIndex 70, above props (20), actors (40) and native grip planes (50/60),
  below front vfx; declared background layers stack from zIndex 0 in
  declared back-to-front order.

## Changes

- `docs/SCHEMAS.md`: "Set world declarations (M3 additive implementation)"
  section (activation, validation failures, tolerance, IR fields, preloader
  keys, compositing order, safeActorArea clamp semantics).
- `packages/core/src/schemas/libraryMeta.ts`: `SetLayerEntrySchema`,
  `SafeActorAreaSchema`, `SetSupportSurfaceSchema` (paint), strict
  `SetManifestSchema`, `NormalizedSetWorld`.
- `packages/core/src/assets/setWorld.ts` (new): SVG scanning
  (`svgGroupIds`, `svgGroupElement`, `svgViewBox`, `svgElementAttribute`)
  and `normalizeSetWorld` (validate + normalize once); exported via
  `packages/core/src/assets/index.ts`.
- `packages/core/src/assets/registry.ts`: set branch attaches normalized
  `world` for world-declaring sets, fails loading on missing/invalid
  declarations; legacy sets keep raw `supports` passthrough.
- `packages/core/src/staging/index.ts`: declared `safeActorArea` clamps
  actor placement (initial + collision bounds); heuristic default intact.
- `packages/core/src/compiler/index.ts`: scene-loop reads the scene's
  location world (was: first episode location), passes `safeActorArea` to
  `stageScene`, resolves `on(X)` and motor supports through normalized
  declarations (legacy raw passthrough unchanged), carries `setLayers`,
  `safeArea`, `supportSurfaces`, `setViewBox` on `CompiledScene`.
- `packages/adapters/renderer-remotion/src/index.ts`:
  `preloadLocationScenes` injects per-layer group text keyed
  `<instance>/<layerId>` for world sets; legacy blob unchanged.
- `packages/studio/src/components/performance/Stage.tsx`:
  `sceneForFrame` resolves declared layers + viewBox; `PerformanceStage`
  renders background layers in declared order; new
  `PerformanceForegroundLayers`.
- `packages/studio/src/components/PerformanceEpisode.tsx`: renders
  `PerformanceForegroundLayers` after the native planes.
- Tests: `packages/core/test/setWorld.test.ts` (6),
  `packages/studio/test/setLayers.test.ts` (4), staging safeActorArea case
  in `packages/core/test/staging.test.ts`.

## Commands and results

- `date '+%Y-%m-%d %H:%M:%S %z'` — 2026-10-14 22:08:40 +0800 (real clock).
- `npm run typecheck` — pass (exit 0).
- `npm run test:all` — 257 pass, 0 fail, 7 skipped (pre-existing skips).
- `npm run smoke` — SMOKE PASSED (legacy `set/agent_stage` flat path).
- `anim check episodes/showcase-props/episode.yml` — check: OK (real
  `school_canteen` legacy path, `on(counter)` still resolves).
- `git diff --check` — clean.
- Per-file targeted runs of `setWorld.test.ts`, `setLayers.test.ts`,
  `staging.test.ts` — all green. Red case exercised by construction:
  support declared y450 vs painted y390 rejects (asserted in
  `setWorld.test.ts` "support agreement" test).
- No render executed: compositing is covered by static-markup tests
  (zIndex/DOM order); media judgment deferred to WP4 per dispatch.

## Evidence hashes (sha256, worktree at 2026-10-14 22:08 +0800)

- docs/SCHEMAS.md 72aef01d…6168e
- packages/core/src/schemas/libraryMeta.ts ebc8831a…e242d
- packages/core/src/assets/registry.ts 93160ae8…1a1df
- packages/core/src/assets/index.ts 39d50611…4c48d
- packages/core/src/assets/setWorld.ts ad99489f…60142
- packages/core/src/compiler/index.ts 0429229a…745d9a
- packages/core/src/staging/index.ts 6f5caad8…284ddd
- packages/core/test/setWorld.test.ts 47076d2e…96874
- packages/core/test/staging.test.ts 1fb1fdfb…c1f5ec9
- packages/adapters/renderer-remotion/src/index.ts 9dc33ded…e41c28
- packages/studio/src/components/performance/Stage.tsx 44076523…1bc3f0
- packages/studio/src/components/PerformanceEpisode.tsx 72d6fb2a…7749fea
- packages/studio/test/setLayers.test.ts 5b8291ea…61ab401

## Interface WP3 art must satisfy

Draft `library/set/canteen_counter_m3` (disposable draft library):

- `scene.svg`: root `<svg>` MUST carry `viewBox="0 0 W H"` equal to the
  manifest `coordinateSpace` (`"WxH"`, e.g. `"1920x1080"`); every compositing
  layer is a `<g id="...">` (double-quoted id) — its presence is what
  activates the layered path; nested inner groups are allowed and render
  only through their declared ancestor.
- `manifest.json` (world fields, all values in coordinateSpace units):
  `coordinateSpace: "WxH"`; `layers`: ordered back-to-front entries, each a
  group id string or `{id, foreground: true}` (foreground composites above
  actors/props); `safeActorArea: {x, y, width, height}` optional (absent =
  10%-90% heuristic); `supports: [{name, x: [min, max], y, paint}]` where
  `paint` is the id of the SVG element that paints the surface and that
  element carries `data-support-top="<painted y>"` — |painted − y| must be
  ≤ 8 art units or asset loading fails.
- Failure is loud: missing `layers`/`coordinateSpace`, a declared id with no
  painted group, viewBox mismatch, or support disagreement all fail
  `anim check`/`make` at load (synthetic examples in
  `packages/core/test/setWorld.test.ts`).

## Review

- Fresh independent review: pending, parent-dispatched; reviewer contract is
  this ticket's Goal/Acceptance plus the changed files above, against the
  worktree (nothing is committed).
