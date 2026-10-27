# M2 residual continuity — fresh independent review

2026-10-13T13:28:43+08:00 — Independent Reviewer; 15-minute bounded scope,
source frozen, no repairs. Only this ticket authored. Inputs: owning M2 and motor
contracts, residual ticket/bundle REVIEW.md, prior M2-SEAM-INDEPENDENT-REVIEW.
No production, assets, audio, staging, history or archive changes authorized.

## Verdict

**PASS for the specified regenerated canonical R1/R2/R3 residual repairs.**
**NOT M2PASS:** planted support is a reproduced M2 function blocker, not merely an
unexamined speed warning. Real-time motion, audio/listening, matched AV, whole-M2
art acceptance, user judgment and production-path approval remain unverified.
No new contact/socket/orientation error, missed canonical transfer or delayed
withdrawal-deletion snap reproduced. This is not a general runtime rate guarantee:
finite coupled retries can exhaust, including at ordinary scale during a held
view change. See the bounded counterexample below; do not promote canonical PASS
to acceptance of arbitrary orientation/target transitions.

## Revision binding and independent checks

HEAD4213bc40b64241b500b0d6097cccc585a0dc3eb3 plus inherited dirty/staged tree.
Bundle: `/home/z/.local/share/agentic-animation/art-baselines/m2-residual-20261013`.
Independently recomputed **363/363 source hashes and 1487/1487 bundle hashes**:
zero mismatches. Hash binding:

| Artifact | SHA256 |
| --- | --- |
| source-hashes.json | 4fbd8744098ad6465e90064d48a7f53556edd1ded792a4b41eafa221822caf55 |
| SHA256SUMS.json | 5f0d69b93721aa6b844fd4ebd924e07ad642b5815c2029a21ccc19f39b6282b1 |
| source-delta.diff | 3b9b93d5bfb2448ed7eb19988eafe7fce851bed6c324c27a8f936a802cd937ab |
| inherited staged diff | b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e |

Read complete scoped delta, motor retry/withdrawal/stride code, renderer Cartesian
arbitration, skeleton IK and targeted tests. `left-before-guard.json` and final
left manifest have exactly equal sceneTrack and assets; provenance change does
not invalidate those rendered motion inputs. Null-holder guard in actual source
avoids advancing a prop after opening the hand; release/putdown regressions pass.

Independent commands from repository root, all with foreground timeouts:
- `timeout 60 node --import tsx --test packages/studio/test/contactContinuity.test.ts packages/core/test/nativeSkeletonPose.test.ts`: **23/23 pass**.
- `timeout 60 npm run typecheck`: pass.
- `timeout 100 npm run test:all`: **215 pass, 7 skip**, no failures.
- `timeout 90 npm run smoke`: canonical check/make smoke passes.
- Scoped `git diff --check` on motor index/skeleton, actorPose and contactContinuity:
  pass. Python22-pass log is hash-verified reused evidence, not independently rerun.
- `timeout 60/70/80 node --import tsx --input-type=module` heredoc probes:
  independent all11 detector/FK/socket sweeps, rest/orientation endpoints,
  consecutive stance FK, baseline IK counterfactual and in-memory retry challenge.
  One initial directory-wide probe also encountered an unrelated episode without
  motor data and exited1 after ten cases; explicit staged-props rerun completed
  the specified eleven. No missing canonical case is hidden by that probe error.

No tests added: reviewer is read-only outside this report. Tests/smoke use their
ordinary disposable temporary workspaces. No actual source edits or new staging.

## Canonical contact and limiter exits

Probes independently import normalizePerformanceManifest/evaluatePerformance,
solveActorFigure, designHandToWorld and detectPropDiscontinuities. Sweep every
indexed frame with unchanged30px/35deg defaults. Use actual solved joints and
world mapping, not baked reach displacement as a proxy for visible motion.

| Case | Giver first hold | Recipient first hold | All warnings | Max unloaded withdrawal px |
| --- | ---: | ---: | ---: | ---: |
| front | 35 | 84 | 14 | 10.845 |
| front-right | 39 | 84 | 13 | 13.432 |
| right | 45 | 84 | 14 | 13.429 |
| back-right | 39 | 84 | 13 | 13.432 |
| back | 35 | 84 | 14 | 10.845 |
| back-left | 35 | 84 | 14 | 11.257 |
| left | 30 | 84 | 15 | 12.068 |
| front-left | 35 | 84 | 14 | 11.257 |
| authored-overlap | 35 | 84 | 14 | 16.914 |
| free-release | 35 | 84 | 14 | 11.411 |
| staged-props | 35 | 84 | 14 | 10.845 |

Every case: **zero arm/prop warnings**; remaining alarms are leg-cycle channels.
No recipient ownership before84; cue3.476644s samples at3.5s,23.356ms late.
No missed transfer. Full consecutive evaluated prop steps max29.854435px
(right), below30, including transfer. Contact palm→baked reach error at most
4.10e-13px. Independently rotate actual thermos local socket(36,-42) by baked
rotation and compare to world palm: maximum1.475412px, within1.5px socket contact
radius (test tolerance1.6px); not exact zero because initial bind permits radius.
Rotations max3.75deg/tick. No independent object clamp masks palm error.

All withdrawal clearing transitions included even when influence disappears:
max hand step at reach deletion12.074196px(authored lin100), below20.
Other canonical clearing frames100–102 are4.161–9.255px. Authored awei146 is
4.605614px; free-release awei129 is effectively0. This independently closes the
old target-only/angle-blend proof gap and checks the limiter's *exit*, not only
its interior. Cartesian interpolation does not leave a hidden unreachable hand
on these paths. Tests exercise both cleared and residual authored endpoints.

