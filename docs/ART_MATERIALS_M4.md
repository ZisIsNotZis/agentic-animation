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
  gradients, masks and any number of shapes work without an engine change; filters
  and raster were rejected by choice (cost, determinism), not capability.
- Each declared set layer composites as **its own `<svg>` sibling** in
  `packages/studio/src/components/performance/Stage.tsx`, back-to-front, with the
  actor and prop planes between the non-foreground and `foreground` entries;
  `mix-blend-mode` on that element is what lets one light pass cover the actors.
- Figure artwork **is** allowlisted
  (`packages/core/src/schemas/figureArtwork.ts`): no `filter`, `pattern`, `style`
  or `mask`, so a per-figure pass is unavailable and figure coherence must come
  from a declared pass over the actor plane or authored figure art.
- Nothing in the render path varies with wall-clock or frame-external state, so
  "no flicker" for static art is a property to verify, not a hope.

## Chosen mechanism

**Region palettes + scale-keyed strokes and contour recovery + paper/pigment
pass + one declared lighting model, implemented as additive declared passes on
the M3 set-layer seam.** Selection reasons: it is the only family that works on
the accepted assets without new assets, spends no new dependency, keeps authoring
in `library/` (no parallel DSL), and is measurable per pass. Learned from the
huashu sources (read, not copied —
`vendor/huashu-art-motion/references/04-纯代码绘制.md`, `.../lib/paint.js`,
`.../lib/brush.js`):

- *Region palette beats colour jitter*: each region gets its own swatch family
  instead of one global tint (`P.swatch` + `strokes({palette})`); small objects get
  their own finer parameters, or they break up into blobs at the large-area scale.
- *Boiling everything reads as flicker*: the source restricted boil to line work;
  here no pass has a temporal term at all.
- *Light map over the whole picture, paper as the ground*: a bright version is
  painted and a light map composited over it, with the paper colour kept in
  reserve — which is why the light passes sit **above** the actor plane.

Passes, in declared order (each is one ablation unit):

| Pass | Mechanism | Declared shape |
| --- | --- | --- |
| `material_pigment` | region palettes: each region's own light/shade pigment family, warm key vs cool fill separation | after `counter`, before actors, normal blend |
| `material_detail` | scale-keyed contours: near/large silhouettes weighted, far art thinned, visible prop ink and speculars restored | after `material_pigment` |
| `material_paper` | paper tooth keyed per ground (wall / mid planes / floor), 45° fibre hatch in shade, dry-brush ink edges, paper reserve over the window | after `material_detail`; **foreground, above the actor plane**, multiply, opacity 0.8 |
| `lighting_shade` | one declared source (window, left): cool shade mass, ambient-occlusion bands, cast shadows to the right/back, soft vignette | foreground (above actors), multiply |
| `lighting_key` | the same declared source as warm key: window light pool, lit side of the counter and the actors' lit side, rim highlight | foreground (above actors), screen |

A pass may not redraw ink over a surface the base art puts behind something: the
props' line work is the M3 art's own and the washes are held off it, so nothing
above the actor plane needs to restate a prop. The first candidate's sixth pass
did exactly that and its rectangles landed on the counter front as a wireframe.

One shared **feathered matte** (`m4_prop_hold_off`, in the base art's `defs` and
referenced by `material_pigment`, `material_paper`, `lighting_shade` and
`lighting_key`) holds every wash off the ten drawn props: per prop an elliptical
black ramp whose full-cut core reaches the prop's box and whose ramp is a quarter
of the box wide, so no matte edge is a step in any direction.

## Engine seam used and added

**Used:** the M3 declared set layers (`layers`, `foreground`) and
world-declaring set loading. **Added, additive:** a layer entry may carry
`blend: "normal" | "multiply" | "screen"` (default `"normal"`) and `opacity: 0..1`
(default `1`), honoured schema → registry → IR → Stage as CSS
`mix-blend-mode`/`opacity` on that layer's element. Entries without the new fields
render exactly as before; no field is renamed and no legacy path is removed, and
figure artwork, compilers, staging, camera and motor are untouched.

## Layered ablation plan

Frames at the frozen beats of the committed props choreography (f0000 wide, f0104
handover, f0160 putdown, 1280×720, 24 fps), rendered from a `/tmp` verification
episode that carries those beats by dropping declared passes from the compiled IR
in a disposable scratch tool — the delivered candidate is always the unmodified
set art, and the ablation is never a production entry point:
**A0** M3 committed art → **A1** +pigment → **A2** +detail → **A3** +paper
→ **A4** +lighting (full candidate), plus **leave-one-out** from A4 on each pass.

## Non-goals

1. No new set, figure, prop or episode; M4 applies treatment to the committed
   `showcase-props` beat, it does not build worlds.
