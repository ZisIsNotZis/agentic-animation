# M3-WORLD-CONTRACT — M3 world owning contract and work-package split

## Task contract (dispatch record)

- Goal: author the M3 World owning contract `evidence/art/ART_WORLD_M3.md` and this
  ticket; no code, no art, no media in this package.
- Scope: documents only. Exclusions: implementation, set artwork, renders,
  commits, pushes, publication, production replacement, new dependencies or
  services, any change to existing dirt/staging/history/assets/audio.
- Authoritative inputs, read once each: `docs/0_ROADMAP.md`
  (M3 row, user gates, comparison budget), `evidence/art/ART_CHARACTER_M2.md`,
  `docs/6_WORLD_PLUGIN_CONTRACT.md`, `docs/9_PIPELINE.md`, `docs/7_SCHEMAS.md`,
  `evidence/art/ART_BASELINE_M0.md`, `docs/INDEX.md`,
  `docs/9_REPOSITORY_MAINTENANCE.md`, repository `AGENTS.md`, and the read-only
  M3 recon `context.md` from the scout session
  `cda3a81c-3555-4abf-85a8-e597b2b41d24`.
- Files in scope: `evidence/art/ART_WORLD_M3.md` (new), `evidence/tickets/M3-WORLD-CONTRACT.md`
  (new), one navigation line in `docs/INDEX.md`.
- Owner: docs worker (sole writer, package 1 of M3). Parent owns dispatch,
  independent review and the user milestone gate.
- Acceptance: contract states outcome, non-goals, chosen set with rationale,
  engine additions with per-layer interfaces, 2D depth expression, support
  agreement, composition ownership, Art/Function/Production criteria with
  decidable conditions, evidence plan, package split; both files under 200
  lines; links resolve; `git diff --check` clean.
- Budget: one worker session, at most two review cycles, no media generation.
- Stop conditions: contract-level conflict with the roadmap or M2 acceptance
  record; an interface assumption the code contradicts; escalate, do not
  decide silently.

## Decisions

- 2026-10-14 21:41 +0800, worker: chosen set is the canteen counter scene
  (`set/school_canteen` lineage) rebuilt as draft `canteen_counter_m3`;
  rationale recorded in the contract's "Chosen set and rationale".
- 2026-10-14 21:41 +0800, worker: declared-but-unconsumed set manifest
  metadata (`layers`, `coordinateSpace`, `safeActorArea`) becomes consumed,
  not reduced; `supports` continues as the semantic channel; reasoning in the
  contract's "Engine capability additions".
- 2026-10-14 21:41 +0800, worker: the set is produced in the disposable draft
  library; `school_canteen` and all other existing sets stay unchanged;
  production replacement only after the user milestone judgment.

## Baseline and preservation

- HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3`; the tree is dirty with the
  M2 candidate (modified docs, core/studio/CLI packages, staged `.gitmodules`
  and vendor submodules, untracked skill links and M2 docs). All preserved;
  this package added files and one INDEX line only.
- Verified against code before writing: `school_canteen/manifest.json`
  declares `coordinateSpace "1920x1080"`, `layers [backdrop, midground,
  floor, interactive-zones]`, `safeActorArea {x:220,y:180,width:1480,
  height:720}`, `supports [{name:"counter", x:[230,1690], y:450}]`;
  `episodes/showcase-props/episode.yml` binds location `canteen` to
  `set/school_canteen`; `counter_contact_draft` does not exist in the
  repository library (M2 disposable draft); staging `on(X)` names declared
  set supports with the compiler's support-surface pass as authority;
  actor z is `40 + index*10` above the flat set background.

## Changes

- Added `evidence/art/ART_WORLD_M3.md` (owning contract; SSOT for M3 world scope).
- Added `evidence/tickets/M3-WORLD-CONTRACT.md` (this ticket; process record).
- Added one navigation line for the new contract to `docs/INDEX.md`.

## Commands and results

- `date '+%Y-%m-%d %H:%M:%S %z'` — 2026-10-14 21:41:11 +0800 (real clock).
- `git status --short`, `git rev-parse HEAD` — baseline recorded above.
- `grep` on `episodes/showcase-props/episode.yml`, `find library -iname
  "*counter*"`, targeted `grep` of `packages/core/src/staging/index.ts` —
  facts recorded above.
- Validation: link targets checked; `git diff --check` run on the final diff.

## Work-package split

Owned by `evidence/art/ART_WORLD_M3.md` "Work-package split": WP1 contract (this
package), WP2 engine consumption (TDD, SCHEMAS.md first), WP3 set art draft
(disposable library), WP4 integration, bounded evidence and the user
milestone gate presentation. WP2 and WP3 are parallel after WP1; WP4 needs
both. Fresh independent artifact/media review precedes the gate and is
arranged by the parent, not by writers.

## Evidence and continuation

- Next action: parent dispatches WP2 and WP3 with disjoint file ownership;
  each re-reads this contract and the recon before acting.
- This ticket records provenance only; current milestone state stays in
  `docs/0_ROADMAP.md` and the contract. No dated narrative inside the contract.

## Review

- Fresh independent review of this package: pending, parent-dispatched;
  reviewer contract is the acceptance section above plus both new files.
