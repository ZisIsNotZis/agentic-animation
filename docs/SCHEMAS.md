# Runtime contracts

The executable schemas and this document describe intended interfaces; the approved plugin contract is in [WHOLE_WORLD_PLUGINS.md](WHOLE_WORLD_PLUGINS.md).

## Episode source

- Episode instance names match `^[a-z][a-z0-9_]*$`; category asset identity is its category-relative path.
- Actors bind figure and voice category assets; locations and objects bind category assets.
- A scene selects a location, declares actors and semantic object relations,
  then contains non-empty single-key dialogue statements.
- Facing targets actor, object, `audience`, `left`, or `right`. Entrances and
  placement relations are validated semantic values, not executable strings.

## Category assets and plugins

Each category has `library/<category>/plugin.js`, `manifest.json`, and asset files.
Manifests describe assets without `id`, `version`, or `implementationKey`; the category-relative path is the identity.
Plugins own category semantics and whole-world lifecycle hooks; the engine owns discovery, validation, ordering, dispatch, and IR production.
`world.canvas` is normalized logical geometry and `world.plugins` is the deterministic ordered plugin chain.

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
  path: string;
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
- Asset paths use lowercase underscore names; category-relative paths are the only asset identity, and `id`, `version`, and `implementationKey` are invalid asset fields.
- Required procedure arguments are positional; optional modifiers are kwargs.
- Subject, rig, capability, parameter value, and object are compatible.
- Exclusive bone/socket claims cannot overlap without declared mixing.
- Objects cannot have two exclusive bindings; lifecycle follows ownership.
- Span pairs have equal normalized signatures excluding `mode` and close in
  their scene. State calls reject timing kwargs; spans reject `duration`.
- Chinese outside dialogue/title metadata is rejected.
- Renderer fields and legacy source fields are rejected at the source seam.
