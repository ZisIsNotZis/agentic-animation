# Runtime contracts

Zod definitions in `packages/core/src/schemas` are executable truth and export
JSON schemas. This document fixes their intended interfaces.

## Episode source

- IDs match `^[a-z][a-z0-9_]*$`; immutable asset IDs end in `.vN`.
- Actors bind figure and voice assets. Locations and objects bind one asset.
- A scene selects a location, declares actors and semantic object relations,
  then contains non-empty single-key dialogue statements.
- Facing targets actor, object, `audience`, `left`, or `right`. Entrances and
  placement relations are validated semantic values, not executable strings.

## Asset identity

The asset directory is the only identity source. A canonical path has the form
`<kind>/<name>/v<N>` relative to `library/`; its runtime ID is that path with
`/` replaced by `.`, for example `figure/aqiang/v1` becomes
`figure.aqiang.v1`. Asset metadata does not repeat identity fields. Registry
JSON stores the path and operational index data; the loader derives and
validates `id`, `kind`, and `version` for runtime use.

## Parsed call

```ts
type Scalar = {kind: "ref"; value: string} | {kind: "string"; value: string}
  | {kind: "number"; value: number} | {kind: "boolean"; value: boolean};
type ProcedureCall = {
  raw: string; subject: string;
  namespace: "act"|"face"|"look"|"move"|"voice"|"state"|"use"|"play"|"say";
  terminal: string; path: string; args: Scalar[];
  kwargs: Record<string, Scalar>;
};
```

`mode` and `duration` are compiler-owned kwargs. Other kwargs belong to the
resolved procedure. Duplicate kwargs and positional arguments after kwargs fail.

## Procedure asset

```ts
type ProcedureAsset = {
  id: string; path: string; version: number;
  owner: "actor"|"object"|"camera"|"vfx"|"sfx";
  kind: "timed"|"state"|"speech";
  subjects: string[];
  positional: Parameter[];
  modifiers: Record<string, Parameter>;
  timing?: {defaultDuration: number; scalable: boolean;
    span?: {enter: Range; sustain: Range; exit: Range}};
  claims?: {exclusive?: string[]; shared?: string[]};
  recipe: ProcedureRecipe;
};
```

Parameters declare reference/scalar type, capability constraints, enums/ranges,
and defaults. Recipes contain only generic engine tracks: bone clips, transforms,
expression, gaze, movement, socket bindings, object state, camera, VFX, SFX,
and lifecycle events.

## Compiled performance IR

One immutable renderer-neutral manifest contains absolute scene/audio timing,
resolved assets, automatic staging, speech/captions/lips from one timeline,
typed performance tracks, continuous constraints, and provenance hashes. The
renderer consumes this IR only and evaluates tracks deterministically. For
checked-in location assets, the Remotion adapter adds a transient
`locationScenes` map containing the corresponding `scene.svg` text before
browser evaluation; this keeps filesystem access out of frame rendering and
selects backgrounds by compiled location instance rather than scene names.

## Invariants

Runtime defaults are 1280x720 video, four render workers, and TTS speed 1.2.
`tts.speed` must be finite and greater than zero; inline `voice.speed(...)` calls
remain local explicit overrides.
Staging positions, safe areas, and camera centers are normalized logical-canvas
values. Renderers project them into their output pixel dimensions; they must not
reinterpret output pixels as authored scene coordinates.

- Every local and terminal resolves uniquely.
- Asset paths use lowercase underscore names, and derived identity is the only
  accepted asset ID; legacy aliases and contextual namespaces are invalid.
- Required procedure arguments are positional; optional modifiers are kwargs.
- Subject, rig, capability, parameter value, and object are compatible.
- Exclusive bone/socket claims cannot overlap without declared mixing.
- Objects cannot have two exclusive bindings; lifecycle follows ownership.
- Span pairs have equal normalized signatures excluding `mode` and close in
  their scene. State calls reject timing kwargs; spans reject `duration`.
- Chinese outside dialogue/title metadata is rejected.
- Renderer fields and legacy source fields are rejected at the source seam.
