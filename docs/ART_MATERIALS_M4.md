# M4 — Materials and light

## Outcome and visible deliverable

One visibly upgraded treatment of the **accepted M3 set**
`library/set/canteen_counter_m3` with the accepted figure `figure/lin_b_draft`
in the committed `episodes/showcase-props` canteen beat: every region carries
its own pigment family, contour weight and detail density follow the size and
depth of what is drawn, the frame reads as one paper/ink medium, and one
declared light model lights set and actors together. The deliverable is that
treatment plus **layered ablation frames** isolating what each pass contributes
and its measured render cost. Scope and budget are owned by the
[roadmap](ART_PRODUCTION_UPGRADE.md) M4 row and the learning-coverage rows
naming M4; the accepted direction is [ART_DIRECTION_M1](ART_DIRECTION_M1.md) B;
the set and its seams are [ART_WORLD_M3](ART_WORLD_M3.md),
[WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md) and [SCHEMAS](SCHEMAS.md).

## Renderer inspection before promising anything

Facts read from the engine before selecting a mechanism (2026-10-18, HEAD
`e3bfddf`); the roadmap treats vector/layered-raster/sprite treatments as
candidates, so each is only claimed here if the code supports it.

- Set art is **not** restricted to the figure artwork allowlist:
  `preloadLocationScenes` (`packages/adapters/renderer-remotion/src/index.ts`)
  injects each declared `<g id>` group's text verbatim, so `defs`, `pattern`,
  gradients and any number of vector shapes work without an engine change;
  filters and raster were rejected by choice (cost, determinism), not
  capability.
- Each declared set layer composites as **its own `<svg>` sibling** in
  `packages/studio/src/components/performance/Stage.tsx`, back-to-front, with
  the actor and prop planes between the non-foreground and `foreground`
  entries; `mix-blend-mode` on that element is what lets one light pass cover
  the actors, and back-to-front is the only order the seam declares.
- Figure artwork **is** allowlisted
  (`packages/core/src/schemas/figureArtwork.ts`): no `filter`, `pattern`,
  `style` or `mask`, so a per-figure pass is unavailable and figure coherence
  must come from a declared pass over the actor plane or authored figure art.
- Nothing in the render path varies with wall-clock or frame-external state, so
  static authored art is frame-invariant by construction: "no flicker" is a
  property to verify, not a hope, and its failure is a pass that changes pixels
  between frames.

## Chosen mechanism

**Region palettes + scale-keyed strokes and contour recovery + paper/pigment/
ink/halftone pass + one declared lighting model, implemented as additive
declared passes on the M3 set-layer seam.** Selection reasons: it is the only
family that works on the accepted assets without new assets, spends no new
dependency, keeps authoring in `library/` (no parallel DSL), and is measurable
per pass. Learned from the huashu sources (read, not copied —
`vendor/huashu-art-motion/references/04-纯代码绘制.md`, `.../lib/paint.js`,
`.../lib/brush.js`):

- *Region palette beats colour jitter*: each region gets its own swatch family
  instead of one global tint (`P.swatch` + `strokes({palette})`), which the
  notes rank above jitter.
- *Small objects get their own finer parameters*: small props must not run at
  the large-area stroke scale or they break up into blobs, so contour and detail
  are keyed to region scale and depth.
- *Boiling everything reads as flicker*: the source measured full-screen
  reseeding at ~18–20 frame-difference and restricted boil to line work; here no
  pass has a temporal term at all.
- *Light map over the whole picture*: a bright version is painted, then a light
  map composited over it (Rembrandt/`32_rembrandt`, Hopper `24_hopper`), which
  is why the light passes sit **above** the actor plane.
- *Paper is the ground; ink and wash only go on top*: multiply-on-paper layering
  with the paper colour kept in reserve (ink `17_ink`, Ghibli wash `25_ghibli`).

Passes, in declared order (each is one ablation unit):

