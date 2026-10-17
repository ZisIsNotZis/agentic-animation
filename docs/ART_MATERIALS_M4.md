# M4 — Materials and light

**Current state: ART NOT DELIVERED.** Round 6 replaced the round-2..5 prop matte with
layer order, as directed: the props that stand in front of the set are now their own
declared layer above all four passes. That preserves their ink exactly (three of the
eight regions reach 1.000–1.005 against a 0.90 floor) without any hold-off geometry,
but it cannot reach the props the art draws behind the counter or the actor plane, so
five regions stay washed and `ink_contrast_preserved` stays red. Numbers in
`m4-20261017T110548+0800/ITERATION-v6.md`; the state a successor inherits is at "Next".

## Outcome and visible deliverable

One visibly upgraded treatment of the **accepted M3 set** `library/set/canteen_counter_m3`
with the accepted figure `figure/lin_b_draft` in the committed `episodes/showcase-props`
canteen beat: each region gets its own pigment family, contour weight and detail density
follow the size and depth of what is drawn, and one declared light model lights set and
actors together — delivered with **layered ablation frames** isolating each pass's
contribution and render cost. Scope and budget belong to the
[roadmap](ART_PRODUCTION_UPGRADE.md) M4 row; the direction is
[ART_DIRECTION_M1](ART_DIRECTION_M1.md) B; the seams are [ART_WORLD_M3](ART_WORLD_M3.md),
[WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md) and [SCHEMAS](SCHEMAS.md).

## Renderer facts (read before choosing a mechanism, 2026-10-18)

- Set art is **not** restricted to the figure allowlist: `preloadLocationScenes`
  (`packages/adapters/renderer-remotion/src/index.ts`) injects each declared `<g id>`
  group verbatim, so `defs`, gradients and masks work without an engine change (filters
  and raster were rejected by choice).
- Each declared set layer composites as **its own `<svg>` sibling** in
  `packages/studio/src/components/performance/Stage.tsx`, in declaration order:
  background layers take `zIndex` 0..n below the prop and actor planes (20, 40),
  foreground layers 70+ above them, and an entry may carry `blend` and `opacity`. So
  **a layer above the passes is above the counter and the actor plane too** — the
  constraint round 6 turns on. A `props` entry is a set layer like any other.
- Figure artwork **is** allowlisted (`packages/core/src/schemas/figureArtwork.ts`): no
  `filter`, `pattern`, `style` or `mask` — figure coherence comes from a pass over the
  actor plane.

## Chosen mechanism

**Region palettes + scale-keyed strokes and contour recovery + one declared lighting model,
as additive declared passes on the M3 set-layer seam, with the drawn props composited above
them by layer order.** Reasons: it works on the accepted assets without new assets, spends
no new dependency, keeps authoring in `library/`, and is measurable per pass. From the
huashu sources (read, not copied — `vendor/huashu-art-motion/references/04-纯代码绘制.md`):
region palette beats colour jitter; boiling everything reads as flicker, so no pass has a
temporal term; light map over the whole picture, so the light passes sit **above** the
actor plane.

Passes, in declared order (each is one ablation unit):

| Pass | Mechanism | Declared shape |
| --- | --- | --- |
| `material_pigment` | region palettes: each region's own light/shade pigment family, warm key vs cool fill separation | after `counter`, before actors, normal blend |
| `material_detail` | scale-keyed contours: near/large silhouettes weighted, far art thinned, visible prop ink and speculars restored | after `material_pigment` |
| `lighting_shade` | one declared source (window, left): radial falloff plus a cool ambient fill, both covering the frame | foreground (above actors), multiply |
| `lighting_key` | the same declared source as warm key: one gradient across the room plus the actors' lit side | foreground (above actors), screen |
| `props` | **layer order instead of a matte**: the drawn props the art puts in front of everything composite above all four passes, so no wash touches their ink and no hold-off geometry exists to present a boundary | foreground, last |

