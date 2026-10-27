# Independent review — unintegrated whole-body transaction

## Contract and verdict

2026-10-13T15:03:22+08:00 — Fresh independent reviewer, executable tools,
no source repairs, no recursion; bounded 15-minute scope. Start inspection
15:01:20+08:00. Reviewed the new helper, two source-named tests, three owning
docs/ticket and their exact archived baseline delta. Only this report is written.
Authoritative packet:
`/home/z/.local/share/agentic-animation/art-baselines/m2-whole-body-transaction-20261013T145601+0800/REVIEW.md`.

**intermediatePASS**, no material blocker for retaining the pure UNINTEGRATED
transaction seam. **NOT M2PASS, live support PASS or AVPASS.** Integration and
all original coupled support/contact/media criteria remain unmet. No source,
asset, audio, history or staging repair was made. This acceptance is confined to
the scoped hashes below, not the whole dirty tree or production behavior.

## Revision and preservation proof

HEAD: `4213bc40b64241b500b0d6097cccc585a0dc3eb3` plus inherited dirt.
Independently computed SHA256 matches EVERY entry in archive source-hashes.json:

| Scoped artifact | SHA256 |
| --- | --- |
| packages/core/src/motor/wholeBodyProposal.ts | afdc1dcd214fff7f9be1892acc37ecc20462b3e44cc4a0e5d6e72db069c5167e |
| packages/core/test/wholeBodyProposal.test.ts | db1f4d70ad6b4c3e87935ef1cd407b7b807eac623d606b639f64ff984d4149d7 |
| packages/studio/test/wholeBodyProposal.test.ts | 724e36730cd38ad73bdfc923b54defc164c019b15d62b4f21c6771cf7484fa97 |
| docs/8_MOTOR.md | b13666eee6659a8aad5de08eea285f97958ef759d20cc9797a823e0d33fc5272 |
| evidence/art/ART_CHARACTER_M2.md | 62bc837367c2162df796c9932de1aa5d8ddfc3b8c2f92b669c28033324280490 |
| evidence/tickets/M2-SUBSTEP-SUPPORT.md | fe6e9dc08143b3ca98f86033747968dd5b192ce627453733fd136a2ab4adbaca |

Runtime/control files independently compared to the package's start hashes:

| Unchanged artifact | SHA256 |
| --- | --- |
| packages/core/src/motor/index.ts | 3b198fe75017d1eb2f6390005957c7a0d9997a19e261d795f4dac1244b91f12e |
| packages/core/src/motor/skeleton.ts | 0deca5b0121dd501efe817189ba6d3af2707b187b2748bd2f86fb4a1d5baf419 |
| packages/studio/src/components/performance/actorPose.ts | be2d86086ce3da5ce93d3af37dea5291d82f792a2df2319635edc447825f3980 |
| packages/studio/test/contactContinuity.test.ts | 649fde7376c7c8be27be45bf6aa4f416df2fdfada1509646fc8444be2a153f56 |

