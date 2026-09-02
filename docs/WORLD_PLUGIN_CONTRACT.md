# World/plugin contract (Step 1 design — pending approval)

This document is the canonical design for the library-plugin engine redesign in
[PLUGIN_HOST_MIGRATION_PLAN.md](PLUGIN_HOST_MIGRATION_PLAN.md). Until the user approves it, no code migration happens. After approval it owns the contract; implementation changes update this document first.

## World type

```ts
type World = {
  canvas: Canvas;
  plugins: Record<string, unknown>;
};
```

`canvas` is the only engine/renderer-facing area. It holds normalized `0..1` data for: figures with normalized placement, visibility, layer, and facing; figure parts and generic transforms; rig-driven faces (`face_rig`) and overlay-driven faces (`face_overlay`); props and bindings; sets and dressing; movement; gaze; camera; visual effects; sound and music cues; subtitles/captions; constraints and lifecycle-visible state; deterministic seeds and frame metadata where needed.

`plugins` holds arbitrary JSON-compatible category state keyed by category name. Plugins receive the whole world and may mutate it in place or return a replacement world:

```ts
world = plugin.run(world, invocation, frameContext);
```

The engine implements no JSON patches, permissions, ownership enforcement, or category-specific mutation rules. Plugins cooperate correctly on their own. The engine performs only the minimal structural checks needed to continue and render: the world has `canvas` and `plugins` roots, canvas geometry fields are finite numbers in the inclusive `0..1` range, and all values are JSON-serializable.

## Coordinate pipeline

```text
native resource units (SVG viewBox, raster pixels)
  -> category plugin ingestion
  -> normalized local/category coordinates
  -> world.canvas normalized scene coordinates
  -> renderer pixels
```

SVG `viewBox` and raster dimensions remain intrinsic resource data only. All geometry exposed to the engine — positions, sizes, pivots, anchors — is normalized. No absolute authored geometry crosses the plugin seam.

## Library taxonomy

Canonical categories, each a plugin category: `figure`, `voice`, `set`, `prop`, `dressing`, `layout`, `action`, `emotion`, `gaze`, `movement`, `camera`, `effect`, `sound`, `music`, plus the face categories `face_rig` and `face_overlay` defined in the Face model below.

```text
library/<category>/plugin.js          category plugin implementation
library/<category>/<name>/            one asset directory
  manifest.json                       asset metadata (may be empty {})
  <resources>                         SVG/PNG/JSON resources
```

Category and asset paths are the sole identities: `library/action/slam` is `action.slam`. There is no `id`, `path`, `version`, `implementationKey`, `aliases`, or hidden translation layer. Empty `manifest.json` files are valid. The category `manifest.json` may additionally declare plugin loading/order metadata (see Ordering). Asset `manifest.json` describes only information that cannot be derived from its path or resources.

## Static values, callable members, dynamic dispatch

A manifest field is either a static value (data applied directly to the world) or a callable member (a function exported by `plugin.js` and invoked with a context object). Plugins decide which manifest fields are callable. Dynamic dispatch is optional and must be explicitly opted into by the plugin (e.g. a `dispatch` capability flag in the category manifest); a dispatching plugin receives arbitrary sub-calls and owns validation errors for invalid ones. There is no generic public procedure, script, or program category.

## Lifecycle and invocations

The engine parses a generic invocation lifecycle independent of category semantics:

- `start` — once when the invocation begins; `tick` — each frame while active; `stop` — once when it ends.
- `duration` — declared or scheduled frame span; `null`/absent means the invocation is nonblocking and does not hold the scheduler.

The scheduler computes each invocation's phase per frame and passes it to the owning plugin. Invocations carry stable IDs derived deterministically from the schedule (for example `action.slam.3` where `3` is the deterministic sequence position), never from random or wall-clock sources. Stable IDs make checkpoint/replay and cross-frame state lookup reliable.

## Per-frame chaining

Every frame, the engine:

1. walks the ordered category plugins (see Ordering);
2. for each plugin, dispatches that category's invocations in deterministic invocation order (schedule order, tie-broken by stable invocation ID);
3. passes the complete current world to `plugin.run` each time;
4. chains the result — in-place mutation keeps the reference; a returned replacement world becomes the next input and must satisfy the world contract;
5. hands the final `world.canvas` to the renderer.

