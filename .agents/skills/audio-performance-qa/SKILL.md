---
name: audio-performance-qa
description: Diagnose or verify Edge TTS, voice speed, audio-authoritative timing, subtitles, speech metadata, lip cadence, and renderer-visible mouth changes.
---

# audio-performance-qa

Read [docs/PIPELINE.md](../../../docs/PIPELINE.md),
[docs/NARROW_EPISODE_DSL.md](../../../docs/NARROW_EPISODE_DSL.md), and the
current audio/studio tests.

## Contract

Edge TTS is the production adapter in `anim.config.json`; verify its runtime
environment with `anim doctor`. The global speed default is `tts.speed: 1.2`.
CLI `--voice-speed` overrides it for a run, and a later inline
`actor.voice.speed(n)` overrides it for subsequent chunks. Values are finite
and positive. Speed participates in cache identity and measured timing.

Audio measurements are the timing authority for speech, captions, lips, and
calls. The renderer must consume speech metadata and alternate open/closed
mouth state deterministically; speed changes cadence. Non-speech expressions
remain authoritative.

## Check

Verify cache keys differ by speed, measured chunk timing carries speed, speech
events carry the metadata, and two sampled frames visibly differ in mouth
state. Compare subtitle boundaries with the encoded audio and run loudness and
stream checks with `ffprobe`/`ffmpeg`. Use `/tmp` for generated samples.

Completion: focused tests pass and a real or representative render proves
audible timing, subtitle alignment, and visible renderer-consumed mouth motion.
