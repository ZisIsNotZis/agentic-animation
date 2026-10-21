# M4 — Materials and light

**Current state: the ink answer is delivered, and the art gate is the seventh review's.**
Round 7 gave every wash the blend mode that does its job without moving the drawn values:
pigment `color`, both light passes `soft-light`. Ink retention is **0.964–1.063 in all
eight regions** (floor 0.90) — including the five that never passed — with **no matte, no
clip, no hole and no raised prop layer**; straight bands fall from 9/7/5 to **2/0/0**, the
composite's confined level edges from 46/42/42 to **0/0/0**, the key-light feather from
7.43 to **0.00**, ghost edges from 315 px to **0 px**. Numbers and the two criteria no art
can turn green are under "Acceptance" and "Round 7"; the round record is
`m4-20261017T192030+0800/ITERATION-v7.md`.

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
  background layers take `zIndex` 0..n below the prop plane (20) and the actor planes
  (each actor's own `z`, D1), foreground layers 70+ above them, and an entry may carry
  `blend` and `opacity`. So a layer above the passes is above the counter and the actors too.
- `mix-blend-mode` takes any CSS mode, and the **non-separable ones were probed, not
  assumed**: eight one-page renders through the renderer's own Chrome, an absolutely
  positioned `<svg>` sibling over a two-tone backdrop, keeping 1.004 (`color`), 0.996
  (`hue`), 0.981 (`saturation`) and 0.964 (`soft-light`) of the ink/paper contrast where
  `normal`/`multiply`/`screen` keep 0.00/0.49/0.51 and `luminosity` keeps 0.00. A second
  sweep over 64 wash/mode/alpha combinations is in the round record.
- Figure artwork **is** allowlisted (`packages/core/src/schemas/figureArtwork.ts`): no
  `filter`, `pattern`, `style` or `mask`; figure coherence comes from a pass over actors.

## Chosen mechanism

**Region palettes + scale-keyed contours + one declared lighting model, as additive
declared passes on the M3 set-layer seam, each composited in the mode that leaves the
drawn values alone.** Reasons: it works on the accepted assets without new assets, spends
no new dependency, keeps authoring in `library/`, and is measurable per pass. From the
huashu sources (read, not copied — `vendor/huashu-art-motion/references/04-纯代码绘制.md`):
region palette beats colour jitter; boiling everything reads as flicker, so no pass has a
temporal term; light map over the whole picture, so the light passes sit **above** the
actor plane.

| Pass | Mechanism | Declared shape |
| --- | --- | --- |
| `material_pigment` | region palettes: each region's own light/shade pigment family, warm key glaze vs cool fill separation | after `counter`, before actors, **`color`** — hue and saturation from the glaze, luminosity from the art |
| `material_detail` | scale-keyed contours: near/large silhouettes weighted, far art thinned, speculars; the visible prop ink nothing hides | after `material_pigment`, normal blend |
| `lighting_shade` | one declared source (window, left): radial falloff plus a cool ambient fill, both covering the frame | foreground (above actors), **`soft-light`** — a dark source darkens, scaled by the surface |
| `lighting_key` | the same declared source as warm key: one gradient across the room plus the actors' lit side | foreground (above actors), **`soft-light`** with a warm source |

No layer, no prop and no region is excluded from any pass: the washes cover the whole
frame, so nothing presents a boundary the art does not draw. `soft-light` was chosen over
the luminance-neutral modes for the light passes because it still moves luminance with the
declared direction (key +3.37, shade −2.69 mean levels, `lighting_coherent` green) while
keeping 0.95–0.99 of the ink's local contrast; `color` was chosen for pigment because a
pigment glaze has no business moving values at all.

**Withdrawn, with their reasons (not silently dropped):**

| Mechanism | Why it is gone |
| --- | --- |
| `m4_prop_hold_off` (one feathered matte holding the washes off the ten drawn props) | `VISION-REVIEW-4` P0: its exclusions presented boundaries the art does not draw (a streak across both actors, a ghost under the display case, a box round the register). It bought ink (1.000 → 0.648–0.802 without it) with edges. |
| `props` (round 6's layer raising the display case, bowl stack and steamer above every wash) | It existed only to escape a wash that destroyed ink, and it could not reach the props drawn behind the counter or the actors (5 of 8 regions stayed washed). Round 7's modes do not destroy ink, so the layer has no job; the props are back in their base layers and the M3 picture is unchanged (0 px). |
| round-3 `ink_contour` | `VISION-REVIEW-2` P0 "bounding-box ink contour etching": it restated the parts the base art hides (360 px of undrawn straight line in the cooler box). |
| `material_paper` (four fibre tiles, a 45° shade hatch, three dry-brush ramps, seven bands) and `material_detail`'s seven 24 × 230 plate rects | `VISION-REVIEW-4` P1 "four conspicuous vertical textured columns down the front face of the brown counter" — the pass *was* the tiling. The frame carries no paper tooth. |
| fifteen ambient-occlusion / cast-shadow patches in `lighting_shade` | four were 7–14 art units tall and hundreds long: the P0 slice through the steamer lid, the streak at counter height. |
| `material_detail`'s straight restatements of ink the art already draws (round 7) | The window frame's two verticals and its inner opening, the sign's inner outline, the chalkboard shelf's top edge, the runner's two edges, the display case's top lip, seven jar highlight ticks. They existed to recover ink the wash destroyed; under the new modes they were ink drawn twice and were the last 2–11 level straight bands. Deleting them took bands from 5/4/4 to 2/0/0. |

## Layered ablation plan

Frames at the frozen beats of the committed props choreography (f0000 wide, f0104
handover, f0160 putdown, 1280×720, 24 fps), rendered from a `/tmp` verification episode
carrying those beats by dropping declared layers from the compiled IR in a disposable
scratch tool — the delivered candidate is always the unmodified set art: **A0** M3 art →
**A1** +pigment → **A2** +detail → **A4** +lighting (full candidate), plus
**leave-one-out** from A4 on each pass.

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
   separates a streak a viewer sees from a pass responding to its backdrop.
8. **Ink survives the medium** (secondary): the M3 art's strokes keep ≥ 90 % of their
    local contrast and stand ≥ 4× above any added grain.
9. **The M3 picture is unchanged by the mechanism**: with every pass dropped, the
   delivered set renders the same pixels as the art before the passes — 0 px at f0000 and
   f0160, against a repeat render, against the pre-edit render, and (actor-free) against
   round 6's stored stills.

**Retired, with reasons:** `material_paper`'s pass contribution, the grain-by-tone and
tooth-keyed-to-surface checks and the stroke-to-grain ratio (no tooth since round 5), and
`light_reserved_off_small_props` — **superseded, not weakened**: it asked whether the light
model is held off a small prop, and holding the light off a prop is exactly what destroyed
its ink. The light now covers every prop by design; the ink criterion is what protects
them. The matte it measured no longer exists.

## Round 7, before → after, same instrument, no threshold touched

| Criterion (floor / ceiling) | round 6 `875920e` | round 7 |
| --- | --- | --- |
| `ink_contrast_preserved` per region (0.90) | 0.623–1.005, 3 of 8 pass | cooler 0.628 → **0.999**, crates 0.720 → **0.995**, chalkboard 0.744 → **1.000**, A-board 0.656 → **1.008**, jar shelf 0.816–0.883 → **0.985–0.987**, case 1.005 → 0.964, bowl 1.000 → 1.063, steamer 1.000 → 1.001 — **8 of 8 pass** |
| figure box (context only) | 0.849–0.883 | 0.992–0.997 |
| `detail_preserved` (0.95 / 0.90) | 0.708–0.951, 5 of 6 fail | **0.956–1.199 / 0.963–1.231, 6 of 6 pass** |
| `each_pass_contributes` (0.02 / 3.0) | detail 0.0144 fail | pigment 0.412 / 3.01, detail 0.021 / 12.6, shade 0.446 / 3.07, key 0.550 / 3.59 — **all pass** |
| `no_straight_bands` (0) | 9 / 7 / 5 | **2 / 0 / 0**; `visible_level_edges` 46/42/42 → **0/0/0** |
| `key_light_edges_feathered` (3.0) | 7.43 | **0.00**, 0 hard-step px |
| `no_ghost_edges` (0 px) | 315 px | **0 px** |
| `no_closed_boxes`, `no_frame_traces`, `no_flicker`, `lighting_coherent`, controls | pass | pass |
| M3 picture with every pass dropped | 0 px (same session) | **0 px** against round 6's stills at f0000 and f0160 |
| picture as a quantity | mean chroma 45.2, luminance σ 42.8 | **51.5 and 46.9** (M3 art: 54.8 and 47.2) |

## Evidence, limits and next actions

- Evidence: `m4-20261017T192030+0800` under
  `/home/z/.local/share/agentic-animation/art-baselines/`; no generated media is committed.
  Round 7: `ITERATION-v7.md`, `analysis-v7-final.json` (+ `analysis-v7-attempt1.json`),
  `identity-v7.json`, `identity-m3-v7.json`, `tint-v7.json`, `stills/ablation-v7`,
  `stills/ablation-v7-attempt1` (three beats), `stills/a0-noactors`, `stills/review-7` =
  `/tmp/m4view7` (nine 960 px JPEGs), `scripts/v7/` (`analyze.py` byte-identical to v5,
  `spec-v7.json`, `still.mjs`, `setlayers.py`, `edit7.py`, `makeview.py`), and
  `probe/blend-support/` (the 8 + 64 page blend-mode probe).
- **Residual, exactly:** two bands at f0000 only, `lighting_key` 3.11 and
  `candidate_minus_baseline` 2.62 levels over art y 127–157, x 498–720 — the window's own
  teal top bar, which `soft-light` lifts about one level more than the bright glass beside
  it because the mode's response is a function of the backdrop's value. It is not a wash
  boundary; the composite shows 0 confined level edges. Removing it means making the light
  passes luminance-neutral, which zeroes `lighting_coherent`'s signed-luminance clauses and
  leaves a light model with no value direction — recorded, not taken.
- **Limit, instrument:** `ink_contrast_preserved` is a compound verdict whose grain clause
  requires `grain_paper_pass == 0.0`, unsatisfiable since round 5 withdrew the paper pass;
  the retention column is the number. `m3_render_unchanged_when_m4_passes_dropped` compares
  against a session reference PNG that has never existed in `scripts/`, so it reads red;
  the identity controls above are the substantive ones.
- **Limit, mechanism:** the contribution floors now clear with little margin (pigment 3.01,
  shade 3.07 against 3.0), because a tint moves far fewer levels than a wash did (per
  changed pixel: pigment 4.68 → 3.01, shade 11.30 → 3.07, key 9.36 → 3.59). Weakening
  either pass fails the floor before it fails the ink.
- **Limit, perceptual:** this worker has no image modality, so every verdict here is a
  quantity; the stills above are the reviewer's input. **Cross-session determinism** is
  recorded in `docs/tickets/BACKLOG-RENDER-NONDETERMINISM.md` as 1 level in 8.8 % of
  pixels; this run's actor-free identity stills matched round 6's byte for byte, so it is
  not reproduced here rather than refuted. `tools/asset-qa/check.ts` rejects `gradient`,
  `filter` and raster for the 23-asset materializer only, not for M4 sets.

## Next

The art gate: the seventh review on `/tmp/m4view7/` decides whether this reads as one medium
over the M3 set with one light direction, and the user decides the milestone. If a review
finds the pigment too strong or the light too flat, the levers are the three scale factors
in `scripts/v7/edit7.py` (pigment opacity, shade opacity, detail contour weight) — each was
measured, and the floors they clear are stated above. If a later round needs `bands = 0`
outright, the only remaining route is a luminance-neutral light model, whose cost is
`lighting_coherent`.
