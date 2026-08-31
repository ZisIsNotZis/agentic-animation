# Current migration handoff

## Target

Hard-cut the repository to the asset-typed DSL documented in
`NARROW_EPISODE_DSL.md`. Migrate the full `AI 打工奇遇记` episode and retain prior
asset quality, audio synchronization, QA, and threaded-render performance.

## Current truth

- The existing checked-in episode still uses Chinese IDs, `say/run`, cues,
  manual layout, and old procedure names.
- The current parser has no kwargs, concurrent brace calls, spans, state model,
  interruptions, or semantic scene declarations.
- Procedure resolution already produces structured body/expression/gaze data,
  but renderer projection primarily recognizes a generic gesture field and
  discards important tracks. Current video is therefore not faithful to YAML.
- Audio preparation already measures 265 spoken takes and produces a canonical
  mixed WAV. Preserve its measurement/cache work while changing segmentation.
- Existing 180-second 720p/24fps/four-worker benchmark: 452.01 seconds, peak RSS
  743716 KB. The MP4 under the episode dist path is currently that preview, not
  the full film.
- The worktree contains substantial user-owned changes and new files. Preserve
  unrelated work; do not reset or clean broadly.

## Implementation order

1. Freeze source, parsed-call, procedure-asset, and IR types from canonical docs.
2. Replace parser/schema and registry validation; delete legacy acceptance.
3. Implement audio chunks, scheduling modes, spans, state, silence, and speech
   interruption against measured audio.
4. Replace domain lifecycle switches with recipe events and constraints.
5. Implement semantic staging and project every generic track to the renderer.
6. Migrate the complete episode only after compatible assets are registered.
7. Run typecheck/tests, visual/audio passes, and the standard benchmark.

Use detailed disjoint Luna assignments for implementation and episode migration;
the main agent reviews interfaces, integrates, and performs final QA.

## Acceptance checks

```sh
npm run typecheck
npm test
npm run anim -- check episodes/ai-work-adventure/episode.yml
npm run anim -- make episodes/ai-work-adventure/episode.yml
```

Then render/inspect representative clips and the 180-second benchmark described
in `PIPELINE.md`. Record exact commands and results in
`.scratch/dsl-hard-cutover.md`.

## Non-negotiable failures

No unresolved/no-op procedure, fallback staging, subtitle inferred separately
from audio, dropped body/gaze track, renderer domain-verb switch, or legacy DSL
acceptance may remain at completion.
