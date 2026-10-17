# M4 — Materials and light

## Outcome and visible deliverable

One visibly upgraded treatment of the **accepted M3 set**
`library/set/canteen_counter_m3` with the accepted figure `figure/lin_b_draft`
in the committed `episodes/showcase-props` canteen beat: every region carries its
own pigment family, contour weight and detail density follow the size and depth
of what is drawn, the frame reads as one paper/ink medium, and one declared light
model lights set and actors together — delivered with **layered ablation frames**
isolating what each pass contributes and its render cost. Scope and budget are
owned by the [roadmap](ART_PRODUCTION_UPGRADE.md) M4 row; the direction is
[ART_DIRECTION_M1](ART_DIRECTION_M1.md) B; the seams are
[ART_WORLD_M3](ART_WORLD_M3.md), [WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md)
and [SCHEMAS](SCHEMAS.md).

## Renderer inspection before promising anything

Facts read from the engine before selecting a mechanism (2026-10-18, HEAD
`e3bfddf`); a treatment is only claimed here if the code supports it.

- Set art is **not** restricted to the figure artwork allowlist:
  `preloadLocationScenes` (`packages/adapters/renderer-remotion/src/index.ts`)
  injects each declared `<g id>` group's text verbatim, so `defs`, `pattern`,
  gradients, masks and any number of vector shapes work without an engine change;
  filters and raster were rejected by choice (cost, determinism), not capability.
- Each declared set layer composites as **its own `<svg>` sibling** in
  `packages/studio/src/components/performance/Stage.tsx`, back-to-front, with the
  actor and prop planes between the non-foreground and `foreground` entries;
  `mix-blend-mode` on that element is what lets one light pass cover the actors.
- Figure artwork **is** allowlisted
  (`packages/core/src/schemas/figureArtwork.ts`): no `filter`, `pattern`, `style`
  or `mask`, so a per-figure pass is unavailable and figure coherence must come
  from a declared pass over the actor plane or authored figure art.
- Nothing in the render path varies with wall-clock or frame-external state, so
  static art is frame-invariant by construction: "no flicker" is a property to
  verify, not a hope.

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
  instead of one global tint (`P.swatch` + `strokes({palette})`).
- *Small objects need their own finer parameters*: small props must not run at the
  large-area stroke scale or they break up into blobs.
- *Boiling everything reads as flicker*: the source restricted boil to line work;
  here no pass has a temporal term at all.
- *Light map over the whole picture*: a bright version is painted, then a light map
  composited over it (Rembrandt `32_rembrandt`, Hopper `24_hopper`), which is why
  the light passes sit **above** the actor plane.
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
| `ink_contour` | the final ink, drawn above every wash: the props' linework at its drawn weight, the chalk/marker lines and the steamer's steam, so paper and shade cannot sit on it | foreground (above actors), normal, last |

One shared **feathered matte** (`m4_prop_hold_off`, defined in the base art's
`defs` and referenced by `material_pigment`, `material_paper`, `lighting_shade`
and `lighting_key`) holds every wash off the ten drawn props: per prop an
elliptical black ramp whose full-cut core reaches the prop's box and whose ramp
is a quarter of the box wide, so no matte edge is a step in any direction.

## Engine seam used and added

**Used:** the M3 declared set layers (`layers`, `foreground`) and
world-declaring set loading. **Added, additive:** a layer entry may carry
`blend: "normal" | "multiply" | "screen"` (default `"normal"`) and `opacity: 0..1`
(default `1`), honoured schema → registry → IR → Stage as CSS
`mix-blend-mode`/`opacity` on that layer's element. Entries without the new fields
render exactly as before; no field is renamed and no legacy path is removed, and
figure artwork, compilers, staging, camera and motor are untouched.

## Layered ablation plan

Frames at the frozen beats of the committed props choreography (f0000 wide,
f0104 handover, f0160 putdown, 1280×720, 24 fps), rendered from a `/tmp`
verification episode that carries those beats by dropping declared passes from
the compiled IR in a disposable scratch tool — the delivered candidate is always
the unmodified set art, and the ablation is never a production entry point:
**A0** M3 committed art → **A1** +pigment → **A2** +detail → **A3** +paper
→ **A4** +lighting (full candidate), plus **leave-one-out** from A4 on each pass.

## Non-goals

1. No new set, figure, prop or episode; M4 applies treatment to the committed
   `showcase-props` beat, it does not build worlds.
2. No motor, camera, DSL, procedure or compiler-semantics change; no
   `episode.yml` edit.
3. No per-actor projected shadow: set art is static and staging varies per
   episode. Only the region's own contact/AO shading is drawn.
4. No raster textures, no AI-generated bitmaps, no third-party asset copying and
   no `filter`-based effect (blur/feTurbulence): every mark is original vector
   art, for cost, determinism and diffability.
5. No new dependency, service, publication or production-scale render; no
   long-form/180 s benchmark; the ≤30 s per-iteration budget holds.
6. No figure `artwork.json` rewrite (eight-view consistency is preserved by
   leaving it untouched).
7. No reusable drawing library extraction (M7/M8) and no skill file.

## Acceptance criteria

**Art** — the ablation proves each pass contributes; the full candidate reads as
one medium over the M3 set, with one coherent light direction (window, left) that
reaches the actors. Judged on actual stills by a fresh reviewer and at the gate.

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
6. **No hard matte edge**: in the key's own contribution field over locally flat
   art, no monotone boundary may carry more than 3 luminance levels across one
   pixel and at most 0.1 % of flat art may sit on one — whole frame, counter
   front and actor's box, at f0000 and f0160.
7. **Texture keyed to the surface**: the paper pass's grain on the props and the
   highlights is at most half its grain on the mid-tone grounds.
