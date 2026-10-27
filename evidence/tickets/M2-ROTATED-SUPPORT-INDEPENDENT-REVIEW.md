# M2 rotated-solid support — independent delta review

2026-10-13T17:54:48+08:00 — Fresh independent reviewer, not Main/author;
started17:43:36+08:00, deadline18:03:36+08:00. Source frozen; no repairs,
recursion, staging, publication or asset/audio changes. Only this report writable.

## Verdict and contract

**Scoped technical PASS: renderer-shared rotated-solid landing and free-release
B1 repair. No reproduced material source regression in the reviewed delta.**
**Rendered putdown acceptance remains BLOCKED by missing proof**, not a reproduced
putdown code failure. Full M2, complete rendered-experience acceptance, real-time
AV/listening and user/production-path approval remain UNVERIFIED. Do not label
this report M2PASS or AVPASS.

Reviewed against [repair contract](./M2-ROTATED-PROP-SUPPORT.md),
[previous independent review](./M2-FINAL-MEDIA-INDEPENDENT-REVIEW.md),
[owning M2 acceptance](../art/ART_CHARACTER_M2.md) and motor support contract.
Scope: actual thermos body/handle/ink, rendered size/base/scale and rotation;
continuous free detach/gravity, eligible counter versus floor, generic putdown
clearance, receiver-state delta, canonical11/all16 regressions and affected media.
No broad audit or new requirements. Bounce/angular rigidbody response are excluded.

Bundle root (relative proof/media paths below):
`/home/z/.local/share/agentic-animation/art-baselines/m2-rotated-support-20261013T1711+0800/`.
Comparison: sibling `m2-final-media-20261013T163603+0800/`; prior source snapshot:
`m2-terminal-recovery-20261013T163157+0800/source/`.

## Revision and independent provenance

HEAD remains4213bc40b64241b500b0d6097cccc585a0dc3eb3; dirty source is the candidate.
Python independently compared all187 prior source hashes with current files:
only compiler, motor index, Prop renderer, core package exports and two owning
docs changed. Added geometry module/test are bound by the new inventory.
All9 entries of new `source-hashes.json` match current files; all1167 entries of
`artifact-hashes.json` match actual bundle files (zero missing/mismatches).
Prior source snapshot files were diffed against current compiler/motor/renderer;
that snapshot is bound by the prior187 inventory, not assumed from HEAD.
This delta review plus rerun gates supplements, not replaces or invents, the
previous independent whole-source technical proof described in the prior report.

| Binding | SHA-256 |
| --- | --- |
| source-hashes.json | `837fdc82fa502ff61e936298e083cea2d9cbf7153f19780f0b09ed6355f72e77` |
| artifact-hashes.json | `30a611c114b066963817c6ff4a3c815f350fbdee1e2a324a40d5a0a94d18b9fc` |
| propGeometry.ts | `1262e4d8327dc90ae9efd37c2d39558d1c2fc650e0cb75d4c71892eb105c3b39` |
| motor/index.ts | `cd8d9be488e4dd839f98d5cb816ddea8943156bc5344d814d9f1c485d522e9c3` |
| authored-overlap-sheet.jpg | `178332e127cd95c747983f5501feb1d0131488a424292a9d5eba1934f0a30819` |
| free-release-sheet.jpg | `18efc28e92541e49f254cec527fddb6abda9937156972a9f11d931c01b0b4fd2` |

## Source findings and actual numerical reproduction

`propGeometry.ts` owns renderer paths and analytic directional support for body,
quadratic handle, cap/top and outer ink, including sharp upper miters. Body/cap/
handle paths in `Prop.tsx` consume that authority; interior decorations are within
the solid, shadow and transient binding cue intentionally excluded. Transform
models SVG xMidYMid meet and CSS full-element base pivot, not rotated AABB.
Compiler threads rendered size/base and scale1, matching evaluator's motor-driven
scale1, independently of staging/grip scale. Legacy art retains declared-base
behavior. Angle is not forced upright. The motor uses the rotated lowest-point
horizontal witness for finite surface eligibility, and lands its lowest y, not
its anchor; upward travel does not falsely land.

Independently ran the actual new geometry tests (within test:all): handle/ink
sampling at nine angles, letterboxing and half-scale support, plus real native
pickup/hold/free/place/rest at six angles. Inspected changed placement and gravity
branches at motor568–575,725–734,1114–1130,1194–1203 and full-precision output1280.
Generic putdown lifts the held solid before opening; free release never does.

Current-source **in-memory compileEpisode** was independently rerun for all11
bundle YAMLs using bundle registry/plugins and exact frozen take durations/inline
markers (`speechTimingFromPreparation` algorithm, no synthesis/write). Each newly
compiled motor is deep-equal to its archived manifest motor, transfer84 in all11.
Independent FK run used inspected `physical-proof.mts` via stdin, with root changed
to durable bundle and its write removed: all11 have no motor diagnostics or
indexed discontinuity warnings; max foot/support error<0.000001px, sole error
<0.000001px, palm0.000881px, socket1.476616px<=1.6, socket rotation3.75°.
The full rerun also executes all16 actual-native pickup/handover/free-release and
world-support cases; these are reviewer executions, not inherited worker claims.

Independent extraction of bakeSceneMotor inputs from actual manifest assets,
staging and performanceTracks reproduced each free/authored motor exactly before
changing releaseMode **in memory only** to place. Thus numerical putdown challenge
uses actual native rig, full-size thermos and counter390, not a toy box:

