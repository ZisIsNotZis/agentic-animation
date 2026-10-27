# INFERRED

## Runtime contracts

The executable schemas and this document describe intended interfaces; the
approved plugin contract is in [6_WORLD_PLUGIN_CONTRACT](6_WORLD_PLUGIN_CONTRACT.md).

### Episode source

- Episode instance names match `^[a-z][a-z0-9_]*$`; category asset identity is its category-relative path.
- Actors bind figure and voice category assets; locations and objects bind category assets.
- A scene selects a location, declares actors and semantic object relations,
  then contains non-empty single-key dialogue statements.
- Facing targets actor, object, `audience`, `left`, or `right`. Entrances and
  placement relations are validated semantic values, not executable strings.

### Category assets and plugins

Each category is a plugin: `library/<category>/plugin.js` with an optional
category `manifest.json` declaring ordering metadata; each asset is
`library/<category>/<name>/` with a `manifest.json` and its resources.
Manifests describe assets without `id`, `version`, or `implementationKey`; the
category-relative path is the identity. Plugins own category semantics and
whole-world lifecycle hooks; the engine owns filesystem discovery, validation,
ordering, dispatch, and IR production. `world.canvas` is normalized logical
geometry and `world.plugins` is deterministic JSON-serializable state keyed by
category.

### Parsed call

```ts
type Scalar = {kind: "ref"; value: string} | {kind: "string"; value: string}
  | {kind: "number"; value: number} | {kind: "boolean"; value: boolean};
type ProcedureCall = {
  raw: string; subject: string;
  namespace: "action" | "emotion" | "gaze" | "movement" | "voice" | "prop"
    | "camera" | "effect" | "sound" | "music" | "say";
  terminal: string; path: string; args: Scalar[];
  kwargs: Record<string, Scalar>;
};
```

Actor procedures (`action`, `emotion`, `gaze`, `movement`, `voice`, `prop`)
take the actor as subject; world categories (`camera`, `effect`, `sound`,
`music`) are subject-less; objects may act as subjects for `prop` calls.
`say` is an actor-local quoted speech call. `mode` and `duration` are
compiler-owned kwargs. Other kwargs belong to the resolved procedure.
Duplicate kwargs and positional arguments after kwargs fail.

### Category plugin procedures

Procedure semantics are static members exported by each category plugin
(`library/<category>/plugin.js`), keyed by fully-qualified terminal such as
`action.slam`. A definition declares its subjects, positional parameters and
modifiers, timing (default duration, span enter/sustain/exit), claims, and a
recipe built from the closed engine track vocabulary: bone clips, transforms,
expression, gaze, movement, socket bindings, object state, camera, effect,
sound, and lifecycle events. There is no TypeScript-authored procedure catalog;
`loadProcedureDefinitions` discovers plugins.

Expression tracks are facial state, not body-action or arm-claim instructions.
`action.blink(actor)` emits a 0.5s transient expression event with numeric
`eyeOpen: 0`. Transient eye closure values interpolate from the current expression to
that value at mid-event and back at exit, without persisting an expression key,
changing expression identity or replacing speech/visemes. Ordinary expression
keys retain their persistent behavior; authored bone arms remain independent.
Successive overlapping authored bone claims take over from the current pose of
claimed arm chains, not a new zero envelope. Takeover decays into the new action
and its ordinary recovery; unclaimed chains remain owned by their earlier claim.
Motor contact and accepted whole-body poses retain final authority.

### Compiled performance IR

One immutable renderer-neutral manifest contains absolute scene/audio timing,
resolved assets, automatic staging, speech/captions/lips from one timeline,
typed performance tracks, continuous constraints, and provenance hashes. The
renderer consumes this IR only and evaluates tracks deterministically. For
checked-in location assets, the Remotion adapter adds a transient
`locationScenes` map containing the corresponding `scene.svg` text before
browser evaluation; this keeps filesystem access out of frame rendering and
selects backgrounds by compiled location instance rather than scene names.

### Motor intent acting shape (M5 additive implementation)

