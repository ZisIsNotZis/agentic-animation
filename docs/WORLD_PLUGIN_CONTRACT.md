# World/plugin contract

Canonical design for the library-plugin engine. Implementation changes update
this document first. Approved amendments: the original static-definition
contract, then the evaluated-invocation model below (user-approved).

## World type

```ts
type World = {
  canvas: Canvas;                    // the only renderer-facing area, 0..1 normalized
  plugins: Record<string, unknown>;  // per-category state; runner-mirrored progress
  frame: number;                     // absolute frame index
  seconds: number;                   // frame / fps
  fps: number;
  seed: number;
};
```

`canvas` carries normalized figures, parts, faces, props, sets, dressing,
movement, gaze, camera, effects, sound/music cues, captions, constraints, and
lifecycle-visible state. `frame`/`seconds`/`seed` are engine-maintained root
fields; invocations read time from the world — there is no second context
object. Plugins mutate the world **in place**. The engine performs only
minimal structural checks needed to continue and render.

## Coordinate pipeline

```text
native resource units (SVG viewBox, raster pixels)
  -> category plugin ingestion
  -> normalized local/category coordinates
  -> world.canvas normalized scene coordinates
  -> renderer pixels
```

SVG `viewBox` and raster dimensions remain intrinsic resource data only. All
geometry crossing the plugin seam is normalized.

## Library taxonomy and resource folders

Categories: `figure`, `voice`, `set`, `prop`, `dressing`, `layout`, `action`,
`emotion`, `gaze`, `movement`, `camera`, `effect`, `sound`, `music` (plus
reserved `face_rig`, `face_overlay`; see Face model).

```text
library/<category>/plugin.js            entry: exports the category namespace
library/<category>/<name>/              one self-contained resource (convention)
  index.js                              code (when the resource is behavior)
  manifest.json                         metadata (may be empty {})
  <assets>                              svg/png/wav resources
```

The engine only ever loads `plugin.js`. Every `plugin.js` must derive its
namespace dynamically — enumerating its own children or loading by its own
rules. Hardcoded resource lists in `plugin.js` are prohibited. The
subdirectory layout above is a library convention, not an engine guarantee:
plugins may resolve resources any way they implement, including *virtual*
resources that do not physically exist (for example fetched or generated at
load/use time) — the plugin hands over real factories and data regardless.
Every identity is a path: `library/action/slam` is `action.slam`;
`library/effect/manga-impact-star` likewise. No `id`, `version`,
`implementationKey`, or `aliases` anywhere. The category manifest may declare
plugin order metadata (`before`, `after`, `priority`) plus category-owned data.

## Invocations: descriptor protocol

A brace expression in an episode calls a plugin-exported **factory** with real
arguments. The call executes immediately and returns an *invocation
descriptor* — a plain object; it performs no world work yet:

```ts
type Invocation = {
  durationSec?: number;   // required when mode is "block"
  mode?: "block" | "nonblock";
  // Authoring default: generator. yield = "world is good, next frame";
  // return/done = stop. A plain function (world) => boolean | void is
  // equally valid; returning false ends the invocation.
  run(world: World): Generator<void, void, void>;
};
```

Bodies mutate the world in place. Control-flow state lives in generator
locals; state that must be observable or externally writable is written to
`world.plugins[category]` from inside the body. The runner mirrors minimal
progress (`{invocationId, asset, step}` where `step` is a string yield value
if provided) into `world.plugins[category]` automatically. Early cancellation
drives `it.return()` so `finally` blocks clean up.

## Timing

The scheduler reads `durationSec` and `mode` from descriptors and nothing
else; bodies are opaque to it. Resolution order: call-site override
(`{...slam(lin, desk), durationSec: 0.9}`) > descriptor's `durationSec` >
error for blocking invocations. Nonblocking invocations do not hold the
timeline. Schedule-before-execute: durations never come from running bodies.

## Authoring model

`episode.yml` stays structurally data: declaration blocks (`actors`,
`locations`, `objects`) and per-statement script lines whose brace groups
contain **real JavaScript expressions**. Expressions are evaluated with a
scope containing: live instance handles (`lin`, `desk`), every plugin
namespace (`action`, `camera`, ... — the factory functions), and core
combinators. Statements evaluate to one invocation descriptor or a list
(comma-separated = concurrent). Arbitrary statements outside braces, entity
creation inside braces, and references to undeclared instances are errors.
Safety/sandboxing is explicitly out of scope: authors are trusted.

## Per-frame chaining and ordering

Every frame the engine walks ordered plugins, starts/drives that frame's
invocations (schedule order, tie-broken by stable invocation ID derived
deterministically from the schedule), and chains the resulting world.
Category order is declared (`before`/`after`/`priority`, lower priority runs
earlier) with topological sort and cycle detection; filesystem enumeration
order never matters. Plugin-above-plugin reads of `world.plugins` are
sanctioned cooperation.

## Dependencies between plugins

Plugins reference each other through **static ESM imports** of real exports
(`action/slam` importing `effect/manga-impact-star`). These are ordinary code
dependencies; the engine and world never resolve names. Strings never carry
semantic vocabulary across the seam: canvas entries carry resource identities
(paths) plus concrete normalized geometry — the renderer loads resources
generically by identity and never interprets category meaning.

## Validation and replay

`check`/`make` dry-run: evaluate every brace expression (catching unknown
instances, missing exports, and argument errors immediately), then drive all
invocations frame by frame against the world without rendering. A dry run
that completes with a structurally valid world passes. Replay strategy is
re-execution: reconstruct descriptors and re-drive bodies from invocation
start; serializability of in-flight state is not required. Determinism is
preferred but not contractual; correctness of the produced output is.

## Failure behavior

- Unknown asset path, unknown instance, missing plugin export, argument
  mismatch: fail at evaluation (dry-run) with the expression and episode
  location named.
- Blocking invocation without resolvable `durationSec`: scheduling error.
- Thrown body error: fails the run with plugin, invocation, and frame named;
  no silent fallback.
- Ordering cycle: discovery error listing the cycle.

## Face model

`face_rig` emits normalized articulated face-part state; `face_overlay` emits
overlay visuals and can suppress the built-in figure face via a generic canvas
visibility field or declared replacement. The figure manifest declares the
face capability and normalized head/face geometry; `head` is a fixed face
contract.

## Exact TypeScript types and runtime loading seam

```ts
type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

type Invocation = {
  durationSec?: number;
  mode?: "block" | "nonblock";
  run(world: World): Generator<void, void, void>;
};

type PluginFactory = (...args: never[]) => Invocation;

// plugin.js default export: the category namespace
type CategoryPlugin = Record<string, PluginFactory | JsonValue>;

// Engine seam
loadPlugins(libraryRoot: string): Promise<LoadedPlugin[]>;
type LoadedPlugin = {category: string; manifest: unknown; namespace: CategoryPlugin};
```

`plugin.js` files execute in the compiler (Node); they may use `node:fs` and
top-level await to enumerate their own children. Renderer-facing data crosses
only through the manifest — the renderer never imports plugin code. Discovery
scans `library/*/plugin.js` directly; there is no registry index and no
TS-authored catalog.
