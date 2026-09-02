# Library-plugin engine redesign

  ## Summary

  Replace the current hard-coded procedure catalog and duplicated registry with a plugin-host architecture.

  The engine becomes a compact runtime kernel that:

  - discovers library/<category>/plugin.js;
  - resolves the first namespace segment;
  - parses generic invocation lifecycle;
  - orders category plugins;
  - passes the complete world to each plugin;
  - accepts the complete world returned by each plugin;
  - gives world.canvas to Remotion;
  - knows no domain categories or action names.

  All semantic behavior moves into library category plugins and their assets. Existing videos remain untouched and are not regenerated.

  ## Step 1 — Design the complete world/plugin contract in docs, then pause

  Update the owning docs first and add one canonical design document under docs/. It will describe the entire system, not only actions.

  The design will define:

  type World = {
    canvas: Canvas;
    plugins: Record<string, unknown>;
  };

  canvas will be the only engine/renderer-facing area and will contain normalized 0..1 data for:

  - figures and their normalized placement, visibility, layer, and facing;
  - figure parts and generic transforms;
  - rig-driven and overlay-driven faces;
  - props and bindings;
  - sets and dressing;
  - movement;
  - gaze;
  - camera;
  - visual effects;
  - sound/music cues;
  - subtitles/captions;
  - constraints and lifecycle-visible state;
  - deterministic seeds and frame metadata where needed.

  plugins will contain arbitrary JSON-compatible category state. Plugins receive the whole world and may mutate it in place or return a replacement world:

  world = plugin.run(world, invocation, frameContext);

  The engine will not implement JSON patches, permissions, ownership enforcement, or category-specific mutation rules. Plugins are responsible for correct cooperation. The engine performs only minimal structural checks needed to continue and render.

  The document will specify:

  - first-level category resolution;
  - static values versus callable members;
  - optional dynamic plugin dispatch;
  - generic start, tick, stop, duration, and nonblock lifecycle;
  - stable invocation IDs;
  - deterministic category order using declared before, after, and priority metadata;
  - deterministic invocation order within a category;
  - full-world chaining for every frame;
  - long-running effects and checkpoint/replay requirements;
  - plugin replacement-world support;
  - failure behavior for missing plugins, invalid returns, thrown errors, lifecycle mismatches, and ordering cycles;
  - the rule that frame-time plugin state must be serializable or deterministically reconstructible;
  - no React/Remotion objects in plugin output;
  - no absolute authored geometry crossing the plugin seam.

  The design will also explicitly distinguish:

  native resource units
    → category plugin ingestion
    → normalized local/category coordinates
    → world.canvas normalized scene coordinates
    → renderer pixels

  SVG viewBox and raster dimensions remain intrinsic resource data only. All geometry exposed to the engine is normalized.

  ### Canonical library taxonomy

  The design will use

  figure
  voice
  set
  prop
  dressing
  layout
  action
  emotion
  gaze
  movement
  camera
  effect
  sound
  music

  Each category is a plugin category:

  library/<category>/plugin.js

  Each asset is a directory:

  library/<category>/<name>/
    manifest.json
    resources...

  Category and asset paths are the sole identities:

  library/action/slam
  → action.slam

  There will be no id, path, version, implementationKey, aliases, or hidden translation layer. Empty manifest.json files are valid when no metadata is required. Category manifest.json may additionally declare plugin loading/order metadata. Asset manifest.json describes only information that cannot be derived from its path or resources.

  ### Face model

  Face behavior will be split into category plugins rather than one overloaded face procedure:

  face_rig/
  face_overlay/

  face_rig emits normalized articulated face-part state.

  face_overlay emits normalized overlay visuals and can suppress the built-in figure face through a generic canvas visibility field or declared replacement behavior.

  The figure manifest declares the figure’s face capability and normalized head/face geometry. head is a fixed face contract, not a configurable face anchor.

  ### Custom categories

  There will be no generic public procedure, script, or program category.

  A genuinely new domain may add:

  library/danmaku/plugin.js
  library/danmaku/<asset>/manifest.json
  library/danmaku/<asset>/resources...

  The category plugin may load any resources it needs and may implement static values, callable values, or dynamic dispatch. Dynamic dispatch must be explicitly opted into and must produce plugin-owned validation errors for invalid calls.

  The final exact TypeScript types and runtime loading seam will be documented before implementation.

  After this documentation pass, stop and request the user’s manual confirmation. Do not begin code migration until the world schema, category taxonomy, lifecycle, ordering, coordinate contract, and face model are approved.

  ## Step 2 — Implement the approved migration

  After manual confirmation:

  - replace the TypeScript-authored procedure catalog with filesystem-discovered category plugins;
  - remove library/registry/manifest.json as an authoritative or required index;
  - scan category directories directly;
  - derive every identity from the relative path;
  - migrate all library paths from versioned/historical layouts to the approved canonical layout;
  - rename meta.json to manifest.json;
  - remove redundant identity/version/license/note fields unless genuinely required;
  - convert authored geometry and staging data to normalized coordinates;
  - normalize intrinsic SVG/raster geometry during category loading;
  - replace method-like calls with fully qualified category calls decided in Step 1;
  - remove all alias and legacy procedure translation functions;
  - remove action-name branches such as pickup/handover/putdown special cases;
  - express binding, object state, movement, face changes, camera behavior, VFX, and audio through generic canvas data or category-owned world state;
  - implement deterministic per-frame full-world plugin chaining;
  - implement category ordering and cycle validation;
  - preserve generic engine lifecycle semantics;
  - keep renderer behavior limited to normalized world.canvas;
  - migrate tests and docs to the same vocabulary;
  - update local skills and agent guidance so they describe the new SSOT.

  No compatibility layer, deprecated duplicate terminology, generated registry, or parallel DSL will remain.

  ## Step 3 — Verify all existing episodes without regenerating video

  Migrate:

  episodes/ai-work-adventure/episode.yml
  episodes/bailan-system/episode.yml
  episodes/liu-secret/episode.yml

  Use only the new canonical asset identities and call syntax.

  For every episode:

  - run source/schema validation;
  - resolve every category call;
  - verify all referenced assets exist;
  - verify all plugin lifecycle pairs;
  - verify normalized staging and camera data;
  - compile a fresh temporary performance/world output under /tmp;
  - confirm the canonical pipeline reaches the Remotion input stage;
  - verify existing checked-in MP4s remain unchanged;
  - do not regenerate or replace any MP4.

  Run:

  npm run typecheck
  npm run test:all
  npm run smoke
  npm run validate:episode-yaml
  git diff --check
  npm run skill:audit

  Add tests proving:

  - a new category asset can be added without editing engine source;
  - a plugin receives and returns the complete world;
  - in-place mutation and replacement-world returns both work;
  - multiple active plugins chain in deterministic declared order;
  - long-running start/tick/stop effects persist state correctly;
  - direct frame evaluation is deterministic;
  - plugin state can coexist with canvas state;
  - a plugin-above-plugin category can intentionally read and modify another plugin’s state;
  - all three existing episodes pass check and compile successfully;
  - no old identity, alias, version, or deprecated terminology remains in maintained source/docs.

  Final delivery requires a reviewed diff, clean whitespace validation, successful episode checks, and confirmation that the existing MP4 files were preserved.
