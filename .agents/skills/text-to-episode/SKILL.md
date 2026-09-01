---
name: text-to-episode
description: Convert arbitrary prose, Markdown, or theatrical scripts into this repository's canonical episode.yml, preserving meaning while mapping scenes, actors, actions, and camera intent to registered assets.
---

# text-to-episode

Read [docs/NARROW_EPISODE_DSL.md](../../../docs/NARROW_EPISODE_DSL.md),
[docs/SCHEMAS.md](../../../docs/SCHEMAS.md), and the asset registry before
writing YAML. This is an authoring workflow, not a second DSL or a generic
storyboard format.

## Convert

1. Read the complete source. Extract title/language, beats, scene boundaries,
   actors, narration/dialogue, objects, locations, emotional intent, movement,
   camera intent, and timing cues.
2. Preserve the source's meaning and uncertainty. Assign a speaker only when
   the text establishes one; flag ambiguity instead of inventing it.
3. Map each requirement to existing versioned assets and typed procedures.
   Report missing assets, unsupported actions, and details that cannot be
   represented before proceeding.
4. Write only canonical `episode.yml`: semantic IDs, relationships, direct
   dialogue, and typed brace calls. Use no pixel coordinates or legacy JSON,
   storyboard, `say`, `run`, or cue syntax.
5. Run `npm run anim -- check <episode.yml>`, repair until clean, and present
   unresolved review items. Do not synthesize or render before review.

The two Markdown files beside the demo YAML are reference examples: the
Chinese theatrical script demonstrates stage directions and dialogue; the
Agentic Coding guide demonstrates instructional prose becoming narrated
explanatory scenes. Use excerpts as mapping examples without copying either
source into this skill.

Completion: YAML validates, every extracted requirement is mapped or explicitly
reported, and the source Markdown remains unchanged.
