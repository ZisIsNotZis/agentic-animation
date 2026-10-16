# M3 — World: one coherent set

## Outcome and visible deliverable

Deliver **one coherent set with props and dressing** in which the accepted
B-direction character and the environment belong together: depth, perspective
and composition read correctly in wide, close and moving frames, and support
metadata agrees with the painted geometry. The visible deliverable is one
draft set — `library/set/canteen_counter_m3`, produced in the disposable draft
library — carrying layered SVG art, narrative props and dressing, and declared
`layers`/`safeActorArea`/`supports`/`coordinateSpace`, plus the minimal engine
capability that consumes those declarations. Existing sets, episodes, library
assets and the frozen M0 stay unchanged; production-path replacement happens
only at the user milestone gate. Scope and budget are owned by the
[roadmap](ART_PRODUCTION_UPGRADE.md); the accepted M2 state this builds on is
[ART_CHARACTER_M2](ART_CHARACTER_M2.md); engine seams by
[WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md) and [SCHEMAS](SCHEMAS.md).

## Chosen set and rationale

The M3 set is the canteen counter scene of `episodes/showcase-props`
(location `canteen` → `library/set/school_canteen`), rebuilt as the draft
`canteen_counter_m3` superseding M2's `counter_contact_draft`.

- It is the scene of the accepted M2 character work (pickup, handover,
  putdown on the counter), so character-environment belonging is testable at
  exactly the accepted beats with the accepted figure.
- M0 exposed its composition defects directly: schematic counter rectangles
  (props f0/f16), flat background against hatched clothing, putdown not
  visually established (f160), transfer clutter (f104/f112, legibility only).
- M2 already hit the declared-versus-painted defect here: the original
  canteen declares the counter support at y450 while the painted top sits
  near y390; M2's draft realigned it to y390. The M3 set paints and declares
  the counter together (y400), so the defect class is closed at the source.
- The other five sets (`agent_stage`, `qingyun_*`, `school_corridor`) are
  untouched demonstrations; one coherent set is the whole milestone scope.

## Non-goals

Refining the M3 recon overreach list into exclusions:

1. No 3D or z-axis projection; all geometry stays normalized 2D per the
   world contract's coordinate pipeline.
2. No parallax and no depth-of-field blur; set layers never respond to the
   camera and are never blurred by the engine.
3. No parallel scene DSL and no plugin/world contract replacement; set craft
   stays in `library/set|prop|dressing` assets.
4. No wholesale rewrite of the other sets; exactly one coherent set is built.
5. No generated/AI or paid raster set assets; original vector artwork only,
   with provenance and license in the manifest.
6. No new focal-hierarchy engine feature (no per-element blur/dim/brightness
   filter); M1 composition lessons are applied inside the artwork, staging
   and existing levers.
7. No repair of M0 handover/putdown contact or motor behavior (M5 owns the
   motor side); M3 supplies support metadata and visual legibility only.
8. No camera rewrite or new camera vocabulary (M6 owns focus-driven camera);
   existing clamp/contain behavior is used as-is.
9. No reusable world/drawing library extraction; deferred to M7/M8 after
   demonstrated repetition.
10. No long-form/180s renders, no raised comparison budget, no new
    dependencies or services, no publication.

## Entry findings 2026-10-16 (user-raised, routed here)
During the falls demo review the user flagged: (a) canonical sets read as the
old schematic style against the accepted B-direction figure, and (b) actors
appear to stand in the air because canonical sets paint no readable ground.
Both are confirmed root causes in `library/set/qingyun_dormitory/scene.svg`
(primitive rects, no painted floor). Within M3 scope they close only for the
one draft set; generalizing the coherent treatment to the remaining canonical
sets is future-milestone work per exclusion 4 (roadmap M7/M8), recorded here
so the finding is not lost.

## Gate-repair entry 2026-10-17 (independent review P1/P2 round)
The gate review routed the putdown-visibility failure here with a pure-staging
fix hypothesis; the hypothesis was falsified — every route is refused by the
whole-body proposal (post-bind posture, held-prop mirror), and the repair was
routed to M5 per exclusion 7 with the criterion honestly marked failing. The
integrator sanctioned two pre-existing motor defect fixes (vacuous
self-pursuit, direction-blind walk clamps) that the falsification required;
they change no existing episode trajectory (see
docs/tickets/M3-WORLD-ART.md, 2026-10-17 sections).

## Engine capability additions

**Open decision, decided:** the set manifest's declared-but-unconsumed fields
become **consumed**, not reduced. Reasons: the milestone's own deliverable
(support metadata, composition, containment) needs exactly these fields;
`coordinateSpace` is the only mapping that lets painted SVG units and
normalized staging geometry agree, without which the support-agreement check
is undecidable; reducing the fields would contradict PIPELINE's "locations
need detailed layers and semantic staging metadata" and force re-deriving the
same declarations at M4/M6. Consumption is additive and backward-compatible:
sets that declare none of the fields keep today's flat rendering, following
the `figureArtwork` precedent; nothing is renamed.

Interface at each layer (SCHEMAS.md is updated before code in WP2):

- **Schema** — `library/set/<name>/manifest.json`: existing field names gain
  consumers. `coordinateSpace` (e.g. `"1920x1080"`); `layers` as an ordered
  back-to-front list of ids, each matching a group id inside `scene.svg`, with
  an optional `foreground` entry that composites in front of actors;
  `safeActorArea` as a rect; `supports` as named horizontal surfaces
  `{name, x: [min, max], y}`. All values are authored in `coordinateSpace`
  units.
