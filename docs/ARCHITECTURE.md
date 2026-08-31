# System architecture

## Mission

Compile one strongly typed, agent-friendly `episode.yml` into a deterministic,
audio-synchronized 2D MP4. Richness comes from reusable assets; authoring stays
small, semantic, and hard to misuse. Motion is code-driven SVG/rig animation.

## Data flow

```text
approved asset library + episode.yml
  -> source schema and call parser
  -> registry resolution and compatibility validation
  -> segmented TTS and audio-authoritative scheduling
  -> automatic staging and procedure recipe expansion
  -> immutable performance IR
  -> Remotion frame evaluation -> QA -> MP4
```

The performance IR is the only renderer input. YAML parsing, procedure lookup,
timing inference, and action-name interpretation never occur during rendering.

## Deep modules

### Source

`loadEpisode(path): EpisodeSource` owns YAML validation, English instance IDs,
semantic setup, dialogue segmentation, brace parsing, and legacy errors.

### Registry

Resolving an immutable asset or typed terminal owns terminal schemas, defaults,
subject/rig/capability checks, recipes, and ambiguity errors. More procedures do
not enlarge the compiler interface.

### Scheduler

Compiling source + registry + measured speech owns blocking, nonblocking,
concurrent groups, spans, state, interruptions, silence, lifecycle, and claims.
Final audio timing is authoritative for speech, subtitles, lips, and calls.

### Staging

Resolving scene relationships owns coordinates, scale, z-order, facing,
entrances, conversational spacing, interaction slots, subtitle safe area, and
motivated reframing. Inputs are location, cast, speaker, targets, and actions.

### Performance

Expanding recipes owns a closed track vocabulary: bones, transforms, expression,
gaze, movement, socket bindings, object state, camera, VFX, SFX, and lifecycle
events. Core code never branches on a domain action such as `slam` or `drink`.

### Renderer

Evaluating `(manifest, frame)` is pure and seek-safe. It composites approved SVG
puppets, props, locations, all tracks, voice subtitles, and effects. Parallel
Remotion workers evaluate arbitrary frames independently.

## Asset library

Every asset is immutable and versioned. Episode instances pin exact IDs.

- Figures: layered art, skeleton, pivots, sockets, hand shapes, face/eye/mouth
  overlays, native orientation, and compatible procedure libraries.
- Locations: detailed layers, semantic regions, entrances, walkable areas,
  interaction slots, depth bands, and camera compositions.
- Objects: artwork, states, anchors, sockets, collision, and capabilities.
- Procedures: typed path, timing, claims, compatible rigs, generic recipe, and
  optional audiovisual companions.
- Voices and audiovisual assets: profiles, modifiers, constraints, and QA.

Assets are prepared and inspected before scripting. Missing story requirements
create or upgrade assets before script lock; there are no no-op fallbacks.

## Continuity and spans

Bindings and constraints are intervals. Pickup changes the hand shape, binds
object and hand sockets, and remains locked through body/camera motion until a
recipe releases or transfers it. Claims turn incompatible limb use into errors.

Span assets expose enter/sustain/exit regions. The scheduler maps them to
begin/end synchronization points, preserving endpoints and only looping or
holding the declared sustain region.

## Automatic staging

Authors state `awei facing aqiang`, not coordinates. Location assets select a
readable composition. Two-person dialogue defaults to a medium two-shot large
enough for eyes and hands; inserts and wides occur only when story targets need
them. Facing flips or selects native 30-45 degree views without mirroring text.

## Determinism and performance

- Randomness is seeded in IR; rendering has no wall clock or cross-frame state.
- Mixed audio is produced once. Procedure projection happens before Remotion.
- Frames do bounded sampling and SVG composition without filesystem/network IO.
- Rendering keeps configurable concurrency and chunking. Regression check:
  first 180 seconds, 1280x720, 24fps, four workers.

## Ownership

Public behavior changes in the DSL and schema docs first. Implementation
discoveries update docs before code. Legacy paths are removed, not layered.