| Pass | Mechanism | Declared shape |
| --- | --- | --- |
| `material_pigment` | region palettes: each region's own light/shade pigment family, warm key vs cool fill separation | after `counter`, before actors, normal blend |
| `material_detail` | scale-keyed contours: thicker/lighter near and large, thinner and lower-contrast far, small props restated at their own fine scale (detail recovery) | after `material_pigment` |
| `material_paper` | paper tooth, 45° halftone in shade regions, dry-brush ink edges, paper reserve kept over the window/highlights | after `material_detail`; **foreground, above the actor plane**, multiply, opacity 0.8 |
| `lighting_shade` | one declared source (window, left): cool shade mass, ambient-occlusion bands, cast shadows to the right/back, soft vignette | foreground (above actors), multiply |
| `lighting_key` | the same declared source as warm key: window light pool, lit side of the counter and the actors' lit side, rim highlight | foreground (above actors), screen |

## Engine seam used and added

**Used:** the M3 declared set layers (`layers`, `foreground`) and world-declaring
set loading. **Added, additive:** a declared layer entry may now carry
`blend: "normal" | "multiply" | "screen"` (default `"normal"`) and
`opacity: 0..1` (default `1`), honoured schema → registry → IR → Stage as CSS
`mix-blend-mode`/`opacity` on that layer's element. String entries and entries
without the new fields keep today's rendering exactly; no field is renamed and
no legacy path is removed. Figure artwork, compilers, staging, camera and motor
are untouched, so the M3 deliverable cannot regress structurally.

## Layered ablation plan

Frames at the frozen narrative beats of the committed props choreography (f0000
wide, f0104 handover, f0160 putdown, 1280×720, 24 fps), rendered from a `/tmp`
verification episode that carries those beats, produced by dropping declared
passes from the compiled IR in a disposable scratch tool — the delivered
candidate is always the unmodified set art, and the ablation is never a
production entry point. Judged by the numeric checks below plus human
perception; each step's cost is reported:

- **A0** M3 committed art → **A1** +pigment → **A2** +detail → **A3** +paper
  → **A4** +lighting (full candidate); **leave-one-out** from A4 on each pass.

## Non-goals

1. No new set, figure, prop or episode; the demo stays the committed
   `showcase-props` beat (M4 applies treatment, it does not build worlds).
2. No motor, camera, DSL, procedure or compiler-semantics change; no
   `episode.yml` edit.
3. No per-actor projected shadow: set art is static and staging varies per
   episode, so an actor shadow would be a new staging-coupled engine feature.
   Only the region's own contact/AO shading is drawn.
4. No raster textures, no AI/generated bitmaps, no third-party asset copying and
   no `filter`-based effect (blur/feTurbulence) in set art: every mark is
   original vector art, and cost, determinism and diffability all favour vector
   patterns and flat overlays; the huashu sources are read for mechanism only.
5. No new dependency, service, publication, or production-scale render; no
   long-form/180 s benchmark; the ≤30 s per-iteration budget holds.
6. No figure `artwork.json` rewrite; eight-view consistency is preserved by
   leaving it untouched (see the inspection fact above).
7. No reusable drawing library extraction (M7/M8) and no skill file (a parallel
   lane owns skill capture).

## Acceptance criteria

**Art** — the ablation proves each pass contributes; the full candidate reads
as one medium over the M3 set: region pigment families rather than one tint,
contour weight following scale/depth, paper/ink/halftone texture, and one
coherent light direction (window, left) that reaches the actors. Judged on
actual stills by a fresh reviewer and by the user at the milestone gate.

**Function (decidable, this worker)** — legacy and M3 paths unchanged:
`anim check` on the committed episode passes; unit tests cover the new
declaration (validation, defaults, IR carriage, stage compositing); `npm run
typecheck`, `npm test`, `npm run smoke` green; `git diff --check` clean.
Falsifiable numeric checks on the rendered PNGs, each with its threshold:
1. **Pass contribution**: each pass's drop-one delta over its own footprint is
   above a floor, so blending is asserted by measurement and not assumed (a pass
   that changes nothing is a dead pass, not a subtle one).
