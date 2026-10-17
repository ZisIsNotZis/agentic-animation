# M4 — Materials and light

**Current state: ART NOT DELIVERED.** Two causes the fourth perceptual review named
were deleted in round 5 and are measured gone; the deletion of the reserve that
produced them costs the props their ink contrast, and four criteria that were green
fail on the result. Numbers and evidence in
`m4-20261017T110548+0800/ITERATION-v5.md`; the decision a sixth round would face is
at "Next".

## Outcome and visible deliverable

One visibly upgraded treatment of the **accepted M3 set**
`library/set/canteen_counter_m3` with the accepted figure `figure/lin_b_draft`
in the committed `episodes/showcase-props` canteen beat: every region carries its own
pigment family, contour weight and detail density follow the size and depth of what
is drawn, and one declared light model lights set and actors together — delivered with
**layered ablation frames** isolating what each pass contributes and its render cost.
Scope and budget are owned by the [roadmap](ART_PRODUCTION_UPGRADE.md) M4 row; the
direction is [ART_DIRECTION_M1](ART_DIRECTION_M1.md) B; the seams are
[ART_WORLD_M3](ART_WORLD_M3.md), [WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md)
and [SCHEMAS](SCHEMAS.md).

## Renderer facts (read before choosing a mechanism, 2026-10-18, HEAD `e3bfddf`)

- Set art is **not** restricted to the figure artwork allowlist:
  `preloadLocationScenes` (`packages/adapters/renderer-remotion/src/index.ts`) injects
  each declared `<g id>` group's text verbatim, so `defs`, gradients, masks and any
  number of shapes work without an engine change; filters and raster were rejected by
  choice (cost, determinism), not capability.
- Each declared set layer composites as **its own `<svg>` sibling** in
  `packages/studio/src/components/performance/Stage.tsx`, back-to-front, with the actor
  and prop planes between the non-foreground and `foreground` entries; a layer entry
  may carry `blend` and `opacity`, which become CSS `mix-blend-mode`/`opacity` on that
  element. That is what lets one light pass cover the actors.
- Figure artwork **is** allowlisted (`packages/core/src/schemas/figureArtwork.ts`): no
  `filter`, `pattern`, `style` or `mask`, so figure coherence comes from a pass over
  the actor plane or authored figure art.

## Chosen mechanism

**Region palettes + scale-keyed strokes and contour recovery + one declared lighting
model, implemented as additive declared passes on the M3 set-layer seam.** Selection
reasons: it is the only family that works on the accepted assets without new assets,
spends no new dependency, keeps authoring in `library/` (no parallel DSL), and is
measurable per pass. Learned from the huashu sources (read, not copied —
`vendor/huashu-art-motion/references/04-纯代码绘制.md`, `.../lib/paint.js`,
`.../lib/brush.js`): region palette beats colour jitter; boiling everything reads as
flicker, so no pass has a temporal term; light map over the whole picture, so the
light passes sit **above** the actor plane.

Passes, in declared order (each is one ablation unit):

| Pass | Mechanism | Declared shape |
| --- | --- | --- |
| `material_pigment` | region palettes: each region's own light/shade pigment family, warm key vs cool fill separation | after `counter`, before actors, normal blend |
| `material_detail` | scale-keyed contours: near/large silhouettes weighted, far art thinned, visible prop ink and speculars restored | after `material_pigment` |
| `lighting_shade` | one declared source (window, left): radial falloff plus a cool ambient fill, both covering the frame | foreground (above actors), multiply |
| `lighting_key` | the same declared source as warm key: one gradient across the room plus the actors' lit side | foreground (above actors), screen |

Every pass covers the whole frame with one gradient: no cut-outs, no prop exclusions,
no tile and no `<pattern>` element in the source. A prop therefore takes the light
like everything else, which is round 5's decision and its cost (see below).

**Withdrawn, with their reasons (not silently dropped):**

| Mechanism | Why it is gone |
| --- | --- |
| `material_paper` (four per-ground fibre tiles, 45° shade hatch, three dry-brush ramps, seven bands) | `VISION-REVIEW-4` P1 "four conspicuous vertical textured columns down the front face of the brown counter". The pass *was* the tiling, so it was withdrawn rather than re-tiled; the frame now carries no paper tooth. |
| `m4_prop_hold_off` (one feathered matte holding the washes off the ten drawn props) | `VISION-REVIEW-4` P0: its exclusions presented boundaries the art does not draw (a streak across both actors, a ghost under the display case, a box round the register, slivers beside the cooler). |
| `m4_joint_ink` + seven 24 × 230 plate rects in `material_detail` | the same P1: a fibre tile inside a rectangle whose own straight sides the art does not draw |
| fifteen ambient-occlusion / cast-shadow patches in `lighting_shade` | four of them were 7–14 art units tall and hundreds long, which the eye reads as a straight streak — the P0 slice through the steamer lid and the streak at counter height |