`rg 'wholeBodyProposal|resolveWholeBodyProposal' packages --glob
'!**/wholeBodyProposal*'` returned no other callers. There is no live hook.
The byte comparison of `git diff --cached --binary` to
`work/baseline/staged.diff` passed; SHA256:
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`.
Existing staged entries are .gitmodules and two vendor gitlinks. No newly staged
files; the index is deliberately NOT empty.

## Independent executed checks

All commands foreground and bounded with timeout (10–100 seconds individually):

- `timeout 100 node --import tsx --test` with core wholeBodyProposal,
  studio wholeBodyProposal, core nativeSkeletonPose and studio contactContinuity:
  **36 pass / 0 fail**. New contract tests account for 10 of these.
- `timeout 60 npm run typecheck`: **PASS**.
- `timeout 100 npm run test:all`: **228 pass / 7 skipped / 0 fail**;
  235 total. Output inspected at `/tmp/m2-transaction-review-tests.log`.
- `timeout 90 npm run smoke`: **PASS**, canonical check/make, 0.55s manifest.
- `timeout 60 python3 -m unittest discover -s tools/art-direction-study
  -p 'test_*.py'`: **22 pass**.
- Scoped `git diff --check` on owning tracked docs and
  `git diff --no-index --check /dev/null FILE` on new helper/two tests/ticket:
  **PASS**, no whitespace errors.
- Owning docs/ticket length: 199 / 199 / 184 lines; below 200.

Additional reviewer-authored executable stdin checks used actual native draft
skeleton and shared solveSkeleton, not synthetic joint coordinates. **10 pass**:
no-support rejection; rotated socket miss; target-only false palm contact;
authored knee/FK foot failure; independent sole offset failure; fixed stance
anchor drift; complete nested Map/Set controller retry isolation; duplicate
ownership event rejection; intermediate socket failure with quiet endpoint;
endpoint equality including controller fields. Rejected cases preserve input,
return original complete state and no events. Tests are process-local, not new
source files; no production/source repairs were authorized.

The first reviewer socket challenge used 3 degrees and incorrectly expected
rejection: its actual socket displacement (~0.97px) is within declared 1.5px
radius. The assertion failed, not the implementation. Corrected to 6 degrees
(~1.93px), reran the entire 10-case script successfully. No threshold changed.

## Findings and limits

- Actual FK uses shared solveSkeleton and the same world transform as renderer
  comparison tests. Nonzero authored point poses, drop and articulated legs are
  exercised in all eight orientations × both directions; moving only final root
  rejects support/contact rather than painting an accepted target over bad FK.
- Coupled root/drop/leg/contact replanning is executable and deterministic.
  Finite progress retries receive fresh complete generic snapshots. All-actor
  failures roll back controller/prop state and deferred events together.
- Presentation samples are separately validated against accepted baseline and
  prior presentation reference. Authored intermediate elbow failures and early
  ownership fail even when endpoint is quiet. Endpoint equality applies when
  the requested presentation list includes dt.
- Unique gated ownership event data and recipient actual socket contact are
  validated; publishing exactly once remains the caller's job, not a live
  runtime guarantee of this helper. Callback external purity is a documented
  precondition, not something structuredClone can enforce.
- Skeleton, canonical pose, support schedule, artwork sole offset and socket
  are caller-supplied authoritative inputs. This seam cannot authenticate those
  inputs, infer ground/painted shoe contours, plan gait, or prevent a caller from
  inventing anchors/geometry. Integrator must preserve physical provenance and
  continuous stance transitions; the test's sole offsets derive independently
  from declared rest ankles, not the proposed solved feet.
- Owning docs explicitly say UNINTEGRATED, support unaccepted, no live gait
  enforcement and production motion unchanged. Ticket's expected live support
  red is not represented as a green support gate. Earlier broad motor invariant
  prose is contextualized by the explicit native-support blocker; this package
  does not newly claim integrated native support.
- Archived strengthened live-runtime red was read, not independently replayed;
  no new support/media proof inferred. No rendering, frame inspection, listening,
  lip QA, audiovisual judgment or whole-M2 review was performed.

No material scoped blocker found. Input-provenance/purity and unintegrated support
are explicit limitations, not reasons to relabel this seam as complete support.

## Exact next integrator contract

One cohesive owner must integrate, not issue another isolated speed/foot/hand
patch. Preserve full owning AC in M2-SUBSTEP-SUPPORT and ART_CHARACTER_M2:

1. Supply canonical authored + motor-arbitrated final native SkeletonPose before
   FK acceptance, with no core-to-studio runtime import or parallel DSL.
2. Snapshot ALL actor root/view/body/support targets/anchors, waist/crouch,
   lean/walk/gait, reach/retract, hold settling/grip/wrist, ownership/carry velocity
   and mutable controller fields. Resolve ALL actors' pursuit/separation before
   support/contact; mixed legacy/native separation cannot mutate accepted native
   bodies afterward. Preserve legacy-only trajectories byte-identically.
3. Plan reachable first/last strides, continuous landing and recovery from full
   Cartesian/angular limb feasibility, including vertical lift and near-extension
   knees/elbows. Retain authoritative world anchors and artwork sole offsets;
   validate actual FK, not clamped targets. Replan finite rejected whole-state
   progress; do not clamp root, feet, palm or prop independently.
4. Supply real indexed presentation samples AND accepted presentation reference;
   ensure final endpoint is included when it is presented. Carry accepted support/
   foot targets through compiler bake and both evaluator paths to renderer.
5. Bind prop-local socket from resource or bind-time capture. Emit gated transfer/
   release data only on accepted actual live contact/cue; publish accepted state
   and deferred ownership once outside retries. Exhaustion retains original state,
   no events and useful actor/time/constraint diagnostics. No extra author calls.
6. Jointly pass strengthened full-chain/support detector: all16 stance paths,
   exact canonical left31–40/47–51, prototype62/16/13/36 and subsequent49/50/55,
   knees10/15; separate <=.02px stance/reach/sole proof. Keep default detector
   30px/35deg, palm<.02px, socket<=1.6px and rotation<=3.76deg; no arm-only
   relabelling, sliding stance or threshold lowering.
7. Renew all11 canonical recipient84 manifests, deterministic duplicate bake,
   no arm/prop diagnostics; preserve default two-call pickup/handover, persistent
   holding, one-call free release, place and authored-arm recovery semantics.
8. Run final gates, bind source/manifests/frozen audio hashes; regenerate affected
   actual frames/video and inspect start/peak/recovery/contact triplets plus
   real-time/audio/lip/subtitles/visual quality. Route fresh independent integrated
   review and whole-M2 review. This report supplies neither AV nor M2 acceptance.

No production replacement, publication, commit or authority expansion follows
from intermediatePASS. Next action is the cohesive integration package above.
