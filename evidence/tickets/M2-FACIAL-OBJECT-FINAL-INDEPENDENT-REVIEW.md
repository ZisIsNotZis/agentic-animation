# M2 facial-object final independent integrated review

2026-10-14T00:46:31+08:00 — Fresh independent reviewer, not author/Main.
Read-only product/archive review; no recursion or repairs. Only this ticket is
written. Budget25min/native35min; all commands foreground, bounded30–180sec.
Baseline HEAD4213bc40b64241b500b0d6097cccc585a0dc3eb3 plus preserved dirty source.

## Verdict and coverage

**PASS for exact-source facial-object repair, integrated technical checks,
current supplemental provenance and inspected static art modalities.** The four
independent mouth/chin/eyebrow/lips blockers and later-facial arm-erasure case
are closed. No material new in-scope defect reproduced. **Full M2 remains
UNVERIFIED / NOT PASS:** real-time visual perception, actual listening,
lip/subtitle/balance judgment and human milestone judgment were not available.
Earlier user visual feedback does not accept this revision. Production-path
replacement requires a separate later approval.

Reviewed full [M2 AC](../art/ART_CHARACTER_M2.md), roadmap gates, owning
[continuity ticket](./M2-EXPRESSION-CONTINUITY.md), actual shared actorPose,
source-named expression tests, motor facial-predicate contract, supplemental
source/delta/proofs, current inventories and immutable H3 combined page.
Prior independent integrated support/static and blink/calm reports were read
for explicit coverage, not adopted as blanket PASS. H3 independent blocker
report was read and its four exact reproductions challenged on final source.
No repo-wide audit, speculative polishing, new animation contract or repair.

A = `/home/z/.local/share/agentic-animation/art-baselines/`.
S = `m2-facial-object-20261014T0010`; E = `m2-expression-continuity-20261013T2254`;
H = `m2-final-packaging-20261013T2348`; P = `m2-support-media-20261013T1802+0800`;
B = `m2-blink-calm-repair-20261013T1915+0800`;
F = `m2-final-media-20261013T163603+0800`;
C = `m2-coverage-readiness-20261010T073047Z`.

## Exact current bindings and independent file checks

| File | SHA256 |
| --- | --- |
| core/src/motor/actorPose.ts (under packages/) | `f3e535b52687a38af810e1f037a41505aa55c7725faea7fcc31b111f1001f88d` |
| packages/studio/test/expressionContinuity.test.ts | `4dde7abc506cf2727094976374849449c1f99efafaad9ceee2b9e9bb1dc89149` |
| evidence/art/ART_CHARACTER_M2.md | `f270a9c0f7f7269315822f8b8da2ceca1ea5934734ef68f2fb6844567a2c5bff` |
| S/index.html | `4573b6cba39b13a42f7f66f57914509f2d6725183f92d24a34786ee44a8586e5` |
| S/source-hashes.json | `a148e368b9e88a74046072efb3f9724c8526c16000c78cbae014566c26a55f23` |
| S/artifact-hashes.json | `bf401231df18638c74937eb011ed4100b2ecd4204eb68cb6f3f858a11f53a215` |
| S/actual-media-proof.json | `c4fea497ad5cf2b7629a9c25c591aaa937c67479ce0d497af5c525b1b69f4d65` |
| S/media-equivalence.json | `a34f7cd04a234872bfd8cb0b9bd6b8e4cd55b1fdd3ba00011479a936448bac3e` |
| S/overlap-proof.json | `f82f4c1df767f2b21aa4271fd87e5926afe2512fba876051961ac310d669b544` |
| S/physical-proof.json | `ae6d10ebf7829f109dd28329813924004813dfff0197bf7a75867802857744fa` |

Independent Python SHA256 checks:928/928 current source entries match; S42/H81
artifact entries match; external S sibling binding all3 hashes match. Inventory
excludes itself. S15/H88 actual local href/src targets exist. Prior P13692,
B1250, F13838, E3566 and C2066 inventoried artifacts match unchanged bytes.
S's five copied source/doc/test files are inventoried and match current source.
This report-only addition is outside the frozen inventory, not a source mismatch.

