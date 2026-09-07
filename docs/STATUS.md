# Project status

Last reconciled: 2026-09-02. Status: **plugin-host architecture implemented; docs reconciled to [WORLD_PLUGIN_CONTRACT.md](WORLD_PLUGIN_CONTRACT.md)**.

The canonical contract is [WORLD_PLUGIN_CONTRACT.md](WORLD_PLUGIN_CONTRACT.md); [PLUGIN_HOST_MIGRATION_PLAN.md](PLUGIN_HOST_MIGRATION_PLAN.md) is historical reference for how Steps 1-2 were executed.

## Done now

- The plugin-host engine is implemented: filesystem discovery of
  `library/<category>/plugin.js`, `before`/`after`/`priority` ordering with
  cycle detection, per-frame whole-world plugin chaining, start/tick/stop
  lifecycle with stable invocation IDs, JSON-only plugin state, and
  checkpoint/replay support.
- Procedure semantics live as static members of category plugins; the
  TypeScript-authored procedure catalog was removed and
  `loadProcedureDefinitions` discovers plugins.
- `library/<category>/<name>/manifest.json` asset manifests replaced registry
  metadata; asset identity is the category-relative path and there is no
  registry index.
- The 14 canonical categories exist as plugin categories: `figure`, `voice`,
  `set`, `prop`, `dressing`, `layout`, `action`, `emotion`, `gaze`, `movement`,
  `camera`, `effect`, `sound`, `music` (face_rig/face_overlay are reserved in
  the face model).
- Episode demos use the plugin-host call grammar: `<actor>.<category>.<terminal>(...)`
  for actor procedures, subject-less `camera.*`, `effect.*`, `sound.*`,
  `music.*`, and `<object>.prop.<terminal>(...)` for object subjects.
- Active episode asset references use canonical slash paths such as
  `figure/aqiang`, `voice/zh/aqiang`, and `set/agent_stage`, and active asset
  metadata uses `manifest.json`.
- Earlier baseline checks that passed: `npm run typecheck`; `npm run test:all`
  with 128 passed, 7 skipped, 0 failed; all three episode validation commands;
  `npm run skill:audit`; and `git diff --check`.

## Step 3 verification evidence (plugin-host runtime)

- All three episodes validate and pass `anim check` (liu-secret 3 scenes/10 takes, bailan-system 10/167, ai-work-adventure 10/268).
- All three compile fresh performance manifests under /tmp; manifests show paired lifecycle events and normalized staging/camera geometry with no out-of-range values.
- The canonical pipeline reaches and completes the Remotion input stage: a 2-second `render-yaml` of liu-secret rendered 48 frames in /tmp. Frames were inspected manually and match the checked-in golden MP4 scene (school corridor, correct actors and staging) after fixing the renderer to resolve location scenes from `resolved.identity`.
- `npm run typecheck`; `npm run test:all` 140 passed, 7 skipped, 0 failed; `npm run smoke`; `npm run validate:episode-yaml`; `npm run skill:audit`; `git diff --check` all pass.
- Checked-in MP4s are byte-identical to HEAD (never regenerated).

## Explicitly preserved

Existing checked-in MP4 files remain untouched. Generated audio, video, manifests, screenshots, caches, and temporary QA artifacts remain outside the source change set.

## Next

Per-frame plugin-owned canvas behavior (run() bodies beyond identity), then new-episode production on the plugin-host runtime.

## Showcase evidence (evaluated invocations, particle category)

