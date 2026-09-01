---
name: agentic-animation
description: Use for any task in this repository involving episode.yml, the animation engine, assets, TTS, Remotion rendering, visual QA, or evolving the agent workflow. Route to the smallest local skill and its owning docs.
---

# agentic-animation

This is the repository skill. Read [AGENTS.md](../../../AGENTS.md) and
[docs/INDEX.md](../../../docs/INDEX.md) first. The authored input is
`episode.yml`; the engine compiles it to renderer-neutral performance IR and
Remotion renders that IR.

## Route the work

- New episode, render, or end-to-end production: `production-pipeline` and
  `make-episode`.
- Markdown/prose/theatrical script to engine source: `text-to-episode`, then
  `production-pipeline`.
- Crop, camera, off-screen actor, or overlap: `camera-staging` and `qa-stills`.
- TTS, timing, subtitles, lips, or speech mouth state: `audio-performance-qa`.
- New or changed puppet/assets: `make-character` and `qa-stills`; use the
  immutable `algorithmic-art`, `canvas-design`, or `svg-creator` skill only for
  their native asset formats.
- Remotion markup, captions, multimedia, studio, or rendering implementation:
  use the relevant upstream Remotion skill, then apply local QA contracts.
- Propose or autonomously improve the engine, skills, or docs:
  `self-improve`.

## Shared guardrails

Keep public contracts in `docs/`, executable agent procedures here, and durable
agent-only lessons in `.agents/knowledge/`. Inspect before editing, prefer the
smallest scoped change, and preserve unrelated work. Generated media, manifests,
screenshots, caches, and scratch notes belong outside commits.

Completion means the selected skill's checks pass and its evidence is recorded;
tests alone do not approve visual or audio quality.
