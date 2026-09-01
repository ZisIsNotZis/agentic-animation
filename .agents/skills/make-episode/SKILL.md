---
name: make-episode
description: Produce a deterministic narrated 2D episode from a story or existing episode.yml using this repository's canonical YAML, audio, performance, Remotion, and visual-QA workflow.
---

# make-episode

For arbitrary source prose, first use [text-to-episode](../text-to-episode/SKILL.md).
For production, use [production-pipeline](../production-pipeline/SKILL.md).
Read [docs/INDEX.md](../../../docs/INDEX.md) before edits.

1. Inspect the asset registry and episode directory. Reuse immutable versioned
   assets; route missing puppets to [make-character](../make-character/SKILL.md).
2. Write or refine the single `episode.yml` with semantic IDs, relationships,
   direct dialogue, and typed registry calls. Keep coordinates, manifests, and
   renderer fields out of source.
3. Run `npm run anim -- check episodes/<slug>/episode.yml` and repair every
   error. Unsupported actions and missing assets become explicit work.
4. Run make/preview. Inspect stills and short clips for containment, camera,
   acting, gaze, speech mouth state, object continuity, VFX, subtitles, audio,
   and layer order. Iterate at the owning layer.
5. Render only after current visual/audio review; verify final MP4 streams,
   duration, dimensions, captions, loudness, and continuity.

The Markdown sources in the demo directory are worked inputs for
[text-to-episode](../text-to-episode/SKILL.md), not executable DSLs.

Completion: canonical YAML validates, requirements are mapped or reported, QA
is inspected, and final media checks pass.