2. No motor, camera, DSL, procedure or compiler-semantics change; no `episode.yml`
   edit, and no figure `artwork.json` rewrite (eight-view consistency is kept by
   leaving it untouched).
3. No per-actor projected shadow: set art is static and staging varies per episode; only the region's own contact/AO shading is drawn.
4. No raster textures, no AI-generated bitmaps, no third-party asset copying and
   no `filter`-based effect (blur/feTurbulence): every mark is original vector art.
5. No new dependency, service, publication or production-scale render; no
   long-form/180 s benchmark; the ≤30 s per-iteration budget holds.
6. No reusable drawing library extraction (M7/M8) and no skill file.

## Acceptance criteria

**Art** — the ablation proves each pass contributes; the full candidate reads as
one medium over the M3 set, with one coherent light direction (window, left) that
reaches the actors. Judged on stills by a fresh reviewer and at the gate.

**Function (decidable, this worker)** — legacy and M3 paths unchanged:
`anim check` on the committed episode passes; unit tests cover the new
declaration (validation, defaults, IR carriage, stage compositing); `npm run
typecheck`, `npm test`, `npm run smoke` green; `git diff --check` clean.
Falsifiable numeric checks on the rendered PNGs, each with its threshold:
1. **Pass contribution**: each pass's drop-one delta over its own footprint is
   above a floor (share of pixels moved > 2 levels ≥ 0.02, mean ≥ 3.0), so
   blending is asserted by measurement and not assumed.
2. **Detail preserved**: edge energy inside the small-prop regions and the
   figure's box stays ≥ 0.95 of A0 and the strong-edge share ≥ 0.90, at every
   rendered beat.
3. **No flicker**: in static regions full-candidate pixels are identical
   frame-to-frame across the sampled pairs, and a repeated render is byte-identical.
4. **Coherent lighting**: matched far-wall bands keep the window side brighter and
   each shadow-side sample darker than its lit counterpart at the same depth.
5. **Marked unreduced**: measured on rendered PNGs through the production
   renderer, not on the SVG source.
6. **No hard matte edge**: in the key's own contribution field over locally flat
   art, at most 0.1 % of flat art sits on a monotone boundary and no boundary
   carries more than 3 luminance levels across one pixel — whole frame, counter
   front and actor's box, at both beats.
7. **Texture keyed to the surface**: the paper pass's grain on the props and the
   highlights is at most half its grain on the mid-tone grounds.
8. **No pass draws a frame**: per prop box, the straight dark line along x or y
   that the M3 art has no edge under is ≤ 100 px and the bold ink further than
   3 px from every M3 ink pixel ≤ 200 px; a bounding box, a clip rect or a drawn
   lattice breaks both at once.
9. **Ink survives the medium** (secondary): the M3 art's strokes keep ≥ 90 % of
   their local contrast and stand ≥ 4× above the added grain. Secondary because a
   pass that redraws ink above the washes scores near 1.0, so 6–8 are the primary
   evidence; each check has a synthetic negative control.

**Production (measured)** — wall time for the same clip, same frames, four
workers, in one session against a re-rendered M3 baseline: 80.3 s candidate vs
48.6 s M3, +65 % (53–70 % over three sessions) — `gates/render-timing.md`. Per
still, +45 % over the M3 art before the third round and +59 % after it (4.52 s vs
2.84 s); the clip was not re-measured on a loaded machine — `gates/v2/render-timing-note.md`.

## Evidence, limits and next actions

- Evidence lives in the archive bundle `m4-20261017T110548+0800` (`/home/z/.local/share/agentic-animation/art-baselines/`); no generated media is committed. History: `analysis.json` + `stills/ablation/` (first pass, incomplete), `analysis-iterated.json` + `ITERATION.md` + `stills/ablation-iterated/` (superseded), `analysis-final.json` + `ITERATION-v2.md` + `stills/ablation-v2/` (superseded by this round).
- **Authoritative set:** `analysis-v3-final.json`, `ITERATION-v3.md`, `stills/ablation-v3/` (ten arms × eleven frames, `scripts/v3/analyze.py`); the same instruments on the rejected art are `analysis-v3-red.json` + `V3-INSTRUMENT-RED.log`; the third review's images are `stills/review-3/`.
- **Frame provenance:** the frames come from a `/tmp` verification episode carrying the committed `showcase-props` choreography, not a re-render of `episode.yml`; `anim check` passing and A0 being byte-identical to the M3 art (`max_abs_rgb 0.0` against `scripts/v3/m3-baseline-f0000.png`) link the measured set to it.
- **Limit, disclosed:** this worker has no image modality, so the perceptual verdict is the fresh reviewer's and the gate's; the mechanical checks are the falsifiable substitute, and after two instrument failures they are the checks the reviews named.
- **Perceptual confirmation is pending** the third review of the images in `stills/review-3/` (`/tmp/m4view3/` on this machine): `a0-m3-f0000`, `a4-full-f0000`, `a4-full-f0160`, `crop-steamer-a0/a4`, `crop-cooler-a0/a4`, `crop-case-and-shelf-a0/a4`, `crop-counter-register-a0/a4`, `crop-counterfront-a0/a4-f0160`. Nothing here claims the defects are gone at the eye.
- **Known inconsistency (outside the npm gates):** `tools/asset-qa/check.ts` rejects `gradient`/`filter`/raster for the 23-asset materializer only; pointing it at M4 sets needs a rule decision.
- Next: the third review and the user gate; production replacement stays gated as for M3.

