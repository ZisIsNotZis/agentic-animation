# M3-WORLD-INTEGRATION — WP4 integration, bounded evidence and gate prep

## Task contract (dispatch record)

- Goal: integrate the M3 candidate on the draft set `canteen_counter_m3`
  (WP3) through the WP2 engine: a copied props-scene episode bound to the
  draft library, verified on the real canonical path (`anim check` → `make` →
  bounded renders), comparison stills/clips M0 → accepted M2 → M3 at matched
  beats (wide f0/f16, transfer f104/f112, putdown f160) plus one close framing
  and one moving-camera beat on the same set, exact frame/time mappings,
  frozen M0 audio, and one trustworthy review entry (index.html + human
  checklist) under a NEW archive-root directory.
- Scope (sole writer): the new bundle
  `/home/z/.local/share/agentic-animation/art-baselines/m3-world-integration-20261014T2233+0800/`
  and this ticket. Nothing else; zero engine/schema/motor/camera edits.
- Exclusions held: no edits to `packages/`, `docs/7_SCHEMAS.md`, `library/` sets,
  episodes in-repo, other sets, existing bundles (M0/M2 media untouched);
  no publication, production replacement, destruction, new dependencies or
  services; nothing staged, committed or pushed; all pre-existing dirt,
  staging (`.gitmodules` + vendor submodules) and audio preserved.
- Owner: WP4 integration worker; parent owns dispatch, fresh review and the
  user milestone gate.
- Budget: 45 min, command timeouts, durable checkpoint by 25 min (reached:
  all three check+make+render cycles done by 22:37 +0800, ~9 min in).

## Baseline and preservation

- HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3`, dirty M2-candidate tree
  including WP2/WP3 uncommitted work — verified unchanged by WP4 except this
  ticket (`git status` 68 entries before/after; nothing staged by WP4).
- Draft library home stays the WP3 bundle; the WP4 bundle symlinks
  `library → ../m3-set-art-20261014T2217+0800/library` and
  `vendor → repo vendor` (M0-bundle precedent for frozen-library linking).
  Set art re-hashed identical to the WP3 ticket
  (`scene.svg 8994a70f…4fcfad5`, `manifest.json 8e51fc95…16c557`).

## Decisions

- 2026-10-14 22:33 +0800, worker: three durable integrated episodes live in
  the WP4 bundle (`episodes/showcase-props-m3{,-close,-move}/episode.yml`),
  wide/close copied verbatim from the WP3-verified YAMLs, plus a new
  moving-camera variant adding only existing DSL camera calls
  (`camera.punch_in(lin)` at the handover line, `camera.wide()` at the putdown
  line). Rationale: WP3's `/tmp` episode copies were disposable scratch (its
  ticket hands the durable swap to WP4); the moving beat must be on the same
  set, so it is authored inside the copied episode with existing vocabulary —
  no camera behavior change.
- 2026-10-14 22:33 +0800, worker: frozen audio copied from the M0 bundle
  cache (WAVs byte-identical to WP3's scratch cache; only `inputHash`
  metadata differs, as expected for changed episode inputs). Make reused
  3/3 takes, unmatched 0 — no synthesis anywhere.
- 2026-10-14 22:47 +0800, worker: putdown-rest verification moved from pixel
  differencing to the real evaluator. A pixel amber-blob localization of the
  thermos (`#efbd55`) was attempted and dropped: other warm set elements fall
  inside the tolerance in both M3 (wood fills at distance 38–55, antialiasing)
  and especially M0 (cream counter band `#e4b85d` at distance 11), so pixels
  cannot isolate the object. `receipt/frame-proof.mts` instead runs
  `evaluatePerformance` (tsx, repo source) on the exact manifests the renderer
  consumed and checks the prop base against the declared support line —
  at-source, with in-flight frames as the built-in red case.
- 2026-10-14 22:33 +0800, worker: sampled-frame camera projection taken from
  the evaluated camera (DOM transform `scale(z) translate(-x,-y)`), not a
  naive stage→render proportion — overlays and line checks are projected
  per frame (wide is z=0.667 fit; close/move vary).

## Changes

- New bundle only (see structure below) + this ticket. No repository source
  changes. Bundle layout: `index.html` (review entry), `CHECKLIST.md`
  (human AV/judgment checklist), `anim.config.json`, `library`/`vendor`
  symlinks, `episodes/<3 slugs>/{episode.yml,audio/,performance.json,dist/}`,
  `stills/` (15 sampled stills + 6 overlays + 2 comparison sheets),
  `receipt/` (`frame-proof.mts/.json`, `analyze.py`, `receipt-analysis.json`,
  `sheets.py`), `logs/` (check/make/render/time/ffprobe), `SHA256SUMS.txt`
  (98 files).

## Commands and results (real clock 2026-10-14 22:28–22:50 +0800)

- `anim --cwd $B check` × 3 episodes — OK, 1 scene / 3 spoken takes each
  (draft set loads through the world path; declared supports resolve).
- `anim --cwd $B make` × 3 — performance.json written (6.727/7.377/8.177 s);
  audio `reused 3; unmatched 0`; pre-existing M2 contact warnings only
  (same 4 sudden-move warnings as WP3; no new warnings).