8. **Ink survives the medium** (secondary): the M3 art's strokes keep ≥ 90 % of
   their local contrast and stand ≥ 4× above the added grain. Secondary because a
   pass that redraws ink above the washes scores near 1.0, so 6 and 7 are the
   primary evidence; each new check has a synthetic negative control.

**Production (measured)** — wall time for the same clip, same frames, four
workers, in one session against a re-rendered M3 baseline, reported with the M3
gate's recorded number as a cross-check (different environment); the SVG gains
no dependency and stays editable; provenance and the light/medium declaration
are in the set manifest. Measured (161 frames, concurrency 4): 80.3 s candidate
vs 48.6 s M3, +65 % (53–70 % over three sessions) — `gates/render-timing.md`.
After the fix round below the candidate costs +45 % per still over the M3 art
(4.53 s vs 3.13 s, same session) against +23 % before it, so the clip delta has
risen; the clip itself could not be re-measured here (Remotion's browser crashed
mid-run on a loaded machine) and a clean-machine run is required before the gate
— `gates/v2/render-timing-note.md`.

## Evidence, limits and next actions

- Evidence lives in the archive bundle `m4-20261017T110548+0800` (`/home/z/.local/share/agentic-animation/art-baselines/`); no generated media is committed. History: `analysis.json` + `stills/ablation/` (first pass, incomplete), `analysis-iterated.json` + `ITERATION.md` + `stills/ablation-iterated/` (superseded).
- **Authoritative set after the fix round:** `analysis-final.json`, `ITERATION-v2.md`, `stills/ablation-v2/` (eleven arms × eleven frames, `scripts/v2/`); the same instruments on the rejected art are `analysis-red-on-rejected-art.json` + `V2-INSTRUMENT-RED.log`; the cost is `gates/v2/render-timing-note.md`.
- **Frame provenance:** the frames come from a `/tmp` verification episode carrying the committed `showcase-props` choreography, not from a re-render of the committed `episode.yml`; `anim check` passing and A0 being byte-identical to the M3 art are what link the measured set to it.
- **Authoritative M3 reference:** `scripts/iterated/m3-baseline-f0000.png`, an independent render of the M3 art at `d9ef6d2` through a second overlay, against which A0 has `max_abs_rgb 0.0`; `m3_archive_regression`'s larger figure compares a differently staged archive still, so it measures staging, not an art regression.
- **Limit, disclosed:** this worker has no image modality, so the perceptual verdict is deferred to a fresh review and the gate; the mechanical checks are the falsifiable substitute, and after the fix round they are the two the review named rather than edge energy that passed at 0.93 while the eye saw a smudge.
- **Perceptual confirmation is pending** the second review of the same eight-image set (rejected art and candidate: `a0`/`a4` full frames, the real steamer crop at art 1630,880–1852,1058, the `a2`/`a3` arms, `loo-key`, `a4` at f0160). Nothing here claims the defects are gone at the eye.
- **Known inconsistency (outside the npm gates):** `tools/asset-qa/check.ts` rejects `gradient`/`filter`/raster for the 23-asset materializer only; pointing it at M4 sets needs a deliberate rule decision.
- Next: the fresh artifact review and the user gate; production replacement stays gated exactly as for M3.

## Perceptual fix round (2026-10-18)

A vision review judged the eight stills **FAIL** on three defects while every mechanical verdict passed. That gap was the instrument's, so the round began with instruments; full record in `ITERATION-v2.md`.

| Defect | Cause measured on the rejected art | Fix |
| --- | --- | --- |
| P0 hard light-mask edges over the counter front and an actor's torso | key's even-odd holes and rectangle masks: **28.2** levels across one pixel, 10.9 in the counter front and the actor's box at f0160 | one shared feathered matte on four passes; spill, actor pool, rim and sill became gradient/elliptical glows; prop lit edges 0.12–0.18 |
| P1 steamer detail obliterated | washes sat on the ink: **0.787** of the M3 stroke contrast, 16 levels of dot grain between the strokes | sixth pass `ink_contour` draws the props' ink above every wash; washes hold off the props; dot screen 0.55 → 0.24 |
| P1 mechanical, non-integrated texture | one alpha over wall, skin, board and wood: **20.9** levels of grain on the props against 6.9 on the mid grounds | tooth keyed to the painted surface (wall 0.24, mid grounds 1.0) and held off the props: props and highlights now 0.0 |

Same instruments and flags, rejected → candidate: key matte share of flat art **0.00115 → 0.0** (floor ≤ 0.001) and its single-pixel step **28.2 → 0.0** levels (floor ≤ 3.0); prop+highlight grain over mid-ground grain **3.039 → 0.0** (floor ≤ 0.5); ink retention **0.662–0.880 → 0.963–1.117** (floor ≥ 0.90). All six earlier verdicts stay true with thresholds untouched, plus the three new ones, and all five negative controls pass; `material_paper`'s contribution margin is now the thinnest (3.66 against a floor of 3.0) because the round made the texture quiet.

## Reusable procedure

1. Inspect the renderer's real compositing seam before choosing a treatment.
2. Key each region's palette and stroke/detail scale to its size and depth; never run small props at the large-area parameters.
3. Keep every material/light mark static art: a temporal reseed is flicker.
4. Put the light map above the actor plane so one source lights set and actors.
5. Feather a matte with a 2-D ramp; two rectangle ramps in one fill are not a feather — where the other axis sits at full cut the rect end becomes a step (measured 22–25 levels until the check found it).
6. Ink goes on last: a multiply wash costs its own factor of the stroke contrast and no later mark restores it, so hold the wash off the art.
7. Measure each pass by dropping it from the compiled manifest, and keep the ablation tool out of the production path.
