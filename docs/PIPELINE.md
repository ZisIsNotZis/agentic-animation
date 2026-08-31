# Assets-first production pipeline

## 1. Inventory the story

Extract cast, locations, interactive objects, recurring expressions/actions,
camera needs, voice ranges, VFX, SFX, and background layers. Convert narration
into playable first-person dialogue. Completion: every visible or audible story
requirement maps to an existing asset or an explicit asset-production task.

## 2. Prepare assets

Build or select immutable versioned assets before script lock. Figures need
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
Generate captions and lips from that same timeline. Mix SFX/BGM with dialogue
ducking and loudness normalization. Completion: an audio QA report proves text,
subtitles, lips, and events share one timing source.

Network TTS adapters retry each individual request indefinitely with capped
backoff. Completed chunks remain cached; transient provider failure must never
terminate or restart the episode build.

## 5. Compile performance

Resolve staging, procedures, constraints, and generic tracks into immutable IR.
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
checks actor/background layer order, and confirms target-bound VFX are centered
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

## Operating rule

Docs define intent, assets encode reusable craft, YAML directs performance, IR
proves compilation, and Remotion only renders. When a discovery changes public
semantics, update docs first. Implementation work is delegated in disjoint
paths; the integrating agent owns review and end-to-end evidence.