2. **Detail preserved**: edge energy inside the small-prop regions and inside
   the figure's bounding box does not fall below the A0 baseline by more than a
   small tolerance, in the full candidate, at every rendered beat.
3. **No flicker**: in static regions (no actor, prop, caption or camera motion),
   full-candidate pixels are identical frame-to-frame across the sampled pairs,
   and a repeated render of one frame is byte-identical.
4. **Coherent lighting**: with the light passes on, the horizontal luminance
   relation of matched far wall bands keeps the window side brighter, and each
   shadow-side sample is darker than its lit counterpart at the same depth;
   neither relation is inverted by the passes. Key/fill separation is reported.
5. **Marked unreduced**: the numbers are measured on rendered PNGs of the
   delivered set art through the production renderer, not on the SVG source.

**Production (measured)** — wall time for the same clip, same frames, four
workers, in one session against a re-rendered M3 baseline, reported with the M3
gate's recorded number as a cross-check (different environment); the SVG gains
no dependency and stays editable; provenance and the light/medium declaration
are in the set manifest. Measured (161 frames, concurrency 4): 80.3 s candidate
vs 48.6 s M3, +65 % (53–70 % over three sessions) — `gates/render-timing.md`.

## Evidence, limits and next actions

- The evidence lives in the archive bundle `m4-20261017T110548+0800`
  (`/home/z/.local/share/agentic-animation/art-baselines/`): `analysis.json`,
  `stills/ablation/`, `clips/`, `scripts/`, `gates/render-timing.md`,
  `RECOVERY.md`; no generated media is committed and no evidence archive is
  touched. That first-pass `stills/ablation` set is incomplete and superseded
  (empty `loo-paper`, no timings); the authoritative set is the iterated one —
  `analysis-iterated.json`, `ITERATION.md`, `stills/ablation-iterated/`.
- **Frame provenance:** the iterated frames were rendered from a `/tmp`
  verification episode carrying the committed `showcase-props` choreography, not
  from a re-render of the committed `episode.yml`; `anim check` passing and A0
  being byte-identical to the M3 art are what link the measured set to it.
- **Authoritative M3 reference:** `scripts/iterated/m3-baseline-f0000.png`, an
  independent render of the M3 `scene.svg` + `manifest.json` at `d9ef6d2`
  through a second overlay, against which A0 has `max_abs_rgb 0.0`;
  `m3_archive_regression`'s larger figure (up to 55) compares a differently
  staged archived M3 still, so it measures staging, not an art regression.
- **Limit, disclosed:** this worker session has no image modality, so the
  perceptual verdict (does it read as one medium, is the light coherent, is any
  detail lost) is deferred to the parent's fresh visual review and the user
  gate; the mechanical checks above are the falsifiable substitute.
- **Known inconsistency (outside the npm gates):** `tools/asset-qa/check.ts`
  rejects `gradient`/`filter`/raster for the 23-asset `ai-work-adventure`
  materializer only; M4 uses gradients legitimately and nothing fails today,
  but pointing that tool at M4 sets needs a deliberate rule decision.
- Next: parent arranges the fresh artifact review (stills + at least one clip)
  and presents the accepted-set comparison at the user gate; production
  replacement stays gated exactly as for M3.

## Reusable procedure

1. Inspect the renderer's real compositing seam before choosing a treatment;
   claim only what the code path can draw.
2. Key each region's palette and stroke/detail scale to its size and depth;
   never run small props at the large-area parameters.
3. Keep every material/light mark static art: a temporal reseed is flicker.
4. Put the light map above the actor plane so one source lights set and actors.
5. Measure each pass's contribution and cost by dropping it from the compiled
   manifest, and keep the ablation tool out of the production path.