- Seven minimal showcase episodes under `episodes/showcase-*` (docs/SHOWCASES.md): states, action timing overrides, camera/movement, effects+lifecycle, props, voice/music, and the special `showcase-snow`.
- New `particle` category: `particle.snow({count, seed, durationSec})` — deterministic seeded snowfall rendered by a new `Snowfall` component (vfx style `particle-snow`); `music.xuehua` loops a synthesized pentatonic 《一剪梅》 homage cue (7.25s wav under `library/music/cues/`, gitignored like all library audio — regenerate with any synth or drop in a licensed take).
- `showcase-snow` verified end-to-end: 14s render, full-bleed frame, BGM + 4.9s edge-tts scream + shiver audible across the timeline, subtitles clean in both the burned-in overlay and the soft mov_text track, awei visibly crying (tears) while collapsed. An independent fresh-context visual QA pass compared rendered frames against each episode.yml.
- Bundle staleness fixed: the Remotion webpack persistent cache served stale component code after source changes (silently rendering outdated faces/framing); bundling now runs with `enableCaching: false`.
- Visual-QA follow-ups (reviewer-confirmed): props project from scene staging (thermos/screen exist, sized, positioned); prop bindings carry objects at hand height through pickup→handover→putdown (chronological bind/release state + default hand sockets for figures without declared anchors); `action.push` visibly displaces its target (dx/dy transform deltas); `movement.to` eases the mover and only `transform` tracks project position (movement phase tracks caused the visible oscillation/jumps); `emotion.crying` renders tears; the audio segmenter shares the compiler's depth-aware brace scan so nested call arguments never leak into TTS text or subtitles; `make` prints `[make] teleport warning: ...` for implausible actor jumps (all ten episodes lint clean).
- Puppet motor (docs/WORLD_PUPPET_MOTOR.md, slices 1-2): compile-time deterministic simulation replaces imagined motion for push/move — support, contact-gated force (the hand must reach the target before it moves), reaction lean, prop friction. Trajectories bake into `scene.motor`; the renderer is a pure lookup; motor actors are exempt from repel. `action.push`/`movement.to` re-authored as motor intents; contact-before-motion asserted by test and verified in showcase-actions frames (aqiang walks into range, arm contact, awei staggers).
- Visual-QA round 2: motor body separation (actors cannot share ground; pursuit halts at adjacency — the collider now matches the visual 400px body); prop bindings ease the object from its resting spot into the hand (no teleport snap); vfx bind points (`bind: "head" | "hand_r" | ...`, with actor-subject fallback so emotion effects originate at the acting body); rhubarb lip sync wired end-to-end (vendor binary resolution fixed for isolated cwds, take-level visemes correlated into speech events, viseme-driven mouth in the face rig — the mouth articulates the real audio; edge-tts renders 啊-repetition as discrete syllables, so a fully held scream needs held-vowel audio direction).
- Visual-QA round 3: camera transform composition fixed (translate-then-scale made camera x/y screen-space offsets, so zoomed-out pans leaked the background void; now scale-then-translate matches the documented viewport-top-left semantics) plus an every-frame camera clamp to the painted stage and a `[make] camera overflow warning` lint when a camera key demands out-of-background space; motor geometry now shares the renderer's skeleton (arm reach 286px, body half-width 200px, scale-aware) so push contact matches the drawn hand; prop pickup emits a motor approach and bindings are proximity-gated with eased lift and eased release drop — no prop teleportation.
- Visual-QA round 4 (physics honesty): figure geometry got a single source of truth (`packages/core/src/motor/figureGeometry.ts`) consumed by both the drawn SVG and the motor collider, so the push hand physically touches the target body; prop placement was unified into one recursive physical authority in `propState` (chained lifts from wherever the prop actually was, hold-past-expiry, explicit-release drops, distance-scaled lift/drop windows) and the old snap paths were deleted — the dry-run lint (`[make] sudden-move warning`) plus `scripts/keypoints.mts` report 0 discontinuities across all showcases; handover now walks the receiver to the giver (motor intent `actor` field); name labels no longer mirror on flip; 45-degree facing shipped as actor orientation + procedural quarter-front/back views with `pose.orient` (decision recorded in docs/WORLD_PUPPET_MOTOR.md).
- Visual-QA round 5 (debug overlay + real grabs): physics debug overlay shipped (`ANIM_DEBUG_PHYSICS=1`) drawing figure/ground/collider/hand-anchor/reach/prop-boxes onto the video, which immediately exposed the real root cause of "hands never touch": the figure div was positioned at `actor.y - 720*scale` while its bottom-edge transform origin puts the drawn ground at `top + 720` — every figure stood 720*(1-scale) below its physics ground. Fixed (baseY = actor.y - 720). Props now use true grab semantics (wait until the hand arrives, follow the hand, grip seats, transfer at hand contact), the motor bakes reach-down/grip/stand-up hand trajectories, and the drawn arm aims at the motor reach point via analytic two-bone IK (figureGeometry.solveArmIK). 45-degree facing delivered with rendered examples: quarter-front (both sides) and back views in showcase-actions, sheet at .scratch/orientation-sheet.png, push-contact evidence at .scratch/push-contact-debug.png.
- Known minor issues: same-role figures share one palette (cosmetic); a scene-bounded expression may flip to neutral right at a following action track's end boundary (sub-second, after the line); glitch scanline art spans the full frame by design while the error box targets the screen.
- Camera fix: the performance camera div scaled about the wrong origin (composition center instead of stage top-left), shrinking the stage inside the frame and exposing black bands around every set; `containCamera` also allowed zooming out past the stage fit. Both fixed (`transformOrigin: "0 0"`, zoom floor + viewport clamped to the stage). liu-secret re-render verified full-bleed; the checked-in golden MP4s predate the fix and still show the old banded framing.
- Compiler: brace groups now parse nested object literals (`splitDialogue`/`inlineTokens` are depth- and quote-aware); the spread override form `{...call(args), durationSec, mode}` evaluates as real JS with body duration validated against the factory declaration (`declaredSec`).
- tts-edge retries now log each failed attempt and the final success to stderr.