**Which props it holds, measured not chosen** (`scripts/v6/prop_reach.py`): a prop can be
raised only when no actor pixel covers it (the actor silhouette being the difference
between the `a0` arm and a render with the actors absent) and no set layer hides part of
it. So the layer carries the **glass display case with its pastries, the stacked bowls
and the steamer with its drawn steam**; the hanging sign (46 % actor pixels), jar shelf
(76 %), small jar (100 %) and cloth runner (47 %) are behind the actors, and the cooler,
the crates and the wall chalkboard are behind the counter — raising those three in a
trial revealed **17 553** still px of hidden geometry (the cooler's left 80 units at
`y 466..716 x 1596..1698`, the crates' right 58 at `y 519..716 x 220..298`, the
chalkboard's shelf at `y 350..405 x 1389..1656`), i.e. the counter painted over. As delivered, the M3 picture with all four passes dropped is **0 px different**.

**Withdrawn, with their reasons (not silently dropped):**

| Mechanism | Why it is gone |
| --- | --- |
| `m4_prop_hold_off` (one feathered matte holding the washes off the ten drawn props) | `VISION-REVIEW-4` P0: its exclusions presented boundaries the art does not draw (a streak across both actors, a ghost under the display case, a box round the register, slivers beside the cooler). Replaced in round 6 by the `props` layer: the matte bought the props' ink (1.000 → 0.623..0.883 without it) and paid with those edges. |
| `material_paper` (four fibre tiles, a 45° shade hatch, three dry-brush ramps, seven bands) and `m4_joint_ink`'s seven 24 × 230 plate rects in `material_detail` | `VISION-REVIEW-4` P1 "four conspicuous vertical textured columns down the front face of the brown counter" — the pass *was* the tiling, and the plates were a fibre tile inside a rectangle whose straight sides the art does not draw. So both went rather than being re-tiled; the frame carries no paper tooth. |
| fifteen ambient-occlusion / cast-shadow patches in `lighting_shade` | four were 7–14 art units tall and hundreds long — a straight streak: the P0 slice through the steamer lid, the streak at counter height |
| `ink_contour` (a sixth pass restating each prop's line work above the washes) | `VISION-REVIEW-2` P0 "bounding-box ink contour etching": it also restated the parts the base art hides (360 px of undrawn straight line in the cooler box). Deleted, not repaired. |

## Layered ablation plan

Frames at the frozen beats of the committed props choreography (f0000 wide, f0104
handover, f0160 putdown, 1280×720, 24 fps), rendered from a `/tmp` verification episode
carrying those beats by dropping declared layers from the compiled IR in a disposable
scratch tool — the delivered candidate is always the unmodified set art: **A0** M3 art →
**A1** +pigment → **A2** +detail → **A4** +lighting (full candidate), plus
**leave-one-out** from A4 on each pass. `props` is not a pass and stays in every arm.

## Non-goals

1. No new set, figure, prop or episode: treatment is applied to the committed
   `showcase-props` beat, no worlds are built.
2. No motor, camera, DSL, procedure or compiler-semantics change; no `episode.yml` edit, no
   figure `artwork.json` rewrite.
3. No per-actor projected shadow (set art is static, staging varies per episode).
4. No raster texture, AI bitmap, third-party asset or `filter` effect, and no
   drawing-library extraction (M7/M8) or skill file: every mark is original vector art.
5. No new dependency, service, publication or production-scale render.

## Acceptance criteria

**Art** — the ablation proves each pass contributes; the full candidate reads as one medium
over the M3 set with one coherent light direction (window, left) reaching the actors.
Judged on stills by a fresh reviewer and at the gate. **Function (decidable, this
worker)** — `anim check` passes on the committed episode; `npm run typecheck`, `npm test`,
`npm run smoke` green; `git diff --check` clean.

Falsifiable numeric checks on the rendered PNGs, thresholds unchanged since round 1:
1. **Pass contribution**: each pass's drop-one delta over its footprint clears a floor
   (share of pixels moved > 2 levels ≥ 0.02, mean ≥ 3.0).
2. **Detail preserved**: edge energy in the small-prop regions and the figure's box
   stays ≥ 0.95 of A0 and the strong-edge share ≥ 0.90, at every rendered beat.
3. **No flicker**: static regions are identical frame-to-frame and a repeated render is
   byte-identical. **Coherent lighting**: matched far-wall bands keep the window side
   brighter, each shadow-side sample darker than its lit counterpart at the same depth.
   **Marked unreduced**: measured through the production renderer on rendered PNGs.
4. **No hard matte edge**: ≤ 0.1 % of flat art sits on a monotone boundary and no
   boundary carries more than 3 luminance levels across one pixel.
5. **No pass draws a frame**: per prop box, the straight dark line along x or y that the
   M3 art has no edge under is ≤ 100 px, and bold ink 3 px from every M3 ink pixel ≤ 200 px.
6. **No straight bands, tiles or frames** (v5, primary for the fourth review): in each
   pass's own contribution field no run longer than 48 px stands 2.0 levels clear of the
   field on both sides and is no thicker than 28 px unless the art draws both of its own
   boundaries; no pitch repeats between 4 and 40 px; no four bands close a rectangle of
   40 px a side. Ceiling 0; eleven synthetic controls must fire.
7. **Visibility cross-check**: for every reported band, whether the composite shows a
   confined level edge (2.5 levels, within 12 px) that the baseline does not draw — what
   separates a streak a viewer sees from a pass responding to dark art.
8. **Ink survives the medium** (secondary): the M3 art's strokes keep ≥ 90 % of their
    local contrast and stand ≥ 4× above any added grain.
9. **The M3 picture is unchanged by the mechanism** (round 6): with every pass dropped,
    the delivered set renders the same pixels as the art before the `props` layer — the
    layer moves marks, it never redraws them. Measured 0 px at f0000 and f0160.

**Retired, with reasons:** `material_paper`'s pass contribution, the grain-by-tone and
tooth-keyed-to-surface checks and the stroke-to-grain ratio (no tooth since round 5), and
`light_reserved_off_small_props` — **superseded, not weakened**: it asked whether the
light model is held off a small prop, and the answer is now structural, since a raised
prop composites above every wash and the key's contribution inside its box is 0 by
construction (bowl, case, steamer and window boxes read 0; props below the passes read
0.33–18.3). The matte it measured no longer exists.

## Round 6, before → after, same instrument, no threshold touched

| Criterion (floor / ceiling) | before `ba25ffb` | after the `props` layer |
| --- | --- | --- |
| `ink_contrast_preserved` per region (0.90) | 0.623–0.883, 0 of 8 pass | **bowl stack 0.760 → 1.000, display case 0.752 → 1.005, steamer 0.774 → 1.000 pass**; jar shelf 0.816/0.881/0.883, cooler 0.628, crates 0.720, chalkboard 0.737 → 0.744, A-board 0.656 — 5 of 8 still fail |
| `detail_preserved` (0.95 edge, 0.90 strong) | 0.708–0.937, 5 of 6 regions fail | bowl stack **0.845 → 0.951 / 0.992 → 0.971 pass**; steamer **0.929 → 0.877** (see limit); cooler, fruit, jar shelf and figure box unchanged |
| `each_pass_contributes` (0.02 / 3.0) | detail 0.0183 fail, other three pass | detail **0.0144** fail (its prop restatement now sits under the props), other three pass |
| `key_light_edges_feathered` (3.0) | 5.84 fail | **7.43 fail**: the largest step is now the bowl stack's own left edge (art x 1443, y 314..321) where the key's coverage ends |
| `no_straight_bands` (0) | 9 / 9 / 8 | **9 / 7 / 5**: the bowl stack's plinth band (`material_detail`, y 387..394 x 1239..1618, 7.7 levels) is gone and one 4.8-level band appears below the raised display case (x 525..529, y 381..460); the other moves are bands that sit near the detector's thresholds (one of them measured an identical 9.95-level field in both runs) |
| unchanged | `no_closed_boxes` 0, `no_ghost_edges` 315 px (not on the raised props), `no_frame_traces`, `no_flicker`, `lighting_coherent` and `pass_contribution_frame_invariant` pass, texture pitch retired (no tiling pass, no `<pattern>`), `light_reserved_off_small_props` retired and now structural | same |
| M3 picture unchanged with the passes dropped | — (round 5 deleted art) | **0 px** at f0000 and f0160 |

## Evidence, limits and next actions

- Evidence: `m4-20261017T110548+0800` under
  `/home/z/.local/share/agentic-animation/art-baselines/`; no generated media is committed.
  Round 6: `ITERATION-v6.md`, `analysis-v6-{before,final}.json`, `stills/ablation-v6{,-before}`,
  `stills/m3-picture-before|after` (identity control), `stills/trial-{seven,five}-props`,
  `stills/review-6` = `/tmp/m4view6` (nine 960 px JPEGs), `scripts/v6/` (`analyze.py`,
  `spec-v6.json`, `still.mjs`, `prop_move.py`, `prop_reach.py`, `V6-PROP-REACH.log`).
- **Limit, mechanism (the round's finding):** layer order moves the wash boundary to each
  raised prop's own silhouette instead of removing it — the composite hides it (the art
  draws a stroke there) but the contribution field steps 7.43 levels at the bowl stack's
  left edge, which is why the key-edge ceiling is still red. A raised prop also stops
  taking the wash while its ground keeps it, so *silhouette* contrast can fall where the
  wash darkens that ground: on the A-board the board interior went 0.652 → 1.000 while its
  legs against the floor went 0.663 → 0.513 (region median 0.656 → 0.618) — why the
  A-board, otherwise clear at 15 px revealed, is not in the layer. It also removes the
  gradients a screen blend adds at a dark prop's edges: the steamer's `detail_preserved`
  went 0.929 → 0.877 while its ink retention went 0.774 → 1.000. And a `props` entry is
  above the actor plane, inert here (no actor pixel touches these three) but a held prop
  would be drawn below it: a counter-front prop needs re-measuring.
- **Limit, renderer (durable):** renders are byte-identical inside a session and differ by
  1 level in 80 988 px (8.8 %) between them — 8-bit quantisation of the M3 art's
  overlapping translucent fills; no still is hash-bound across sessions. The reference PNG
  for `m3_render_unchanged_when_m4_passes_dropped` is absent from `scripts/v6`, so that
  verdict is red in both runs; `stills/m3-picture-before|after` is the control used here.
- **Limit, instrument:** the band detector cannot separate a wash patch on already-dark art
  from the pass's tonal response to it (under screen or multiply the contribution field
  reproduces dark shapes as ridges), which is why `visible_level_edges` is reported beside
  it. `ink_contrast_preserved` is also a compound verdict whose grain clause
  (`grain_paper_pass == 0.0`) is unsatisfiable since round 5 withdrew the paper pass: read
  the retention column.
- **Limits, disclosed:** no image modality here, so the perceptual verdict is the fresh
  reviewer's and the gate's; and `tools/asset-qa/check.ts` rejects
  `gradient`/`filter`/raster for the 23-asset materializer only, not for M4 sets.

## Next

M4 art is **not delivered**. Round 6 narrows the trade to one statement: layer order is the
right mechanism and its reach is exactly the props standing in front of the whole set —
three of eight ink regions, picture unchanged. The five regions still under 0.90 belong to
props drawn *behind* the counter (cooler 0.628, crates 0.720, chalkboard 0.744, A-board
0.656, the last clear of occlusion so its cost is the ground) or behind the actors (jar
shelf 0.816–0.883). Reaching them needs a mechanism this seam lacks: passes that leave
luminance contrast intact on dark art (a hue-only blend is available on the declared layer
and is the untried route), or accepting the A-board's silhouette loss. Evidence: `ITERATION-v6.md`, `scripts/v6/prop_reach.py`.
