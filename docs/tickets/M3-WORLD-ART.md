# M3-WORLD-ART — WP3 draft set `canteen_counter_m3`

## Task contract (dispatch record)

- Goal: draft set `library/set/canteen_counter_m3` — layered 1920x1080
  `scene.svg` with back-to-front `<g id>` groups plus a declared foreground
  layer, drawn perspective/depth, counter and other supports painted so the
  declared surfaces equal the painted tops within the engine tolerance,
  `safeActorArea`/`coordinateSpace` declared, narrative props/dressing in the
  accepted B-direction visual language, provenance/license in the manifest;
  targeted 1280x720/24fps stills (wide f0/f16, transfer, putdown, one close
  framing) and a self-review against the Art dimension.
- Scope (sole writer): the disposable draft library under a NEW archive-root
  bundle; this ticket. Render scratch only in `/tmp`.
- Exclusions held: no edits to `packages/`, `docs/SCHEMAS.md`,
  `library/set/school_canteen`, other sets, episodes, motor behavior; no
  archive bundle overwritten; no AI/paid/raster assets; no new dependencies or
  services; nothing staged, committed or pushed.
- Owner: WP3 art worker; parent owns dispatch, fresh review, user gate.
- Budget: 45 min, durable checkpoint by 25 min (reached: bundle with library,
  set, manifest and passing `anim check` existed by 22:21 +0800).

## Decisions