| Scenario | Detach | Adjacent detach position delta | Lowest solid at detach / final |
| --- | --- | --- | --- |
| plain free |113|1.805556px|408.897064 /691.2|
| authored free |130|2.708333px|409.799842 /691.2|
| plain place challenge |114|6.378985px|390 /390|
| authored place challenge |131|4.765031px|390 /390|

Place challenge prior owned anchors: plain(856.545739,322.757414),rotation103.494227°;
authored(855.962016,321.019213),rotation102.744227°. First unowned/rest anchor
(857.165143,316.408572),rotation101.994227°; no diagnostics. Rotation changes during
held lift with wrist contact, not an upright detach snap. These challenges prove
numerical lift/detach/rest only; no corresponding rendered artifact was created.
Actual free terminal anchor(858.935202,613.896198),rotation106.494227° has solid
extent77.303802, giving **real floor691.2**, not counter390. It is already below
counter at detach, so forcing counter landing would violate continuous free release.
Eligible lower surface selection is correct; a receipt named `penetration` relative
to390 is NOT floor penetration when the object is falling in front of the counter.
Both actual YAMLs call prop.release; neither calls prop.putdown. Their compiled
release receipts have releaseMode free at4.679977s and5.379977s respectively.
Contact/staged-props episodes have no release, so cannot fill the putdown media gap.

## Receiver-state delta: justified, not byte-identical

Independently compared all actor frames: lin unchanged; awei differs only in reach,
reachInfluence and skeletonPose at119–130/plain and136–147/authored. Roots, feet,
ownership and pre-detach/contact are unchanged. Reach-target maxima are0.253961px
and0.252371px; influence maxima0.134562 and0.137499, not negligible by that metric.
Actual renderer FK before/after maximum hand/elbow differences: plain0.139532/
0.982743px; authored8.566353/6.404176px (authored-arm blending amplifies influence).
Do not summarize the latter as a quarter-pixel rendered change.

Source explains it: whole-body validation includes free prop-rate720px/s;
continued fall changes accepted whole-progress substeps, advancing withdrawal and
authored blend together. No actor/pose/cue policy delta was added. Independent
frame113–160 renderer FK sweep: plain peak adjacent hand/elbow11.411145/11.065049px
unchanged; authored peak hand improves16.158129→13.301470px, elbow11.505587 unchanged.
No indexed warning or sampled new arm jump reproduced. This shared-state timing
change is physically/architecturally justified within the existing limiter, not
proof of unconstrained rigidbody dynamics or perceptually perfect real-time motion.

## Actual media inspected and precise remaining acceptance

Image tool actually returned both consecutive sheets, manually inspected:
plain111–121,143–145,158–160; authored128–145,158–160. Separately read authored
full-size130,143,145,160. Solid falls continuously in front of fascia, rests with
downward handle at floor near feet, and sampled withdrawing/authored limbs remain
connected. No counter-hover/rest penetration B1 remains in these samples.
The subtitle “放柜台上” still accompanies a floor drop; that free-release clip is
physics proof, **not** a demonstration of successful counter putdown.

Independent ffprobe/full ffmpeg null decode passed for both clips:852×480/24fps,
plain161frames6.708333s,authored195frames8.125s. Full-resolution stills are1280×720.
Renewed videos therefore do NOT meet delivery-resolution1280×720 video proof.
Authored sheet ends160 although its video ends194;158–160 is settled support,
not the actual episode terminal window. No192–194 stills supplied/inspected.
All193 copied WAV/MP3 hashes equal the prior bundle; this proves preservation,
NOT listening, balance or lip/subtitle synchrony. No actual temporal video or audio
perception was available; decode/metadata/stills are not AV acceptance.

**Missing rendered AC (blocking promotion of putdown/media acceptance):**
1. Real canonical one-call prop.putdown with actual native rig/full-size shared
   thermos geometry and counter390; no positioning/raise/synchronization calls.
   Show consecutive held lift from below top, last-owned/first-unowned frames,
   continuous socket/position/ownership and withdrawal, unchanged natural rotated
   orientation, then solid/handle/ink resting on eligible counter (not anchor only).
   Bind source, YAML/call receipts, actual support/floor and media hashes. Include
   authored-overlap putdown coverage if claiming its inherited authored-arm AC.
2. Renew affected delivery-resolution720p motion proof; inspect full authored
   recovery and actual terminal192–194 or newly compiled equivalent consecutive
   terminal window. Existing158–160 samples cannot certify the whole195-frame clip.
3. Capable independent real-time motion/viewing and audio listening, speech/lip/
   subtitle balance/synchrony checks, remaining whole-M2 art/face coverage and user
   judgment/production-path gate remain as required by the owning M2 document.

## Commands, preservation and report validation

Reviewer ran `npm run typecheck && npm run test:all && npm run smoke &&
python3 -m unittest discover -s tools/art-direction-study -p 'test_*.py'`, allPASS:
241tests234pass7skip; canonical smoke check/makePASS;22PythonPASS. `git diff --check`
passed. Bounded180s in-memory canonical11 compilation and90s actual putdown/free
challenge passed;60s read-only FK verification passed. Hash/audio comparisons,
renderer before/after FK sweeps and ffprobe/null decodes executed independently.

Pre-existing staged .gitmodules/two vendor gitlinks preserved byte-for-byte:
`git diff --cached | sha256sum` before/after remains
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`.
No NEW staged files; literal empty-index assertion would be false. All candidate
source hashes rechecked unchanged after checks. Only this review report added;
history, existing dirt, assets, frozen bundles and audio preserved.
