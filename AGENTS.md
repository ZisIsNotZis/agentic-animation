# agentic-animation

This repository is under active development. Read `docs/INDEX.md` before
changing public behavior, then update the owning document before code.

The single authored production input is `episode.yml`; the supported path is
`check`, `make`, `preview`, and `render-yaml`. Reusable assets are versioned in
`library/`, motion is code-driven, and Remotion renders the compiled
performance manifest. Existing episodes are demonstrations, not finished
commercial productions.

This is the standalone main repository. Agent procedures live in
`.agents/skills/`; durable agent-only lessons live in `.agents/knowledge/`.
Start with `.agents/skills/agentic-animation/SKILL.md` when a task spans
subsystems. Third-party skills linked there are immutable.

The person's verdicts, the milestone state, the package order and every open
work item live in `docs/0_ROADMAP.md`; nothing else holds state. That document
and the level documents under `docs/` are maintained by the agent that owns this
project's roadmap, not by a worker package.

## Working spirit

Treat requests as outcomes to finish, with serious correctness and honest
evidence. Inspect the real repository before acting; preserve history, remotes,
licenses, and unrelated changes. Use TDD for behavior changes and manually
inspect visual, audio, and video artifacts. Keep docs and skills concise,
docs-first, and single-source; ordinary Markdown stays below 200 lines.

Delegate only genuinely independent work with explicit scopes, then review all
results in the main repository. Publication, destructive cleanup, broad
contract changes, and production-scale generation remain approval-gated unless
the user explicitly authorizes them. A failed command or partial result is not
completion.

Do not commit generated audio, video, screenshots, render caches, manifests,
or temporary files. Use `/tmp` for disposable work. Run typecheck, tests, the
canonical smoke test, and `git diff --check` before handoff. For visual changes,
inspect representative rendered frames manually.

## Documents

`docs/` is the single source of truth and is organized by level, not by
milestone: `docs/<level>_<NAME>.md`, where a lower level is closer to purpose
and wins on conflict — 0 staging/roadmap, 1 problem, 2 goal, 3 requirement,
4 use case, 5 product, 6 architecture and decisions, 7 interface, 8 detail,
9 implementation. Inside a document the H1s are its sources, in order:
`# EXPLICIT` (the person's own words), `# CONFIRMED` (what they agreed to),
`# INFERRED` (what an agent decided). Each fact has one home; a document states
current fact, its evidence and the decision tree, never an event date, commit
hash or diary entry — those are captures and live in `evidence/`.

`npm run docs:lint` (also part of `npm test`) observes the naming, the zones,
the 200-line ceiling, the no-diary rule and every relative link. When a
conclusion is worth keeping, put it in its level document; use
`docs/0_STAGING.md` only for information still in flight, and empty it into the
level documents rather than letting it accumulate.

Put temporary task lists in `.scratch/` only while working, then promote durable
conclusions to the owning document and remove the scratch note. Do not add a
parallel DSL or pipeline. Historical stage names, where mentioned, must be
explicitly marked deprecated and must not be presented as entry points.