- `render-yaml --threads 4 --fps 24 --force` × 3 — 161/177/196 frames,
  1280×720 CFR 24/1, AAC audio; wall 24.91/23.15/24.13 s, maxRSS
  1,149,572/1,164,044/1,171,300 KiB (M0 props: 16.87 s / 1,146,304 KiB —
  no material regression; totals include cached make). Budget: 22.281 s
  total ≤ 30 s, each ≤ 15 s.
- `node→tsx receipt/frame-proof.mts` — evaluator proof (see below).
- `python3 receipt/analyze.py` — putdown_rest PASS, safe_actor_area PASS,
  foreground_constancy PASS (red cases: in-flight frames fail the rest check
  at Δ67–69 px; foreground spread limit 30 with measured 2.0).
- `python3 receipt/sheets.py` — comparison sheets written.
- Link check on `index.html`: 37/37 resolve.
- `npm run typecheck` — pass; `npm run smoke` — pass (0.55 s fixture);
  `git diff --check` — clean.

## Evidence (frame/time mappings, checks, hashes)

- Matched beats (24 fps): wide f0=0.000 s, f16=0.667 s, transfer
  f104=4.333 s / f112=4.667 s, putdown f160=6.667 s; M2 transfer lands at
  f100 (contact-model timing shift), M2/M0 putdown f160.
- Close variant: putdown+punch_in t=4.680 s=f112, push 0.65 s, hold to end;
  sampled f112/128/140/160. Move variant: punch_in(lin) t=3.477–4.127 s
  (f83–f99), wide() t=5.330–6.130 s (f128–f147); sampled f88/99/140/150.
- Function checks (decidable, on the real path):
  - Supports resolve: check green ×3; IR carries `setLayers` (5, 1
    foreground), `safeArea` (0.1146/0.1667/0.7708/0.6667), `supportSurfaces`
    ([0.1422,0.8578], y 0.37037), `setViewBox` [1920,1080].
  - Putdown rests on the painted counter top: evaluated thermos base
    y=396 vs declared/painted 400 (|Δ|=4 ≤ 8), x=938 ∈ [273,1647] stage px
    at wide f160, close f128/140/160, move f140/150; in-flight frames
    (wide f104/f112, move f99/f128) fail at Δ67–69.
  - Actors inside safeActorArea: all sampled frames, both actors, three
    variants (stage rect [220,180]–[1700,900]).
  - Layer order/foreground occlusion: foreground corner region pixel-constant
    across wide f0–f160 (max Δ 2.0 ≤ 30); DOM order unit-tested by WP2
    (`packages/studio/test/setLayers.test.ts`).
- Audio frozen: take WAVs byte-identical to M0
  (`77498589…`/`1066962b…`/`193e27f5…`); wide mix identical to M0
  (`a7071a61…`); close/move mixes differ only by camera-blocking silence.
- Determinism cross-check: WP4 wide stills f0/f16/f104/f112/f160 are
  sha256-identical to WP3's renders (byte-equal); close f132 differs at
  codec-noise level (max channel Δ 25, zero pixels >40) — WP3's numeric art
  analysis transfers; WP4 links no WP3 media as its own evidence.
- Key hashes (full inventory: bundle `SHA256SUMS.txt`, 98 files):
  - M3 clips: wide mp4
    `81135978fe47aa533b72c539f87fed9c46fb7ff04c489d362f141b3d56ff1c20`,
    close mp4
    `84806840035266f8ee4f2eb14b5ec390885dcd04084a6a6ba30d37ef3456a1b9`,
    move mp4
    `e69a4ef185be09cd18fb506e613cbb8712ab5202fc57f130279279a18841c1d7`;
    episode YAMLs wide
    `3b064764cea2ae0b24f3b3ef2275c445f5c8e127c98c9698a1fed26ffe69d8af`,
    move
    `05cc1e53c22d8733570365cd0de59ca770a0e4904e8acc264514c799442312ce`;
  - M0 props mp4 `4c9606e083b15920a93d24e7cde696ebfcae71aa2933cf2d8a6417f0f2da2bac`;
    accepted-M2 staged-props mp4
    `ddf9550ae72bdaead82549c2ac73908675ee9bbc9e9a60290c11d4205b9fd6b9`.
- Review entry: `…/m3-world-integration-20261014T2233+0800/index.html`
  (labels: current = this iteration's renders/checks; baseline-immutable =
  M0 and accepted-M2 links into their own bundles; reused-output-equivalent =
  frozen M0 takes, WP3-determinism cross-check, WP3 library as single home).

## Honest limits / not claimed

- No image or audio modality in this session (same as WP3): no visual or
  listening verdict is claimed; "visibly rests", painted-extent containment,
  foreground legibility, transfer occlusion readability, close/moving
  readability are the human checklist items in `CHECKLIST.md`.
- Engine gates (typecheck/smoke) rerun green by WP4; `test:all` not rerun
  (no engine change since WP2's 257-pass run; recorded, not re-proven).
- M2 leg uses the M2-final-media bundle stills/clip bound into the accepted
  presentation chain; no M2 media was re-rendered or modified.

## Residual risks / next actions

- Parent-dispatched fresh independent artifact/media review over the entry
  (reviewer contract: this ticket + the entry's own labels/checks).
- User milestone judgment via `CHECKLIST.md`; production asset-path approval
  remains a separate open user gate — no replacement before it.
- Draft-library shims (`library/package.json`, `node_modules` symlink) stay
  machine-local in the WP3 bundle (documented there); bundle portability
  follows M0/M2 precedent.
