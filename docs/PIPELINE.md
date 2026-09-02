# Assets-first production pipeline

## 1. Inventory the story

Extract cast, locations, interactive objects, recurring expressions/actions,
camera needs, voice ranges, effects, sound cues, and background layers. Convert narration
into playable first-person dialogue. Completion: every visible or audible story
requirement maps to an existing asset or an explicit asset-production task.

## 2. Prepare assets

Build or select approved category assets before script lock. Figures need
native 30-45 degree views, complete rigs, sockets, hand shapes, eye/mouth/face
sets, and compatible actions. Locations need detailed layers and semantic
staging metadata. Procedures need typed calls, timing, claims, and recipes.

Generate contact sheets and motion previews; inspect them multimodally. Audit
voice profiles with representative emotional lines. Completion: every selected
asset passes visual/audio QA and has no placeholder or no-op behavior.

## 3. Author and validate YAML

Write only the language in `NARROW_EPISODE_DSL.md`. Use location relationships
and facing; let staging own coordinates. Put calls at exact dramatic/audio
boundaries. Run `anim check` continuously. Completion: zero unresolved calls,
invalid spans, resource conflicts, or legacy fields.

## 4. Build audio-authoritative timing

Split dialogue at braces and voice-state changes, synthesize measured chunks,
assemble canonical voice audio, then schedule calls around those measurements.
Generate captions and lips from that same timeline. Mix sound/BGM with dialogue
ducking and loudness normalization. Completion: an audio QA report proves text,
subtitles, lips, and events share one timing source.

Network TTS adapters retry each individual request indefinitely with capped
backoff. Completed chunks remain cached; transient provider failure must never
terminate or restart the episode build.

## 5. Compile performance

Discover ordered category plugins, resolve staging, procedures, constraints, and generic tracks into immutable IR.
Compilation must fail on missing assets, incompatible rigs, overlapping claims,
impossible ownership, and unmatched spans. Completion: renderer input contains
all visible body/face/gaze/object/camera/effect tracks and provenance hashes.

## 6. Inspect short passes

Render representative stills and short clips around entrances, interactions,
interruptions, span actions, expressions, close-ups, and transitions. Inspect
framing, continuity, gesture readability, eye direction, subtitle timing, lip
motion, voice naturalness, and audio balance. Fix assets or YAML at their owning
layer and repeat several passes. Completion: sampled source calls are visibly
and audibly present at their authored synchronization points.

Generate a call-coverage receipt for the whole episode. Every inline call must
resolve to at least one renderer-consumed track or audible cue. Visual calls
must pass an obviousness review at their start, peak, and recovery frames: a
compiled event with no perceptible frame difference is a failed asset. Camera
calls change framing; body calls change silhouette; gaze/face calls change eye
or facial geometry; prop calls show the object and preserve continuity. The
receipt enumerates every occurrence, not only each procedure name, and records
the three sampled frames plus a human verdict. Missing samples or failed
verdicts block delivery; contact sheets are reviewed at delivery resolution.

Character QA also blocks on connected joints at every sampled pose, consistent
limb outlines without visible rig markers, readable eye contact, and distinct
face silhouettes across emotion families. Speech previews must show a
deterministic open/closed mouth cadence. Scene QA samples every location family,
checks actor/background layer order, and confirms target-bound effects are centered
on their actor or object rather than the canvas.

## 7. Benchmark before full render

Render the first 180 seconds at 1280x720, 24fps, four workers. Compare wall time,
peak RSS, crashes, and visual output against the current accepted baseline of
452 seconds and 744 MB peak RSS. A material regression requires diagnosis before
full render. Keep configurable concurrency; do not run model generation beside
Chromium rendering.

## 8. Render and final QA

Render the full video from the inspected IR and canonical mix. Verify duration,
streams, subtitle content, representative frame contact sheet, audio loudness,
and absence of frame exits or continuity jumps. Deliver only after inspecting
the final artifact, not merely after a successful process exit.

The committed render defaults are 1280x720 and four workers; explicit CLI
dimensions, frame rate, CRF, and thread overrides remain supported. Generated
audio, video, manifests, screenshots, and render caches stay ignored; all
temporary QA output belongs under `/tmp`.

## 8. Delivery encoding policy

Goal: smallest file at fair-enough quality. `render-yaml` re-encodes the
Remotion intermediate in the final mux (never `-c:v copy`):

- 1280x720, constant 24fps (CFR — VFR is rejected for player/editor
  compatibility), rendered by four Remotion workers (`render.concurrency`).
- Codec by availability: AV1 (`libsvtav1` crf 33 preset 8, g 240) > H.265
  (`libx265` crf 28) > H.264 (`libx264` crf 20). `render.encode.codec`
  forces one; `auto` probes. An NVIDIA RTX 40-series GPU can substitute
  `av1_nvenc` for long legacy transcodes where CPU speed matters.
- Audio AAC 128k, MP4 with `+faststart`, subtitles burned as soft `mov_text`
  tracks. Voice default `tts.speed` 1.2.
- Existing long-form deliveries may be transcoded in place to this bar.

`anim make episode.yml --voice-speed <n>` and `anim render-yaml episode.yml
--voice-speed <n>` override the configured `tts.speed` for this canonical run.
The value must be greater than zero. Inline `voice.speed(...)` calls take
precedence for their subsequent dialogue chunks.

## Operating rule

Docs define intent, assets encode reusable craft, YAML directs performance, IR
proves compilation, and Remotion only renders. When a discovery changes public
semantics, update docs first. Implementation work is delegated in disjoint
paths; the integrating agent owns review and end-to-end evidence.
