---
name: production-pipeline
description: Run or diagnose this repository's canonical episode.yml production path, including Edge TTS, measured timing, compilation, preview, Remotion rendering, retries, and final media verification.
---

# production-pipeline

Read [docs/PIPELINE.md](../../../docs/PIPELINE.md),
[docs/NARROW_EPISODE_DSL.md](../../../docs/NARROW_EPISODE_DSL.md), and
[docs/SCHEMAS.md](../../../docs/SCHEMAS.md). The only production source is
`episode.yml`.

## Loop

1. Inspect config and run `npm run anim -- doctor`. Confirm Edge TTS is the
   configured production adapter and its environment is reachable.
2. Run `npm run anim -- check <episode.yml>`. Resolve every error at the
   source, registry, or asset owner; do not add fallbacks.
3. Run `npm run anim -- make <episode.yml>` with the configured speed. Use
   `--voice-speed <n>` only for an explicit run override; inline
   `actor.voice.speed(n)` wins for following chunks.
4. Run `npm run anim -- preview <episode.yml>` and inspect representative
   stills/frames from `/tmp`. Include entrances, focus changes, movement,
   overlap-prone groups, props, speech, and effects.
5. Repair source/assets and repeat until framing, continuity, action, lips,
   subtitles, and audio are visibly correct. Then run `render-yaml`, using the
   Remotion upstream skill for renderer-specific details.
6. Verify the MP4 with `ffprobe`: duration, video/audio streams, dimensions,
   captions where present, and loudness. Preserve logs and QA artifacts in
   `/tmp`; report exact commands and limitations.

For transient network TTS or render failures, retry the failed operation while
preserving completed cache entries. A successful process exit without artifact
inspection is not completion.

Completion: check passes, the compiled output is current, representative QA is
inspected, and the final media checks have concrete evidence.