H is accurately retained as **historical blocked H3**, not the current source
inventory. Its old blocker text/actorPose hash and E's historical sourceMatches
must not be read as final source facts. S explicitly supersedes those receipts
and links H only for unchanged media. Current 928-entry verification, not stale
sourceMatches:true, supports final-source identity. No immutable page was edited.

## Independent executable falsification

- `node --import tsx --test packages/studio/test/expressionContinuity.test.ts`:
  7/7 pass; original337-frame acting checked in eight orientations; actual library
  write/shiver/sip/present onset/peak/recovery, namespaces/synonyms/mixed predicates,
  expression isolation, later facial overlap and genuine successor covered.
- Additional read-only Node stdin probes independently construct native actors:
  11 facial predicates ×4 progress values assert zero right-arm motion and exact
  preservation of overlapping earlier writing arm. Five mixed body/hand-to-face/
  ingestion positives remain nonzero. Four genuine successors ×4 progress values
  compare final right arm against dynamically loaded baseline actorPose: identical
  including takeover interval. Total60 comparisons plus5 bodily positives pass.
  Includes all four original blocker predicates, subject forms, jaw/eyelid/teeth
  synonyms and legitimate button/hand/arm/cup objects; no new contract invented.
- Source inspection: clause-local facial filtering is shared by semantic action,
  side ownership and later-event ownership deletion. It does not infer permission
  from declared arm parts. Token/qualified-name exclusion remains separate from
  exact operational-phase fallback. Expression tracks are excluded. Loaded
  contact and accepted baked SkeletonPose retain authority. Patch is narrow;
  no thresholds, recipes, assets, default production paths or choreography change.
- Read-only in-memory rerun of inspected S actual-media/overlap/physical/equivalence
  helpers: transpile TypeScript, replace absolute imports with file URLs, substitute
  helper root for import.meta URL and remove writeFileSync before execution.
  All337 acting +53 overlap pose/FK/expression frames match renewed manifests;
  zero indexed warnings. Max hand step **23.12622630916074px <= unchanged24px**.
  All47 archived manifests /7349 frames have zero solved or authored pose changes
  against S baseline. This plus verified renderer/evaluator/assets binds media
  reuse, rather than supposing equal clip hashes prove source equivalence.
- Physical rerun four whole scenarios: transfer84, zero diagnostics/warnings;
  stance1.477929e-12px, foot1.368971e-12px, sole2.273737e-13px,
  palm0.000880591px, socket1.461928px<=1.6, rotation3.75deg<=3.76.
- Independently reran `npm run typecheck && npm run test:all && npm run smoke`:
  green;253 tests246pass/7 optional corpus skips/0fail; canonical check/make green.
  `python3 -m unittest discover -s tools/art-direction-study -p 'test_*.py'`:
  22pass. Full tests exercise all16 view/travel contact/support/cue/default/holding/
  one-call release/putdown, old assets, blink and native/legacy renderer regressions.

Initial proof harness failed data-URL absolute-import resolution; corrected with
file URLs, then all reruns passed. Initial old inventory checks used wrong base
(root-relative versus bundle-relative); corrected checks above all match. C uses
SHA256SUMS.json, not artifact-hashes.json. These are reviewer harness errors, not
product defects. No failed product assertion or evidence file rewrite occurred.

## Actual media/audio and art coverage

Independently verified292 reused audio hashes and23 copied workspace audio hashes.
All18 combined MP4 byte hashes and actual ffprobe stream classifications match:
13 have audio;5 acting/overlap/blink/arms/orientations are video-only. Independently
full ffmpeg null-decoded P contact-left and support-putdown with volumedetect:
both mean-19.7dB/max-2.0dB, genuinely non-silent. Decode/levels are **not listening**;
no speech synthesis or audio replacement occurred.

Actually read images with image tools: E acting detail12–24,223–236,285–306,
315–336; overlap48–52; P support-putdown109–121 and158–160; B blink12–27;
F full720p profile contact83/84/85, orientation sheet and matched M0/current84;
C nine-mouth diagnostic. Sampled B identity, narrow face/bun/palette/collar/sash,
readable distinct eyes/mouths, connected shoulders/elbows and arm recovery remain.
Blink visibly closes/reopens; one/two arms are distinct; transfer has handle grip,
continuous sampled wrists/prop and retained depth. No new sampled gross jump,
penetration, silhouette disconnection or subtitle/camera overflow reproduced.

