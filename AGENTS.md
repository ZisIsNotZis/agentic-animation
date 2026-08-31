# agentic-animation

This repository is under active development. Read `docs/INDEX.md` before
changing public behavior, then update the owning document before code.

The single authored production input is `episode.yml`; the supported path is
`check`, `make`, `preview`, and `render-yaml`. Reusable assets are versioned in
`library/`, motion is code-driven, and Remotion renders the compiled
performance manifest. Existing episodes are demonstrations, not finished
commercial productions.

Do not commit generated audio, video, screenshots, render caches, manifests,
or temporary files. Use `/tmp` for disposable work. Run typecheck, tests, the
canonical smoke test, and `git diff --check` before handoff. For visual changes,
inspect representative rendered frames manually.

Keep documentation under `docs/` as the single source of truth. Put temporary
task lists in `.scratch/` only while working, then promote durable conclusions
to the owning document and remove the scratch note. Do not add a parallel DSL
or pipeline. Historical stage names, where mentioned, must be explicitly
marked deprecated and must not be presented as entry points.
