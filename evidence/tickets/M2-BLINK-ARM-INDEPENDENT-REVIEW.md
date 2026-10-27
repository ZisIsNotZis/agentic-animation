# M2 blink/authored-arm independent coverage review

## Frozen review contract and verdict

2026-10-13T18:58:48+08:00 — Fresh independent reviewer; 12-minute budget
(deadline19:10:48+08:00), no recursion, source/media frozen, no repairs.
Only this ticket is writable. Reviewed the coverage ticket, owning
[ART_CHARACTER_M2](../art/ART_CHARACTER_M2.md), actual source and bundle, not author
conversation. Objective: certify narrow canonical arm coverage and independently
reproduce missing blink and optional calm discontinuity; specify bounded repair.

Bundle B: `/home/z/.local/share/agentic-animation/art-baselines/m2-blink-arm-coverage-20261013T1842+0800/`.
Baseline HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3` plus existing dirty tree.
Scope excludes full milestone, production replacement, real-time AV and broad polish.

**Scoped coverage PASS:** default-rest canonical one-/two-hand source, calls,
compiled tracks, all-frame FK and decoded start/peak/recovery evidence are bound.
**BLOCKED:** actual runtime blink sequence absent; supported optional calm visibly
snaps. Default-rest PASS does not waive calm or certify full acting continuity.
**No M2PASS/AVPASS**, human judgment or production authorization.

## Independent checks and bindings

2026-10-13T19:04:53+08:00 — Targeted executable review completed:

- Inline Node SHA256 checks against B `final-source-hashes.json`: **192/192**
  current repository files match; `artifact-hashes.json`: **1236/1236** match;
  `library-hashes.json`: **780/780** workspace resources match. No discrepancies.
  Inventories include YAML/manifests/video/decoded sheets/source snapshots.
- Independent `node --import tsx --input-type=module` evaluation imported actual
  studio `normalizePerformanceManifest/evaluatePerformance`, core
  `solveActorFigure/designHandToWorld`, and `detectPropDiscontinuities`.
  Evaluated every frame of all three manifests, not copied proof JSON results.
  Assertions enforce unclaimed left rest13–29, both terminal rest and zero
  default-rest warnings. 86/86/337 frames; warning counts **0/2/208**.
- `npm run anim -- --cwd "$B/workspace" check episodes/blink-capability-probe/episode.yml`
  independently exits1: **`action.blink is not a function`** (expected blocker).
  Read canonical YAML and actual library factories; no fake manifest or patch.
- Each actual MP4 independently passed `ffprobe` and bounded
  `timeout 30 ffmpeg -v error -i <clip> -f null -`: **1280×720,24fps**,
  86/86/337 frames, no decoder error. No rerender needed for frozen-source review.
- Visually inspected actual decoded `peaks-rest.jpg`, `one-recovery.jpg`,
  `calm-glitch.jpg`, `overlap-contact.jpg`, `overlap-recovery.jpg`.
  Connected arm contours and distinguishable one-/two-hand silhouettes survive;
  one-hand recovery25–32 is gradual. Calm7→8 is visibly abrupt.
- Existing full gates are prior-review evidence only; not independently rerun here.
  No real-time playback, listening, browser inspection or new audiovisual verdict.

Exact SHA256 (paths relative to B unless noted):

| Artifact | SHA256 |
| --- | --- |
| arm-default-rest YAML | `c8aeea37a271cd8aebc7104434eab630fc4f6c5a54510595f77d2acf48ef24dc` |
| arm-default-rest manifest | `2374eb562ef078f47a62b3bb78d60379bdd00e66a3addca0ad0812077a30adf7` |
| arm-default-rest MP4 | `0b86a2238282682b8f91915481a4c650486eee473ae3510bdfc5103f53899b78` |
| arm-coverage YAML | `6fbab3de4932019e9b6c76c53813a3425f4115306d417eaa4fda036c074026fe` |
| arm-coverage manifest | `d9a28bc166b7d8c0934e00ad9a873cde77c6d1669e9c7c6c9e7c91ca3607aec4` |
| arm-coverage MP4 | `9b3f76e905962a2d336a797488a8e9e939094d3acce51e93fe104b8481b9b913` |
| repository core actorPose.ts | `561303c405ee564067d0c58300e8b936023d65efff6297a725d289e9f6099bd5` |

YAML/manifest/MP4 paths: `workspace/episodes/<name>/episode.yml`,
`performance.json`, `dist/<name>.mp4`. Actor.tsx47–48 calls solveActorFigure then
passes its pose to ArtFigure; ArtFigure arm groups rotate around declared
shoulder/elbow pivots. The same solved FK measures drawn joints (not motor-only
proxy). World hands below include figure flip/scale and actor rotation, following
teleports.ts168–178.

## Exact canonical arms and reused contact scope

Factories are **draft workspace library**, not a claim that root production
library exposes point_one/point_two. Existing default factories emit .7s blocking
bone tracks targeted to subject.id: point_one right arm/hand only; point_two both
arm chains. Library hashes certify existing resources, not invented new capability.

| Call interval seconds | Actual frames | FK/pose result |
| --- | --- | --- |
| point_one .55–1.25 | start13,peak21,last active29,end30 | left rest; right peak upper−28.955°,lower−15.329°,point |
| point_two1.8–2.5 | start43,peak51,last active59,end60 | both point; left +28.955°/+15.329°,right negative |

Frame rounding gives starts13/43 slightly before fractional-second cues; no
claim of exact subframe playback. Angles return to ±1.301°/±.689° at29/59,
then zero/rest30/60 and31/61; rest0/12/42/85 independently asserted.
RendererFK right hand21=(1126.264,398.436); frame51 left=(787.180,402.583),
right=(1117.230,349.996). Baseline hands left=(880.512,428.669),
right=(1035.072,429.773). One-hand unclaimed arm has zero local rotation; its
world hand moves slightly with authored torso tilt, not an independent arm claim.

Reused S=`m2-support-media-20261013T1802+0800/` authored-putdown manifest SHA
`c77ed43b08d1260672ab52dbdcbd6fffa0b99e678fc95d66341df878568c0fb0`.
Independently read/evaluated exact calls: pickup0; handover3.476644 and simultaneous
point_one(lin)3.476644–4.176644; putdown5.379977 and simultaneous
point_one(awei)5.379977–6.079977. Inspected contact78–94 and recovery94–110:
recipient keeps handle grip while giver's authored pointing hand withdraws/rests.
Prop world positions83=(894.250,344.742),84=(893.882,344.646),
94=(858.965,329.807),110=(858.935,329.788). This supports reused scoped
arbitration coverage, not a new whole-body/contact audit or renewed AV acceptance.
Prior complete S/F/C inventories were not all independently rehashed here;
B's bound reused sheets and prior validation receipt were verified.

## Blocker B1: missing blink capability, implemented consumer

Owning M2 next-session coverage explicitly requires blink. It is not inferred
from a diagnostic eye board. Canonical draft library has no blink factory or
numeric eyeOpen-emitting action/emotion. `confused` mentions “pause the blink”
in prose only; actual full337-frame solver eyes range **.72–1.3**, default arms
all1. All remain renderer-open. No spontaneous blink scheduler was found in the
actual pose/renderer path reviewed.

Implemented seams are real: evaluator cloneExpression preserves numeric eyeOpen
(457), core actorPose519–528 multiplies/clamps it (.15 minimum), ArtFigure80
selects half below.6 and closed below.2 and renders the native eye layers.
Thus **not a missing eye renderer**; missing canonical authored temporal input
and end-to-end blink proof. A static sprite/closed-eye diagnostic cannot pass.

## Blocker B2: genuine optional calm, exact reproduced snap/root seam

Calm is supported and is in actual canonical authored YAML. It is **optional**,
not required boilerplate for pickup/handover or point recovery. Omitting it is
valid arm isolation, not a repair. Its visible defect violates supported-motion
continuity; no requirement to force every author to call calm is introduced.

Calm call receipt0→0 is instantaneous descriptor receipt, not no motion:
actual bone release0–4,hold4–8 and expression0–8 frames (.35s rounded).
At frame7(.291667s) left arm18.863086°/−6.287695° and right negatives,
open hands; at8(.333333s) both zero/rest. RendererFK:

| Hand | frame7 → frame8 stage pixels | displacement |
| --- | --- | --- |
| left | (841.977945,427.597186) → (880.512,428.6688) | 38.548953px |
| right | (1076.692614,401.914443) → (1035.072,429.7728) | 50.083566px |

**More precise owning defect than recipe-only diagnosis:** actorPose semanticEvents
includes `track.kind` in free-text action matching (around197–205).
`actionOf` `/touch|tap|press/` matches the substring **press in expression**
(around144). Expression calm has no arm parts, so eachSide falls back to both
arms; the touch branch466–473 applies54/−18×eased intensity. At7,
54×.35×(1−.125³)=18.863086, proving the observed arm angle. Actual evaluator
supplies duplicated active expression tracks; setArm repeats identical angles,
while torso tilt adds twice. Independent deriveActorPose inspection shows this
before any FK solve; no baked skeletonPose is present. At8 events become inactive
and derive defaults instantly to rest. Bone calm recipe names only torso/head;
rewriting its recipe alone cannot fix expression-channel action leakage.
208 full-acting warnings are confirmed, not all individually diagnosed here.

## Minimal repair contract (requires lifting source freeze for assigned writer)

1. Own core actorPose semantic/action dispatch: prevent expression-channel metadata
   from masquerading as bone actions/arm claims; preserve explicitly authored
   arm chains and intentional semantic motion. Diagnose duplicate global/subject
   expression dispatch at compiler/evaluator seam before any dedup change.
   Do not blindly add global smoothing or weaken continuity thresholds.
2. Add canonical supported blink temporal input in owning library/expression
   compile/evaluate seam, carrying actual numeric eyeOpen through real YAML.
   Verify interpolation/restoration before changing renderer; existing eye art
   and thresholds already consume it. No injected manifest or alternate DSL.
3. Regressions: actual calm alone/rest0–10 and calm overlapping one-/two-hand
   point must neither claim unowned arms nor snap; actual blink must render
   open→half→closed→half/open start/peak/recovery at24fps and restore expression.
   Preserve numeric expression values and old lin behavior.
4. Retain existing whole-body/contact suites: planted support/sole invariants,
   atomic proposal acceptance, all16 view/travel grip cases, pickup/handover two
   semantic calls, cue84 ownership and persistent holding, free release/putdown,
   contact-over-authored arbitration and natural withdrawal. Renew affected source
   hashes/manifests/media/full gates and obtain fresh independent delta review.
   Do not reroute contact solving, replace assets or add broad animation polish.

No source repair/tests added or staged. Cached diff hash before/final is
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`;
pre-existing staged gitmodules/vendor entries remain. Literal empty index is false.
Recommended next step: route these two owning-seam repairs under explicit authority,
then renew coverage; keep real-time AV, full art and M2 user gates separate.