A motor intent (the `motor` track recipe's event value) may carry `anticipation` (seconds, clamped 0..0.4), `accent` (0..1) and `settle` (0..1); absent means 0, and 0 is the pre-M5 motion, so every existing bake keeps byte-identical trajectories.
The call form is the existing override syntax `{...action.point(a, b), accent: 0.6}`; the compiler stamps the three values onto the motor intents that call emits (a value the procedure set itself wins) and the motor applies them per [8_MOTOR](8_MOTOR.md).
No frame field is added to the bake: the shapes appear in `lean` (anticipation), `x` (a deferred beat's start) and `reach`/the carried prop (accent, settle, the shaped hold and the shaped placement), and a clamped anticipation is reported in `motor.diagnostics` (`make` prints it as `motor warning:`).

### Prop grip geometry (M2 additive implementation)

Prop placement may declare `grip: {at: [x,y], radius, depth}` in intrinsic art
units. `at` is a handle/palm contact socket, not the prop center; radius is the
allowed socket contact tolerance. `depth` is `front` (fingers over object) or
`behind` (object over hand). Compiler converts this to scaled base-relative
geometry. Assets without a socket retain body-box contact. Baked prop rotation
is continuous and follows changes in the holder's wrist direction from bind,
retaining the original attachment orientation across transfer and release.

### Figure artwork (M2 additive implementation)

A figure may supply `artwork.json` alongside its declared skeleton. The loader
validates its `svg-bone-parts` format and embeds renderer-safe vector layers in
resolved assets before compilation; frame evaluation performs no asset I/O.
Layers use an allowlisted SVG shape/group/defs grammar with quoted allowlisted
attributes. Style elements/attributes, executable/media/animation elements,
namespaced attributes (except the root SVG namespace), declarations, entities
and non-fragment URLs are rejected. Paint and clip references may use only
literal local `url(#id)` fragments; renderer-owned CSS is not asset content.
Old figures without this resource retain their existing rendering unchanged.
The resource supplies five native drawings (front, quarter-front, profile,
back, quarter-back), matching skeletons, the standard articulated parts,
independent face/eye/mouth/hand shapes and explicit occlusion. These are reusable
asset data, not a second episode language or the alternative Puppet runtime.

The renderer selects the native drawing from the existing eight-direction body
state, retaining the existing mirror convention. Bone transforms, motor reach,
voice cues and gaze drive asset layers, never figure-name-specific code. Both historical compiled and direct-manifest evaluation preserve baked motor
crouch metadata, including for old figures; old figures retain their renderer.
Native projection must also select matching physical geometry during motor baking;
a visible palm must agree with the authoritative contact point. Missing or
invalid declared artwork fails asset loading, not a silent old-look fallback.
During native motor presentation, only unclaimed arms receive the resting
correction. An independent non-presentation bone claim on any upper-arm,
forearm or hand segment preserves that arm's authored gesture; presentation's
own recipe claims are not independent gestures. Other actions retain gestures.
Native-bound interaction objects composite between body art and foreground grip
parts, so the existing whole-actor layer cannot hide a carried/placed object.
This is conditional on native-art participation; legacy-only layering is unchanged.
Draft previews use a disposable library; no draft becomes a production asset
until sampled orientation, expression, speech and contact QA passes.

### Set world declarations (M3 additive implementation)

A `library/set/<name>/manifest.json` may declare a world in
`coordinateSpace` units (e.g. `"1920x1080"`): `layers` as an ordered
back-to-front list of group ids in `scene.svg` (an entry may instead be
`{id, foreground?, blend?, opacity?, depth?}` to composite in front of actors, with
`blend` one of `normal`/`multiply`/`screen`/`hue`/`saturation`/`color`/
`luminosity`/`soft-light`, default `normal`, and `opacity`
in 0..1, default 1 — the stage applies them as `mix-blend-mode` and element
opacity, which is how an authored pigment or light pass reaches the actor
plane as well as the set, M4 additive implementation per
[M4 evidence](../evidence/art/ART_MATERIALS_M4.md); the defaults leave every existing
declaration and legacy set rendering unchanged). `depth` is a paint plane in
the actor z-space (props 20, actors 40 and up): a layer that names one
composites at that plane instead of under every actor or over every actor,
which is what lets a set piece stand between two actors — the badminton net
at 45 between a far player at 40 and a near one at 50 (D1 in
[0_ROADMAP](0_ROADMAP.md)); a layer that names none keeps the planes above.
`safeActorArea` as a rect, and `supports` as `{name, x: [min, max], y, paint}`. The modes added
after `screen` are the ones whose blend keeps a property of the backdrop:
`hue`, `saturation` and `color` keep a backdrop's luminosity, `luminosity`
replaces it, and `soft-light` scales its change with it ([5_PRODUCT](5_PRODUCT.md)).
A set becomes a world-declaring set exactly when its `scene.svg` carries
`<g id="...">` groups (double-quoted, like the `figureArtwork` resource
opt-in); sets whose
SVG has no id groups keep the flat single-background path and their
`layers`/`safeActorArea` stay inert. At load the registry validates and
normalizes all declarations to 0..1 once; `anim check`/`make` fail asset
loading (never a silent fallback) when a world-declaring set is missing
`layers`/`coordinateSpace`, declares a layer id with no painted group, has a
`scene.svg` viewBox unequal to `coordinateSpace`, or declares a `supports`
entry whose painted element (the SVG element with id `paint`, carrying
`data-support-top="<y>"`) disagrees with the declared `y` by more than 8
coordinateSpace units. Legacy sets keep raw art-unit `supports` passthrough.
The compiled scene IR carries normalized `setLayers`
(`{id, foreground, blend, opacity, depth}`),
`safeArea`, `supportSurfaces`, and the intrinsic `setViewBox`; the
renderer-remotion preloader injects per-layer group text into
`locationScenes` keyed `"<instance>/<layerId>"` for world sets (legacy sets
keep the whole-document blob keyed by instance) and fails the render when a
declared layer's group or the set's `scene.svg` cannot be read — never a
placeholder fallback. The Remotion stage stacks
declared layers back-to-front below the prop and actor planes; `foreground`
entries composite above actors and props, and an entry with a declared `depth`
composites at that plane instead of either. `stageScene` clamps actor placement
inside the declared `safeActorArea` (centers, including collision
resolution); sets without one keep the 10%–90% width heuristic. The
support-surface pass stays the authority for `on(X)` and resolves through the
normalized declarations.

### Invariants

Runtime defaults are 1280x720 video, four render workers, TTS speed 1.2;
`tts.speed` must be finite and greater than zero, and inline `voice.speed(...)`
calls remain local overrides. Staging positions, safe areas and camera centers
are normalized logical-canvas values; a renderer projects them into its own
pixels and never reinterprets those pixels as scene coordinates.

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
