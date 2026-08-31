# agentic-animation — Agent Operating Guide

A general, agent-operated 2D animation toolkit: written story → narrated,
lip-synced, deterministic MP4. **Read [docs/INDEX.md](docs/INDEX.md) first.**
Read the owning canonical document before changing its subsystem, and update
that document before changing public behavior. Current work state is in
[docs/HANDOFF.md](docs/HANDOFF.md); licensing remains binding in DECISIONS.

## Non-negotiables

- **No generative video.** Generated *stills* for assets only; all motion is
  code (puppet transforms + keyframes) rendered by Remotion.
- **Determinism.** Render output is a pure function of committed inputs. No
  `Math.random()`/`Date.now()` at render time — seeded noise only, seeds
  recorded in manifests.
- **Generate once, assemble many.** Never regenerate an approved character.
  New look = new `v<N+1>` via `anim char …`; episodes pin `<id>@v<N>`.
- **Generated manifests** (`timeline.json`, `episode.build.json`, `cues/`) are
  never hand-edited — re-run the producing stage.
- **Visual QA is a gate.** After `preview`, inspect representative frames and
  iterate before `render-yaml`. A change that is not visually
  verified does not ship.
- **License hygiene.** Every generated asset's `meta.json` records model +
  license. No FLUX-family models without an explicit config override.

## Commands (all via `anim`, run `anim --help` for flags)

`doctor` (preflight) · `char new|gen|cut|rig|approve` · `check <episode.yml>` ·
`make <episode.yml>` · `preview <episode.yml>` · `render-yaml <episode.yml>` ·
`npm run smoke` (canonical no-model smoke test).

## Layout

`packages/core` schemas + adapter interfaces (the contract — change these
deliberately) · `packages/adapters/*` one capability each ·
`packages/studio` Remotion puppet runtime · `library/` versioned assets ·
`episodes/<slug>/` per-episode workspaces · `py/` uv-managed Python sidecars ·
`tools/` setup + doctor.

Story corpus: optional read-only external repo configured explicitly with
`ANIM_CORPUS_ROOT`; no sibling path is assumed by default.

Skills: `.claude/skills/make-character`, `make-episode`, `qa-stills`.
