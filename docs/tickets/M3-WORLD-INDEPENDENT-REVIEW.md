# M3-WORLD-INDEPENDENT-REVIEW — fresh reviewer verdict (WP1–WP4 candidate)

## Contract

- Goal: independent review of the actual M3 candidate against `docs/ART_WORLD_M3.md` (outcome, non-goals, engine additions, depth/ordering, support agreement, Art/Function/Production acceptance, evidence plan) and the roadmap milestone rule in `docs/ART_PRODUCTION_UPGRADE.md`.
- Reviewer: fresh execution session, not Main, not the author of WP1–WP4; no recursion, no source repairs, no new contract, no speculative polish.
- Output: this file only. Source frozen at review time; nothing staged, committed, pushed, published, replaced or destroyed; all pre-existing dirt, staging (`.gitmodules` + vendor submodules) and bundles preserved.
- Revision binding: HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3`, dirty M2-candidate worktree carrying WP2/WP3/WP4 uncommitted work; evidence under `…/art-baselines/m3-world-integration-20261014T2233+0800/` and `…/m3-set-art-20261014T2217+0800/`. `git status` 68 entries before and after this review (unchanged by it).

## Modality honesty — what this reviewer could and could not exercise

- **Could not**: any image or audio modality. Image reads are unsupported by this session's model; there is no playback. Decoding, hashing, ffprobe and metadata are not watching or listening. Therefore **no perceptual Art judgment is claimed here** — coherence, depth-without-blur, palette/value harmony with the accepted lin, focal hierarchy, and fairness-of-comparison at the perceptual level are **not exercised** and remain exactly the human checklist items in `CHECKLIST.md` (A1–A4, B5–B8, C9–C10).
- **Could**: all machine-checkable facts, with my own commands and arithmetic, including an independent re-derivation of the frame-level proof and my own red cases. Those follow.

## Independent verification (reviewer-run commands, foreground, bounded)

Engine gates at the frozen source: `npm run typecheck` — pass; `npm run test:all` — 257 pass, 0 fail, 7 skipped (matches WP2); `npm run smoke` — SMOKE PASSED (legacy `set/agent_stage` flat path — `tools/smoke.mjs` fixture uses it); `git diff --check` — clean.

Hash/inventory and link binding of the review entry:

- `sha256sum -c SHA256SUMS.txt`: WP4 bundle 98/98 OK, WP3 bundle all OK. Review entry `index.html` `32e2bed4…1205f`, `CHECKLIST.md` `7e8d4b6…c446a16`.
- Every external link target in `index.html` exists on disk: M0 stills (`m0-20261008-4213bc4/stills/showcase-props/frame-{0,16,104,112,160}`), accepted-M2 stills (`m2-final-media-20261013T163603+0800/canonical-contact-front/frame-{0,100,160}`), M0/M2 mp4s, WP3 `scene.svg`/`manifest.json`, own stills/overlays/mp4s/receipt/logs. Labels present: 当前（本迭代新渲染）, baseline-immutable M0/M2 into their own bundles, 复用（输出等价或按设计冻结）.
- Ticket-claimed hashes reproduced by me: `scene.svg` `8994a70f…4fcfad5`, set `manifest.json` `8e51fc95…16c557`, M0 props mp4 `4c9606e0…da2bac`, accepted-M2 staged-props mp4 `ddf9550a…b9fd6b9`, M3 wide mp4 `81135978…6ff1c20`. Frozen audio: WP4 take WAVs byte-identical to M0's (`77498589…`, `1066962b…`, `193e27f5…`, incl. raw). Determinism spot-check: WP4 `stills/wide-0160.png` sha256-identical to WP3's render.

Declarations are actually consumed (code read + behavior):

- Registry: a set whose `scene.svg` paints `<g id>` groups gets `normalizeSetWorld` (validate + normalize once); missing/invalid declarations fail loading; legacy sets keep raw `supports` passthrough.
- Compiler: scene-loop reads the scene's location world, passes `safeActorArea` to `stageScene`, resolves `on(X)` through normalized `supportSurfaces`, and carries `setLayers`/`safeArea`/`supportSurfaces`/`setViewBox` on the compiled scene.
- Staging: `declaredActorBounds` clamps initial and collision placement inside the declared area; 10%–90% heuristic default intact.
- Renderer adapter: `preloadLocationScenes` injects per-layer group text keyed `<instance>/<layerId>`; legacy keeps the whole-document blob.
- Stage/PerformanceEpisode: background layers stack from zIndex 0 in declared order; `PerformanceForegroundLayers` composites at zIndex 70, above props (20), actors (40), native grip planes (50/60), below front vfx.
- Compiled WP4 IR (my read): `setLayers` = backdrop, floor, furniture, counter, {foreground_counter, foreground} back-to-front; my arithmetic on normalizations: 220/1920=0.114583, 180/1080=0.166667, 1480/1920=0.770833, 720/1080=0.666667, 273/1920=0.1421875, 1647/1920=0.8578125, 400/1080=0.370370 — all match the IR exactly.

Declared support equals painted support (my own arithmetic): painted `counter_top_surface` path `M340 368 L1580 368 L1710 430 L210 430` carries `data-support-top="400"`; declared `{x:[273,1647], y:400}`. Interpolating the quad edges at y=400: left 340−130·(32/62)=272.90≈273, right 1580+130·(32/62)=1647.10≈1647 — declared extent equals the painted extent at the declared line; |400−400|=0 ≤ 8. My own red case (tsx on `normalizeSetWorld`, /tmp fixture): declared y450 vs painted 390 **throws** `support "counter" declared at y 450 but painted at 390 (tolerance 8)` — the exact M2 defect signature is rejected; |395−390|=5 loads. The unit-test red case also ran green inside `test:all`.

Post-putdown rest, red in-flight case included: I re-ran `receipt/frame-proof.mts` on copies of the exact bundle manifests (inputs in /tmp; bundle untouched) — my regenerated `frame-proof.json` is **identical** to the bundle's. Rest frames wide f160, close f128/140/160, move f140/150: thermos base dy=−4 px (396 vs 400, |Δ|4 ≤ 8), x inside [273,1647]. In-flight red frames wide f104/f112, move f99/f128 fail at Δ69/69/69/67, move f88 at Δ81 — falsifiable and demonstrably red mid-air. All 14 sampled frames × both actors `insideSafe` true (evaluated anchors; painted-extent containment honestly deferred by the receipt itself to the human checklist). `receipt-analysis.json`: putdown_rest PASS, safe_actor_area PASS, foreground_constancy PASS (corner max |Δ|=2.0 ≤ 30).

Legacy flat path — verified by behavior, not comments: my own tsx compile of the real in-repo `episodes/showcase-props/episode.yml` (legacy `school_canteen`): registry attaches **no** `world`; raw supports passthrough `[{"name":"counter","x":[230,1690],"y":450}]` (committed legacy y450, correctly out of M3 scope); compiled scene carries **none** of the four M3 world fields; compile succeeds — `on(counter)` still resolves through the legacy branch. Preloader legacy branch (whole-document blob) confirmed in code; smoke green on a second legacy set; no committed `library/set/*/scene.svg` contains any `<g id=` group.

Non-goals held — no slipped capability: grep over the changed engine files finds no parallax/DOF/per-element-filter/3D/z-axis usage (no filter/blur/perspective/translate3d/rotate3d/matrix3d); the only camera-transform lines in `PerformanceEpisode.tsx` are pre-existing context, not `+` lines. `library/camera/punch_in` is tracked and unmodified; the move episode's `camera.punch_in`/`camera.wide` are existing DSL actions. The set SVG contains no `<filter>`/`<feGaussian*>`/gradient elements (only comments saying so). `evaluate.ts` has no layer/foreground logic — depth is a static declared paint order; the evaluator never recomputes it per frame.

Comparison fairness (structural, not perceptual): `receipt/sheets.py` builds the sheets from M0/M2/M3 bundle stills at labeled matched beats (M2 transfer honestly at f100, documented); all three legs are native 1280×720 (PIL-verified) and resized uniformly per cell — no leg upscaled, stacked or substituted; the M3-only framings sheet honestly states M0/M2 have no such beats. ffprobe by me: M3 wide and M0 props both 1280×720, 24/1 CFR, 161 frames — like-for-like.

## Findings

**Blockers: none.**

Nonblocking (recorded for the gate):

1. **Render wall time, direction consistent**: M3 wide 24.91 s (WP4) / 21.19 s (WP3) vs M0's recorded 16.87 s — same 161 frames, 4 threads; +25.6% to +47.7% wall, maxRSS flat (1,149,572 vs 1,146,304 KiB, +0.3%). The tickets claim "no material regression" citing RSS; the wall direction is consistent across two independent M3 runs. Whether that is "material" is a user judgment at the gate; I did not re-render (would mutate the frozen bundle). Location: WP4 ticket "Commands and results"; criterion: Production "no material regression".
2. **`receipt-analysis.json` display truncation**: `putdown_rest.rest_frames` lists only the close-variant frames; `frame-proof.json` (and the ticket) cover wide f160 and move f140/150 too. Data complete (all 14 frames verified); presentation only.
3. **Foreground occlusion not exercised in-media**: occlusion-above-actors is structurally true (zIndex 70 vs 40/20, unit-tested DOM order, corner pixel constancy), but no sampled frame has an actor actually overlapped by the foreground layer (actors render at x≈448–831 px; corner region starts at x≥1180). Perceptual occlusion legibility stays on human checklist B7.
4. **Activation-trigger decision**: "world-declaring = SVG paints `<g id>` groups" is a WP2 worker decision (documented in ticket + SCHEMAS.md), not in WP1's contract text. Backward-compatible, mirrors the `figureArtwork` precedent, preserves the mandated legacy flat path — reasonable; noted, not a defect.

## Art dimension — honestly not judged here

This session has no image modality. I did **not** watch the clips or look at the stills; I make **no** claim on coherence, depth-without-blur, palette/value compatibility with the accepted character, focal hierarchy at transfer/putdown, or perceptual comparison fairness. The machine-verifiable art-adjacent facts above (native-resolution legs, matched-beat sourcing, honest labeling, determinism, no filter/gradient paint) are all I can contribute. The roadmap's rule — "actual-media experience QA… tests or media metadata alone cannot satisfy the milestone" — is respected by leaving those items open, exactly as `CHECKLIST.md` A1–A4/B5–B8/C9–C10 frames them.

## Verdict

**PASS for the exact inspectable scope, revision-bound** to HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3` + the uncommitted WP2/WP3/WP4 worktree and the two hashed bundles above. Function acceptance verified decidable-green by my own runs (compile path, flat-path behavior proof, red cases both directions, frame-proof reproduced identically, typecheck/test:all/smoke/diff-check). Production acceptance: additive schema (no existing manifest or episode changed — legacy compile verified), editable SVG with provenance/license in the manifest (read), no new dependencies or services; wall-time caveat as finding 1. Art acceptance and the milestone's actual-media experience QA: **not exercised by this review** — open at the human gate, not blocking the machine-verifiable scope. This PASS does not close the M3 milestone; per the roadmap, M3 still requires human milestone judgment on actual media.

## Remaining human AV checklist (exact items, from the bundle's CHECKLIST.md)

Against `index.html` / `stills/comparison-matched-beats.jpg` and the three clips; any single ✗ is a blocking defect:

1. A1 coherence: M3 counter/props/dressing read as one canteen space, not stacked rectangles (vs M0 f0/f16).
2. A2 depth readable without blur/parallax (overlap, value, size gradients; far wall lighter than near floor).
3. A3 belonging: accepted B-direction lin's line/value/luminance compatible with the new set in wide and close (vs M0's flat-background break).
4. A4 focal hierarchy at transfer (f104/f112) and putdown (f160) points at the interaction.
5. B5 putdown visibly rests (no float/clip feel) at wide f160 and close f128–160 — machine proof covers the base line Δ4 px, eyes confirm.
6. B6 painted actor extents inside the red safe-area boxes on the six overlay stills (machine proved anchors only).
7. B7 foreground counter return occludes actors/props where it should, covers no resting band, steam/tray not dominant.
8. B8 move clip t≈3.5–4.1 s push-in, t≈5.3–6.1 s pull-back: no illegal crop, black bars, or containment loss.
9. C9 real-time playback of all three clips: narration identical to M0, subtitle timing correct, no clipping.
10. C10 lip-sync/listen unchanged from the accepted M2 (M3 touches neither; any anomaly is a defect).

**Milestone-judgment question for the user**: judging A1–A4, B5–B8, C9–C10 on the presented M0 → accepted M2 → M3 comparison at matched beats, plus the recorded production numbers (incl. the wall-time caveat) — accept the M3 candidate, send back with itemized fixes, or reject? Separately (default not authorized): authorize replacing the production asset path (`library/set/school_canteen` → the draft set) or not.

## Current vs reused

- Current (this iteration, WP4 bundle): three rendered M3 clips + dist, 15 sampled stills, 6 overlays, 2 comparison sheets, receipt proofs, logs, CHECKLIST, index entry, copied episodes/performance manifests.
- Reused by design (labeled 复用/baseline-immutable): frozen M0 narration takes (byte-verified), M0 and accepted-M2 media linked into their own bundles (never copied or modified), WP3 draft library as the single set home (symlinked), WP3 determinism cross-check.
- Not re-proven by me: render wall times and RSS (worker-recorded; logs verified to quote them), and any perceptual claim (see above).