## Layered ablation plan

Frames at the frozen beats of the committed props choreography (f0000 wide, f0104
handover, f0160 putdown, 1280×720, 24 fps), rendered from a `/tmp` verification
episode that carries those beats by dropping declared passes from the compiled IR in a
disposable scratch tool — the delivered candidate is always the unmodified set art, and
the ablation is never a production entry point:
**A0** M3 committed art → **A1** +pigment → **A2** +detail → **A4** +lighting (full
candidate), plus **leave-one-out** from A4 on each pass. (A3 was +paper; that arm is
gone with the pass.)

## Non-goals

1. No new set, figure, prop or episode; M4 applies treatment to the committed
   `showcase-props` beat, it does not build worlds.
2. No motor, camera, DSL, procedure or compiler-semantics change; no `episode.yml`
   edit, and no figure `artwork.json` rewrite.
3. No per-actor projected shadow: set art is static and staging varies per episode.
4. No raster textures, no AI-generated bitmaps, no third-party asset copying and no
   `filter`-based effect (blur/feTurbulence): every mark is original vector art.
5. No new dependency, service, publication or production-scale render.
6. No reusable drawing library extraction (M7/M8) and no skill file.

## Acceptance criteria

**Art** — the ablation proves each pass contributes; the full candidate reads as one
medium over the M3 set, with one coherent light direction (window, left) that reaches
the actors. Judged on stills by a fresh reviewer and at the gate.

**Function (decidable, this worker)** — `anim check` on the committed episode passes;
`npm run typecheck`, `npm test`, `npm run smoke` green; `git diff --check` clean.

Falsifiable numeric checks on the rendered PNGs, each with its threshold:
1. **Pass contribution**: each pass's drop-one delta over its own footprint is above a
   floor (share of pixels moved > 2 levels ≥ 0.02, mean ≥ 3.0).
2. **Detail preserved**: edge energy inside the small-prop regions and the figure's box
   stays ≥ 0.95 of A0 and the strong-edge share ≥ 0.90, at every rendered beat.
3. **No flicker in the delivered candidate**: static regions are identical
   frame-to-frame and a repeated render is byte-identical.
4. **Coherent lighting**: matched far-wall bands keep the window side brighter, each
   shadow-side sample darker than its lit counterpart at the same depth.
5. **Marked unreduced**: measured on rendered PNGs through the production renderer.
6. **No hard matte edge**: at most 0.1 % of flat art sits on a monotone boundary and no
   boundary carries more than 3 luminance levels across one pixel.
7. **No pass draws a frame**: per prop box, the straight dark line along x or y that the
   M3 art has no edge under is ≤ 100 px, and the bold ink 3 px from every M3 ink pixel ≤ 200 px.
8. **No straight bands, tiles or frames** (v5, primary for the fourth review): in each
   pass's own contribution field no run longer than 48 px stands 2.0 levels clear of the
   field on both sides and is no thicker than 28 px unless the art draws both of its own
   boundaries; no pitch repeats between 4 and 40 px; no four bands close a rectangle of
   40 px a side. Ceiling 0. Eleven synthetic controls must fire, including a pool and a
   slope scoring 0 and a drawn shape scoring 0.
9. **Visibility cross-check**: for every reported band, whether the composite shows a
   confined level edge (2.5 levels, transition within 12 px) that the baseline does not
   draw — the number that separates a streak a viewer sees from a pass responding to
   dark art.
10. **Ink survives the medium** (secondary): the M3 art's strokes keep ≥ 90 % of their
    local contrast and stand ≥ 4× above any added grain.