## Fix rounds (2026-10-18)

Two vision reviews judged the stills **FAIL** while every mechanical verdict of
the time passed; each round therefore began with the instrument. Full records:
`ITERATION-v2.md`, `ITERATION-v3.md`.

| Round | Review's defect | Cause measured on the rejected art | Fix |
| --- | --- | --- | --- |
| v2 | P0 hard light-mask edges over the counter front and an actor's torso | key's even-odd holes and rectangle masks: **28.2** levels across one pixel, 10.9 in the counter front and the actor's box at f0160 | one shared feathered matte on four passes; spill, actor pool, rim and sill became gradient/elliptical glows |
| v2 | P1 steamer detail obliterated, texture reads as a screen | washes sat on the ink (**0.787** of the M3 stroke contrast); one alpha over wall, skin, board and wood (**20.9** levels of grain on the props against 6.9 on the mid grounds) | tooth keyed to the painted surface and held off the props, dot screen 0.55 → 0.24, and a sixth `ink_contour` pass — **which was the next round's defect** |
| v3 | P0 "bounding-box ink contour etching … an engineering wireframe mode overlay", P1 steamer lattice | the contour pass restates each prop's line work above every wash, including the parts the base art hides: the drinks cooler stands behind the counter, so its rectangle was painted onto the counter's front face. **360** px of straight line in the cooler box that the M3 art does not draw, 325 in the register, 220 in the bowl stack, 204 px of invented bold ink on the steamer | `ink_contour` deleted, not repaired; `material_detail` keeps only marks on surfaces nothing hides (visible cooler bottles, jars, case, bowls, steamer, boards, runner, counter), the invented steamer ribs are gone, and the props' own ink needs no restatement because the matte keeps every wash off it |
| v3 | P1 "paper texture still reads as a flat screen-space dot raster" | the shade regions were a **round dot plate** on an 8-unit square cell, one field at one alpha, over wall, board and floor alike | the plate is gone: each ground carries its own fibre tile (wall, mid planes, floor) and the shade a 45° hatch, so no square cell pitch survives; wall and props stay at 0.0 grain |

Numbers, rejected → fixed, same instruments, no threshold touched: **frame traces**
per prop box 360/325/220/204 → 0/0/0/40 px, whole picture 1728 → 459 px of straight
line the art does not draw and 2178 → 357 px of invented bold ink (RED False →
GREEN True, 7 boxes failing → none); **grain** props and highlights over mid
grounds 0.0 → 0.0 (ceiling 0.5), mid grounds 5.0 → 6.6 levels, wall 0.0 → 0.0;
**key matte** 0.0 share and 0.0 levels; **ink retention** 0.934–1.011; **pass
contribution** material_paper 3.66 → 3.43 against a floor of 3.0, the thinnest
because the round made the texture quiet. Every judged verdict is GREEN and all
nine negative controls fire — `V3-INSTRUMENT-RED.log`.

## Reusable procedure

1. Inspect the renderer's real compositing seam before choosing a treatment.
2. Key each region's palette and stroke/detail scale to its size and depth; never run small props at the large-area parameters.
3. Keep every material/light mark static art: a temporal reseed is flicker.
4. Put the light map above the actor plane so one source lights set and actors.
5. Feather a matte with a 2-D ramp; two rectangle ramps in one fill are not a feather — where the other axis sits at full cut the rect end becomes a step (measured 22–25 levels until the check found it).
6. Hold the washes off the drawn art rather than redrawing the art above them: a pass that restates a prop also restates what the base art hides, and a rectangle over a hidden surface is a wireframe.
7. A screen-blended pass's residual depends on what is under it, so a sustained paper mark shows up in the key's contribution field; earn a quiet pass's contribution from high-frequency tooth instead.
8. Measure each pass by dropping it from the compiled manifest, and keep the ablation tool out of the production path.