## Rest-leg and orientation repairs

Native rest IK round-trip and limiting onset tests pass every view/both legs.
Left awei30→31 world foot_l10.719224px versus prior40.132214; stopping no longer
deletes phase at47. Phase finishes52, foot_l15.980466px. Left46→47 remains
34.026279px: a real continuous swing/root displacement, not the old branch snap.
Quarter lin4→5 waist0→0, shoulder/elbow17.5px versus prior40.120/30.923px;
orientation-only claim no longer injects then drops9.6deg tilt. This is semantic
exit repair, not an orientation-flip exemption.

Manually inspected actual1280×720 left47/48/52 and quarter5 images with image
reader. Connected leg/arm contours; stopping foot moves visibly despite fixed
root. These are consecutive stills, not real-time viewing or an all-view art PASS.
Prior seam review's specific natural cup occlusion judgment is not reopened:
no new geometry/overlay repair justified by this scoped evidence.

## Planted support: measured M2 blocker, pre-existing root mechanism

Canonical left awei ground anchor691.2; rest foot joints y673.4592. Foot joint
is an ankle/rig anchor, **not the shoe sole**: the17.7408px offset alone is not
proof of floating. To identify stance use the local sine's non-lift half-cycle,
where the solved foot's vertical coordinate remains at its declared rest height.

Actual world FK during right-leg stance31…35:
`(688.669081,673.4592) → (719.062744,673.4592) →
(739.202630,673.4592) → (748.045310,673.4592) → (748.617621,673.4592)`.
**59.948540px slide in four intervals**, first step30.393663px. Left stance36…40
slides76.658718px. At stopped root966, left stance47…51 follows
x958.481698→974.413398→981.091541→976.456889→961.916466:
**41.784918px total horizontal travel without root travel**, not a planted anchor.
At delivered2/3 camera scale the right stance slide is39.966px and post-stop
travel27.857px. This is materially measurable support motion, not a35deg snap.

Attribution: source delta leaves renderer's local `foot+sine*40` target synthesis
unchanged; corrected bend branch restores its intended FK instead of creating
world anchors. Independently transpiled archived prior skeleton in memory,
recomputed its IK and current FK on identical current actor/root/phase inputs:
**right-leg31…40 baseline and candidate positions agree within1e-12px**,
including the stance slide above. Left old branch differs up to31.091px and is
repaired; do not claim every left-foot position was unchanged. Stopping now
finishes a local stride, so additional post-stop sliding is exposed by that
continuity fix. The underlying missing world support mechanism predates this
package, but is **not unrelated to M2 acceptance**: owning M2 explicitly requires
planted support, and motor invariant1 promises feet plant.

Supported next root hypothesis: native persistent world support targets with
stance/swing ownership and a root-speed/stride envelope. AC should measure
consecutive world-FK planted-foot displacement throughout stance, sole support
height separately, and continuous onset/stop/phase wrap for both travel directions
and views. Retain repaired rest branch and unchanged30px/35deg diagnostics; do
not close support with higher thresholds or a walking exemption. No repair here.

## Bounded limiter exhaustion challenge and scope limit

In-memory only: TypeScript transpileModule of actual motor source, absolute
imports to current skeleton/figureArtwork; instrumentation counts retry attempts
and records residual `hypot(held-before)` after the loop. No disk source rewrite.
Use nativeDraftArtworkFixture, skeletonViews from FIGURE_VIEWS, simulateScene:
hero x750/ground650/facing−1, cup x650/y650/size50×40/socket(12,-14)/radius1.5;
move+grab at0 for1.6s, free release6s; duration8s, resolveX650.

Fixed front at scales.8/.88: no exhaustion, max prop steps26.193/28.912px.
Scale1.6:119 retries, max attempt12, one exhausted substep at2.233333s with
6.002240px versus6px substep budget; max presentation prop step26.222px.
Thus even exhaustion does not by itself imply a30px frame failure.

At scale.88, right initially then left at3s:12 attempts exhaust with74.150891px
remaining. Actual frame71→72 prop74.15px; next frames73–75 rotate smoothly and
preserve hand/socket, no delayed jump at recovery exit. Independently run archived
prior motor with current skeleton on the same inputs: prior flip also jumps
74.040327px. This is a **pre-existing held-view transition outside all11 fixed-view
canonical cases**, not evidence this package introduced a transfer defect.
Candidate contact FK error0, socket error<.006px on sampled71–75/100/101;
no clamp hides a contact error. Neither candidate nor baseline emits a diagnostic
for that exhaustion. Halving recovery time cannot remove a view/root change
already applied outside the proposal. This falsifies an unconditional720px/s
runtime claim; canonical R3 acceptance is narrower and remains verified.

Before generalizing the motor budget claim, handle or diagnose irreducible view/
root changes and exhausted proposals without detaching/clamping the prop alone.
Require regression for held-view transitions and final accepted proposal bounds;
do not silently rename this limit universal enforcement. Not authorization for
a broad orientation rewrite or another art direction. No full-M2 PASS follows.

2026-10-13T13:36:52+08:00 — Review evidence checkpoint; worker source frozen.
Only review ticket changed; inherited staged hash remains unchanged. Remaining
M2 support and audiovisual/user gates require separate scoped work and proof.