| Full M2 area | Final-revision coverage and remaining limits |
| --- | --- |
| Native editable rig/views/provenance | Prior integrated review of generator, five view tables, layers/pivots/sockets/license/reconstruction reused: those sources/assets match; current22Python and schema/security tests pass. Eight-view sheet/profile frames inspected. No fresh clean-room reconstruction or commercial licensing approval claimed. |
| Expressions/reset/nine mouths/blink | Current337-frame warning/equality proof, actual face/recovery samples, unchanged nine-mouth diagnostic, actual blink close/reopen and tests. Eleven families remain authored; full-speed expression readability and audible lip sync UNVERIFIED. |
| Arms/contact/support/default semantics | Current all-frame physics, all16 gates and two-call/cue84/persistent hold/default/release tests; unchanged media and prior support/arms static review reused. Consecutive arm/contact/support samples inspected. Real-time gait, grip and withdrawal naturalness UNVERIFIED. |
| Art/comparison/occlusion | Sampled identity/detail stronger than M0, true profile/back selections retained, mouth/arm contours readable. Same-time M0 is not matched physical choreography; B is static only. Prior whole static coverage is reused with verified assets/output; complete moving-art judgment UNVERIFIED. |
| Production/usability/effort | Additive portable generator/native data, canonical YAML/registry/compiler/evaluator/ArtFigure path and smoke/tests retain old assets. Prior render effort/reconstruction receipts remain historical measurements, not new performance/beauty ratings. Production default remains unapproved. |
| AV/human gate | Non-silent speech provenance established; actual hearing,24fps motion perception, lip/subtitle/balance, user M2 judgment NOT performed. No fullM2PASS. |

## Current trusted entry and remaining user gate checklist

**Open current trusted supplement:**
`/home/z/.local/share/agentic-animation/art-baselines/m2-facial-object-20261014T0010/index.html`
`xdg-open` returned0, “Opening in existing browser session.” No pointer/keyboard
interaction; opening is not playback/hearing. Use its historical combined link
for verified unchanged players, not H's old source/blocker verdict.

- [x] Exact facial/overlap/source/media/inventory technical blockers closed.
- [x] Available static/numerical/file-integrity modalities inspected independently.
- [ ] Capable reviewer/user actually watches full24fps and listens to speech.
- [ ] Record clarity/balance and lip/subtitle synchrony, full moving-art judgment.
- [ ] Obtain explicit judgment on **this** M2 candidate, not prior visual feedback.
- [ ] Later separate production asset/default-path approval; no publication grant.

Small real AV clips at A/P/workspace/episodes: `contact-left/dist/contact-left.mp4`
(6.727s: transfer82–85 =3.417–3.542s; play complete pickup/carry/withdrawal),
`support-putdown/dist/support-putdown.mp4` (6.727s: lift/detach109–121
=4.542–5.042s), `free-release/dist/free-release.mp4` (6.727s: watch complete fall).
Authored putdown126–145 =5.250–6.042s and terminal192–194 =8.000–8.083s.
E acting14.042s and overlap2.208s are intentionally silent; use them for gesture/
face quality only, not speech acceptance. Watch blink0.5–1.125s separately.

Suggested user M2 prompt: “请逐段全速播放并听完当前拿杯、递杯、放下和自由
落地短片，重点看杯柄、朝向、遮挡、收手是否自然，对白是否清楚、响度平衡、
嘴型和字幕是否同步；再看八方向、表情、眨眼、单/双手和 M0/B 对比。是否
接受这版 M2？如有问题请给片名和时间。这不授权替换生产资产。”

`git diff --check` passed. No product/media/audio/history/staging changes by
reviewer. Cached diff remains b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e.
Pre-existing .gitmodules/vendor staging preserved: literal no-staged-files=false;
no NEW staged files. Only this review report added; no remaining background job.