- **Registry** — `packages/core/src/assets/registry.ts` validates M3 set
  manifests and normalizes `layers`/`safeActorArea`/`supports` from
  `coordinateSpace` units to normalized canvas values once at load. Missing or
  invalid declarations on an M3 set fail asset loading; no silent fallback.
- **Compiler/staging** — `stageScene` clamps actor placement inside the
  normalized `safeActorArea` when declared (the current 10%–90% width
  heuristic remains the default for sets without one). The support-surface
  pass stays the authority for `on(X)` and resolves its geometry through the
  normalized declarations. The IR carries the normalized location
  `setLayers`, `safeArea` and `supportSurfaces`.
- **Renderer adapter** — `preloadLocationScenes` in `renderer-remotion`
  injects per-layer SVG group text keyed by declared layer id into
  `locationScenes`, instead of today's single whole-document blob.
- **Evaluator/Stage** — `evaluate.ts`/`Stage.tsx` composite declared layers in
  declared order: layers up to the actor plane render behind actors (replacing
  the single flat zIndex-0 background); `foreground` layers render above
  actors and props. Sets without declared layers keep the flat path.

## Depth and ordering in normalized 2D

Depth is a **static declared paint order**, not a camera variable: `layers`
is back-to-front; actors and props occupy the slot after the last
non-foreground layer; `foreground` layers may legitimately occlude actors
(counter front edge, doorway frame). Perspective is drawn inside the SVG
artwork — converging edges, size and value gradients, overlap — which is art,
not projection. The evaluator never recomputes set depth per frame.

## Support agreement

The compiler's support-surface pass remains the **semantic authority** for
contact; the M2 motor is unchanged. The rule the M3 set must satisfy: each
declared support's normalized surface equals the painted surface it names,
within a small fixed tolerance, validated at load (WP2) and confirmed at
sampled putdown/rest frames (the M0 f160 defect). The counter is the
canonical case: the painted counter top (y400 in set units) is declared at
y400, not y450.

## Composition: available levers, untouchable owners

Available now and used by M3: staging `subjectBias`/`framing`/`focus`, actor
and object `prominence`, `setup` background/receding/foreground scales,
existing camera keys under `containCamera`/`clampCameraToStage`, captions.
The M0 camera findings (hand crossing the left edge at f96, subjects
clustered left at f112–144) are addressed through `safeActorArea`
consumption, staging and set composition — not camera changes. Untouchable:
focus-driven camera and transitions (M6), acting/contact motor behavior (M5),
dialogue/visymes and frozen audio (retained). `episode.yml` remains the sole
authored input; the M3 set is swapped in through a copied episode in the
disposable draft library, with no DSL additions.

## Acceptance criteria

**Art** — judged on actual frames at matching beats against M0 and accepted
M2: the counter, props and dressing read as one coherent canteen space, not
stacked rectangles (closes the M0 schematic-shapes finding); depth reads
through overlap, value and size without blur or motion; palette, value and
light are compatible with the accepted B-direction lin in wide and close
frames (closes flat-background-versus-hatched-clothing); focal hierarchy at
the transfer and putdown beats points at the interaction.

**Function** — decidable: `anim check` passes with the M3 set; declared
supports resolve and the putdown object rests visibly on the painted counter
top at the sampled frame; sampled frames show actors inside `safeActorArea`
and correct set/actor/dressing layer order, with `foreground` occlusion only
where declared; legacy sets and figures render through their existing paths
(typecheck, `test:all`, canonical smoke green; `git diff --check` clean).

**Production** — measured: additive schema, no existing manifest or episode
must change; render wall time for the props clip shows no material regression
against M0's recorded numbers; the layered SVG stays editable with
provenance/license in the manifest; no new dependencies or services.

## Evidence plan

1280×720 at 24 fps, four workers, at most 15 seconds per clip and 30 seconds
total per iteration; targeted stills first, then clips. Original M0 and the
accepted M2 media are kept separately; each comparison shows M0 → accepted M2
→ M3 candidate at matching narrative beats: wide (props f0/f16), transfer
(f104/f112), putdown (f160), plus one close framing and one moving-camera
beat on the same set. Narration and timing stay frozen from M0 cached audio.
Evidence bundles live under the local archive root, never in Git.

## Work-package split

Single writer per package; coverage, interfaces, dependencies, acceptance:

| Package | Coverage and writer | Depends on | Acceptance and proof |
| --- | --- | --- | --- |
| WP1 contract (done here) | This document and ticket; docs writer only | roadmap, M2 docs, recon | Links resolve; files under 200 lines; `git diff --check` clean |
| WP2 engine | Consume set metadata schema → registry → staging → IR → renderer adapter → evaluator/Stage; SCHEMAS.md first; TDD; engine worker owns `packages/core`, `packages/adapters/renderer-remotion`, `packages/studio` seams | WP1 | Unit tests for normalization, validation, support agreement and layer ordering; legacy flat path unchanged; typecheck/`test:all`/smoke green |
| WP3 set art | Draft `canteen_counter_m3`: layered SVG, props, dressing, manifest declarations, provenance; targeted stills; art worker owns the disposable draft library only | WP1; parallel to WP2 | SVG contains declared layer group ids; declared supports equal painted tops; stills pass the worker's own Art-dimension self-review |
| WP4 integration and gate | Copied props-scene episode on the draft set; comparison stills and bounded clips; gates; milestone presentation with M0/M2/candidate at matched beats | WP2 + WP3 | Evidence plan satisfied; fresh independent artifact/media review arranged by the parent; user milestone judgment presented; no production replacement before that judgment |

End state: the user judges the presented comparison; production asset-path
approval remains the user's call, exactly as for M2.