The next plugin always sees the previous plugin's output. A plugin-above-plugin category may intentionally read and modify another plugin's `world.plugins` state; that is sanctioned cooperation, not a violation.

## Ordering

Category order is deterministic and declared. Category manifests may declare `before: string[]`, `after: string[]`, and `priority: number` (lower runs earlier). The engine topologically sorts by `before`/`after`, tie-breaking on `priority`, then category name. Undiscovered categories referenced in `before`/`after` are errors; an ordering cycle is a discovery error listing the cycle. Plugins are loaded once at compile/bundle time; filesystem enumeration order never affects behavior.

## Checkpoint/replay and state rules

Frame-time plugin state must live in `world.plugins[category]` and be either JSON-serializable or deterministically reconstructible from `(world, frameContext)`. Long-running effects (`start` … `tick` … `stop`) keep their state there so any frame can be evaluated independently. The compiler checkpoints the world at schedule-segment boundaries; renderers rebuild a frame's state from the nearest checkpoint plus deterministic ticks. React elements, Remotion objects, functions, class instances, and other non-JSON values must not appear in plugin output; the renderer adapts `world.canvas` into its own primitives.

## Performance guidance

In-place mutation is the default fast path; `run` mutates the world and returns it unchanged by reference. A replacement-world return is fully supported but copies the world, so plugins should reserve it for structural rewrites. The engine never deep-clones between plugins; each plugin owns its state's copy semantics.

## Failure behavior

- Missing plugin: an invocation references a category with no `library/<category>/plugin.js` — compile-time error naming category, asset, and episode call site.
- Invalid return: `run` returns a non-object, drops a required root, or contains non-JSON values — error naming the plugin, invocation ID, and frame.
- Thrown error: propagates and fails compile/render with plugin name, invocation ID, and frame; no silent fallback or partial output.
- Lifecycle mismatch: `stop` without `start`, an invocation extending past its declared duration without one, or duplicated stable IDs — scheduling errors.
- Ordering cycle: reported at discovery with the full cycle path.

## Face model

Face behavior splits into two category plugins. `face_rig` emits normalized articulated face-part state (eyes, brows, mouth/viseme targets) for figures that declare rig faces. `face_overlay` emits normalized overlay visuals layered onto a compatible face and can suppress the built-in figure face through a generic canvas visibility field or a declared replacement behavior. The figure manifest declares the figure's face capability and normalized head/face geometry. `head` is a fixed face contract, not a configurable face anchor.

## Custom categories

A genuinely new domain adds a directory tree: `library/danmaku/plugin.js`, `library/danmaku/<asset>/manifest.json`, and `library/danmaku/<asset>/resources...`. The category plugin may load any resources it needs and may implement static values, callable values, or explicitly opted-in dynamic dispatch with plugin-owned validation errors. The engine stays category-agnostic.

## Exact TypeScript types and runtime loading seam

```ts
type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue };

type LifecyclePhase = 'start' | 'tick' | 'stop';

type Invocation = {
  id: string;                    // stable, deterministic
  category: string;              // first path segment, e.g. 'action'
  asset: string;                 // asset name, e.g. 'slam'
  phase: LifecyclePhase;
  durationFrames: number | null; // null = nonblocking
  localFrame: number;            // frames since start
  args: JsonValue;               // authored/static or dispatched arguments
};

type FrameContext = {
  frame: number;                 // absolute frame index
  fps: number;
  seconds: number;
  seed: number;                  // deterministic seed
};

type CategoryPlugin = {
  run(world: World, invocation: Invocation, ctx: FrameContext): World;
};

type LoadedPlugin = {
  category: string;
  manifest: JsonValue;           // category manifest (may declare before/after/priority)
  plugin: CategoryPlugin;
};

// Runtime seam: filesystem discovery + ESM import.
loadPlugins(libraryRoot: string): Promise<LoadedPlugin[]>;
```

`plugin.js` files are plain ESM JavaScript with no Node-only APIs so the same file loads in the Node compiler and the browser renderer bundle. Discovery scans `library/*/plugin.js` directly; there is no registry index.