- 2026-10-14 22:19 +0800, worker: counter resting line painted AND declared
  at y=400 (top quad back edge y368, front edge y430; `counter_top_surface`
  carries `data-support-top="400"`, declared `y: 400`, x [273,1647] = the
  quad's interpolated extent at y400). Declared-painted difference 0; the M2
  y450-vs-y390 defect class is closed at the source.
- Layers (back-to-front): `backdrop` (wall, window light source, hanging
  青云小卖部 sign, wainscot tiles, jar shelf), `floor` (converging board
  seams, plank joints, window light pool, worn mat, near-floor darkening),
  `furniture` (drinks cooler, crate stack, A-board menu stand — mid-depth
  overlap), `counter` (perspective top + front face + kick + plinth +
  dressing kept OFF the resting band), `foreground_counter` (near-camera
  counter return lower-right with steamer tray and drawn steam, declared
  `foreground: true`).
- Visual language matched to accepted `lin_b_draft`: outline `#424e46`,
  muted teal `#477c7b`/cream `#eadcbb`/terracotta `#b96a55`/warm woods,
  flat fills + opacity overlays (no gradients-as-blur, no filters), light
  from the left window so the left actor (lin) is lit.
- `safeActorArea` kept at the M2-validated `{x:220, y:180, w:1480, h:720}`;
  no staging semantics changed by art.
- Draft-library loading shims (documented, machine-local): bundle
  `library/package.json` (`type: module`) and `library/node_modules` symlink
  to the repository — plugin imports need both; nothing in Git.

## Interface conformance against WP2 (verified, no mismatch)

- `scene.svg` root `viewBox="0 0 1920 1080"` == `coordinateSpace "1920x1080"`.
- Every declared layer id has a painted `<g id>`; `foreground_counter` is the
  `{id, foreground:true}` entry. Registry probe: set resolves with `world`
  attached (legacy `school_canteen` still raw `supports`).
- Support `{name:"counter", x:[273,1647], y:400, paint:"counter_top_surface"}`
  with `data-support-top="400"` — |400−400| = 0 ≤ 8.
- `anim check` green end-to-end on the real draft library; IR carries
  `setLayers` (5, one foreground), `safeArea` (0.1146/0.1667/0.7708/0.6667),
  `supportSurfaces` ([0.1422, 0.8578], y 0.37037), `setViewBox [1920,1080]`.

## Commands and results (real clock 2026-10-14 22:17–22:33 +0800)

- `anim --cwd $S check …/showcase-props/episode.yml` — check: OK (1 scene, 3
  spoken takes; set loads through the world path, no fallback).
- `anim --cwd $S make …` — performance.json written; frozen M2 audio cache
  reused (no synthesis); pre-existing M2 contact warnings only.
- `render-yaml --threads 4 --fps 24 --force` — wide 161 frames, 21.19 s wall,
  1,150,672 KiB maxRSS (M0 props: 16.87 s / 1,146,304 KiB — no material
  regression); close variant 177 frames, 21.72 s.
- ffprobe: 1280x720, 24/1 CFR, 6.727 s + 7.377 s = 14.1 s total ≤ 30 s
  budget; each clip ≤ 15 s.
- `git diff --check` — clean; HEAD `4213bc4…` unchanged; pre-existing dirt
  (M2 candidate, staged submodules) preserved; nothing staged by WP3.

## Evidence

Bundle: `/home/z/.local/share/agentic-animation/art-baselines/m3-set-art-20261014T2217+0800/`

- `library/` — durable draft library (repository copy + `figure/lin_b_draft`
  from the M2 checkpoint + `set/canteen_counter_m3`).
- `stills/m3/` — wide-0000/0016/0104/0112/0160, close-0132/0140 (1280x720).
- `stills/comparison-sheet.jpg` — M0 | accepted M2 | M3 at wide f0, transfer
  f104/f100, putdown f160.
- `media/m3-props-wide.mp4`, `media/m3-props-close.mp4`; `ir/` (performance
  JSONs + episode copies); `analysis.json` + `analyze.py` (numeric
  self-review); `SHA256SUMS.txt` (18 files); `logs/ffprobe.csv`.
- Set hashes: `scene.svg`
  `8994a70ff582d3b28ab56ecbe789175852418c9e871a454f5498582aa4fcfad5`,
  `manifest.json`
  `8e51fc95871e44d3b1d58587715a61fc9ac3f0ac48dce60589a46a7fcf16c557`; all
  18 evidence hashes in `SHA256SUMS.txt`.

## Self-review (Art dimension) — honest modality limit

The WP3 worker session had **no image modality** (image reads unsupported),
so no claim of visual inspection is made. The review below is the numeric,
falsifiable substitute from `analysis.json`; sheet/still judgment is deferred
to the parent's fresh review (WP4) and the user gate.

- Putdown established (M0 f160 defect): mean |ΔRGB| at the declared resting
  band between f0 and f160 = **60.7**/255 — the band materially changed (the
  thermos arrives on the painted top). M0's defect was no visible change.
- Depth without blur: far-wall band luminance 179.1 vs near-floor 152.8 →
  gradient **+26.4** (far lighter). Same measure: M0 **−42.3**, accepted M2
  **−36.5** — both INVERTED (bright floor under darker wall); M3 corrects the
  aerial-perspective direction, plus drawn convergence (floor seams to a
  vanishing region behind the counter, receding counter top, size/value
  graduation of cooler→crates→counter→foreground return).
- Palette/value vs accepted lin: wall mean RGB (215,197,167), saturation
  0.251 — closest anchors are lin's cream collar (dist 20.5) and warm sash
  (20.8), far from outline/teal/wood (87–122): warm-neutral support tones,
  no pure-black outlines; frame mean luminance 157.9 vs M0 162.7 / M2 167.7
  and saturation 0.365 vs 0.423/0.409 — slightly deeper, calmer key that
  keeps the hatched figure forward.
- Focal hierarchy at the interaction: sign centered above the counter, dressing
  pushed to x430–590 / x1370–1505 off the resting band, foreground mass
  lower-right counterweight, window light on the left actor. Structural in the
  SVG; perceptual confirmation deferred to review.
- Foreground layer present: corner mean RGB (149,110,78) ≈ wood family.
- Not verified here: actor containment inside `safeActorArea` in the sampled
  frames (WP2 unit-tested the clamp; frames not pixel-proven), transfer
  occlusion legibility, close-framing readability — all listed for WP4.

## Residual risks / next actions

- Visual/artistic verdict (coherence, focal hierarchy, lin harmony) needs eyes:
  WP4 fresh review over `stills/comparison-sheet.jpg` and the clips.
- Draft-library shims (`package.json`, `node_modules` symlink) are
  machine-local; bundle portability follows M0/M2 precedent (reconstruct from
  repo + checkpoint when needed).
- WP4 owns the durable episode swap (`episodes/` copy in its own bundle) —
  the two `/tmp` episode copies are disposable scratch, archived under `ir/`.

## 2026-10-17 — committed-art rework provenance (supersedes the 10-14 hashes above)

- 2026-10-17, WP4 repair worker (recorded fact, source: the WP4 gate-repair
  dispatch): the committed `library/set/canteen_counter_m3` artwork is a
  2026-10-16 rework by the WP3 worker agent, entering the repository in
  commit `d9ef6d2` (2026-10-16 22:53 +0800, "WP3 art, reusable assets only").
  The archived 10-14 draft (hashes above; bundle
  `m3-set-art-20261014T2217+0800`) is the superseded draft, not the committed
  art. Reconstruction from the artwork itself (marked as such): the rework
  refined the draft to the committed composition — new horizon (wall base
  y640), redrawn window, cooler/crates repositioned, chalkboard and stool
  added — keeping the numeric declarations at Δ0.
- 2026-10-17, WP4 repair worker: committed-art sha256 (sha256sum at head
  `948ae11`): `scene.svg`
  `b2d5d5c6c2491734461a6495c1b53e59285e458f4631fe8d36c4105ca67b1867`,
  `manifest.json`
  `4da9b4ce9e8345b93428222f96c3c37230bc0eec30507513da2fec4d509afe46`,
  `preview.png`
  `d98e24e59545f1a38dce87ea0227c827e9ac114f2a11297c7438eee41fff097c`.
  Every WP3-era record above binds the 10-14 draft only.
- 2026-10-17, WP4 repair worker: declared==painted re-verified against the
  COMMITTED art through the load-time validator (`normalizeSetWorld`):
  counter declared y400 (normalized 0.37037) == painted
  `data-support-top="400"` on `counter_top_surface`, |Δ|=0 ≤ 8, PASS; layers
  backdrop/floor/furniture/counter/foreground_counter all painted; safeArea
  normalized 0.1146/0.1667/0.7708/0.6667. Output archived in the gate bundle
  `probes/committed-support-check.json`.

## 2026-10-17 — gate-repair round: sanctioned motor exceptions and P1-1 outcome

- 2026-10-17, WP4 repair worker (integrator-sanctioned): two pre-existing
  motor defect fixes in `packages/core/src/motor/index.ts`, needed because no
  authored coordinates exist and the putdown staging could not be repaired
  inside the episode otherwise: (1) vacuous self-pursuit — a self-target
  `movement.to(x, x)` overwrote its staged-mark target with the actor's live
  position and no-op'd; now it walks to the staged mark. (2) Direction-blind
  walk clamps — the arrival/step body clamps treated bodies BEHIND the
  walker as obstacles, teleporting the walker up to hundreds of px against
  the clamp's own no-backward-correction contract; they now bind only in the
  direction of travel. Regression test in `packages/core/test/motor.test.ts`;
  full suite 257/0; the untouched M2 comparison episodes recompile with
  byte-identical trajectories (corpus check, bundle `probes/`).
- 2026-10-17, WP4 repair worker: P1-1 (putdown not visibly reading between
  the clustered actors) remains OPEN and is routed to M5 with the honest
  criterion state — the rest lands at x≈871 between the bodies (lin 998,
  awei 795 after the handover adjacency halt; invariant under every legal
  staging permutation). Three further routes were probed and are refused by
  the whole-body proposal, each a real motor-behavior question, not a defect
  fix: an empty-handed step-back walk is rejected on first-swing joint rates
  from the post-bind posture (arms mirror 84–150px in one substep at the
  facing flip); a carried walk is rejected on prop-rate for the same mirror;
  a turn-while-holding is rejected likewise. A turn-in-place behavior and a
  post-bind walk-start ease are M5-domain design work (docs/ART_WORLD_M3.md
  non-goal 7). The third sanctioned-exception request (walk-start ease) was
  withdrawn as infeasible under the 720px/s joint-rate law and no ramp was
  committed; the episode stays at its committed HEAD state.