**Retired in round 5, with reasons:** `material_paper`'s pass contribution, the
grain-by-tone and tooth-keyed-to-surface checks (no tooth exists), the
stroke-to-grain ratio, and `light_reserved_off_small_props` (the washes no longer
exclude the props — that is the round's decision, not a measurement regression).

## Evidence, limits and next actions

- Evidence lives in the archive bundle `m4-20261017T110548+0800`
  (`/home/z/.local/share/agentic-animation/art-baselines/`); no generated media is
  committed. Per round: `stills/ablation/`, then `-iterated`, `-v2`, `-v3`, `-v4`,
  `-v5` with `ITERATION*.md`, each superseded by the next.
- **Authoritative set:** `analysis-v5-final.json`, `ITERATION-v5.md`,
  `stills/ablation-v5` (eight arms × up to eleven frames, `scripts/v5/analyze.py`); the
  same analyzer on the rejected art is `analysis-v5-red.json` + `V5-INSTRUMENT-RED.log`;
  the fifth review's nine images are `stills/review-5/` (also `/tmp/m4view5/`).
- **Frame provenance:** the frames come from a `/tmp` verification episode carrying the
  committed `showcase-props` choreography, not a re-render of `episode.yml`; `anim check`
  passing links the measured set to it. `stills/ablation-v4` is byte-identical to a
  fresh render of `b54cbdf` at f0000 (`max_abs_rgb 0.0`), so the red case is bound to
  that revision.
- **Limit, renderer (durable):** renders are byte-identical inside a session and differ
  by 1 level in 80988 px (8.8 %) between them — 8-bit quantisation of the M3 art's
  overlapping translucent fills. No still is hash-bound across sessions;
  `m3_render_unchanged_when_m4_passes_dropped` compares same-session renders only.
  `docs/tickets/BACKLOG-RENDER-NONDETERMINISM.md` holds the probe.
- **Limit, instrument:** the band detector cannot separate a wash patch on art that is
  already dark from the pass's tonal response to that art; the composite cross-check is
  reported beside it for that reason. Under a screen or multiply blend the contribution
  field necessarily reproduces dark shapes as ridges.
- **Limit, disclosed:** this worker has no image modality, so the perceptual verdict is
  the fresh reviewer's and the gate's.
- **Known inconsistency (outside the npm gates):** `tools/asset-qa/check.ts` rejects
  `gradient`/`filter`/raster for the 23-asset materializer only, not for M4 sets.

## Fix rounds (2026-10-18)

Four vision reviews judged the stills **FAIL** while the mechanical verdicts of the time
passed; each round began with the instrument. Full records: `ITERATION-v2.md`,
`ITERATION-v3.md`, `ITERATION-v4.md`, `ITERATION-v5.md`.

| Round | Review's defect | Cause measured on the rejected art | Fix |
| --- | --- | --- | --- |
| v2 | P0 hard light-mask edges over the counter front and an actor's torso | even-odd holes and rectangle masks: **28.2** levels across one pixel | one shared feathered matte; spill, pool, rim and sill became gradient glows |
| v2 | P1 steamer obliterated, texture reads as a screen | washes on the ink (**0.787** of the M3 stroke contrast); one alpha over every surface (**20.9** levels of grain on props against 6.9 on mid grounds) | tooth keyed to the surface, dot screen 0.55 → 0.24, and a sixth `ink_contour` pass — **which was the next round's defect** |
| v3 | P0 "bounding-box ink contour etching", P1 steamer lattice | the contour pass restated each prop's line work above every wash, including the parts the base art hides: **360** px of undrawn straight line in the cooler box, 204 px of invented ink on the steamer | `ink_contour` deleted, not repaired; the props' ink needs no restatement |
| v3 | P1 "paper texture still reads as a flat screen-space dot raster" | one round-dot plate on an 8-unit cell over every surface | per-ground fibre tiles and a 45° hatch — **which was the next round's defect** |
| v4 | P0 "translucent bounding box highlights and horizontal/vertical composite seam cuts" | the v3 check only looked for a straight **dark** line: flat-alpha AO and cast-shadow polygons stepped 10.9–20.4 levels over plain wood, washes ended on flat art, the register's cream panel was a hard rect | flat-alpha AO and cast shadows became elliptical pools; washes became gradients; the four prop tints went; joints became a fibre hatch (**which was the next round's defect**) |
| v5 | P0 streak at counter height, ghost under the case, box round the register, slivers by the cooler, slice through the steamer; P1 four textured columns on the counter | the v4 check only saw a *step* on a *named line*: **38** straight bands at f0000 — the counter-lip streak (y 429..438, 983 px, 14.5 levels), the counter-top cut (y 390..405, 777 px), seven 24 × 230 fibre plates (x 408..1512), four dry-brush bands (up to 1280 px), the steamer-foot patch (y 1052..1078) | matte, `material_paper`, the joint plates and the AO pools deleted — **the fixes that cost the props their ink** |

Round 5 measured, not argued: bands **38 / 36 / 35 → 9 / 9 / 8**, the paper pass's
periodic field gone (no `<pattern>` in the source at all), every round-4 site absent
from the post-deletion report — and `ink_contrast_preserved` **1.000–1.043 → 0.623–0.883**
(floor 0.90), `detail_preserved` **1.037–1.179 → 0.708–0.937** (floor 0.95),
`each_pass_contributes` material_detail **0.0295 → 0.0183** (floor 0.02),
`key_light_edges_feathered` **0.0 → 5.84** (ceiling 3.0), `no_ghost_edges` **0 → 315 px**
(43 in the figure's box). A render with only the matte removed already scores
0.648–0.802 on the ink retention while the paper pass on its own scores 1.000, so the
reserve bought the props their ink contrast and removing it is the cost of removing its
boundaries.

## Next

M4 art is **not delivered**: the round's own criteria say so, and this was the last art
round. A successor faces one trade, not another sweep of edges: the props' ink needs to
be held off the washes (0.90 floor) without the hold-off presenting its own boundary
(0.0 straight bands). The facts for that decision are in `ITERATION-v5.md` — the matte's
cost per region, the band list, and the cross-check that separates a streak from a
tonal response.
