# M2 seam repair — fresh independent review

2026-10-13T12:52:44+08:00 — Independent Reviewer; source frozen, no repairs.
15-minute targeted budget. Only this ticket authored; no staging, assets, history,
source, archive or production-path changes. Inputs: current ART_CHARACTER_M2,
M2-CONTACT-SEAM-REPAIR, prior M2-CONTACT-MEDIA-INDEPENDENT-REVIEW and candidate
bundle REVIEW.md. Objective: falsify repaired seams and classify residual motion/
profile occlusion, not conduct a full audit or certify AV/M2 acceptance.

## Verdict: scoped repairs verified; overall continuity remains BLOCKED

B1 elbow-onset and B2 hard authored endpoint switches are repaired on examined
canonical source/media. Fractional cue ownership is now non-early at frame84.
Spacing materially improves the sampled profile contact silhouettes. Remaining
partial forearm coverage alone is natural object occlusion, not sufficient evidence
for another depth/geometry repair. This does **not** certify all-view visual or
real-time readability. Material residuals: native leg IK/rest discontinuity,
orientation-claim exit, and rendered recovery velocities exceeding agreed ceilings.
No whole-M2, visual-motion or AV PASS; no speculative finger/polish requirement.

## Revision and proof binding

Bundle B: `/home/z/.local/share/agentic-animation/art-baselines/m2-seam-repair-20261013T043300Z`.
HEAD4213bc40b64241b500b0d6097cccc585a0dc3eb3 plus preserved dirty tree.
Independently hashed361/361 current source inventory entries and1502/1502 bundle
SHA256SUMS entries: zero mismatches. This covers inspected images, manifests,
source delta, copied inputs and worker gate logs; archive is not a remote backup.

| Binding | SHA256 |
| --- | --- |
| source-hashes.json | a68075e307469630ba3b5058bb8bd6db4ad0da92508aefd02e8d57216e884feb |
| SHA256SUMS.json | 7ed810e0b281e5ff145984d7497e8c24f5e56e6878a58208a1bea9f5599d6e15 |
| source-delta.diff | 6cc550cae2a45f30ddf762f2b9f98693ae1ec7d957d5dc973b7e67b6d3e08988 |
| contact-right performance.json | bd6fd55f0f6ef9541ea5c94df2c0e026db17cf1219e775f372bfd1884d19fec8 |
| contact-left performance.json | f408a30b4d7fe6a1c3a8da9fa745363f2f29e5c525961468f80a3c44b5cfe2df |
| authored-overlap performance.json | 30512d38745f031228787e14527f6e2156cd31ca8bdec940288ddeee2aafd6c5 |
| contact-front-right performance.json | 0892ac83dd52ed6c39303a7c23a667bb17ffba31433f4fbfac55099efb6a9191 |

Read complete five-file source/docs delta, new worker ticket and scoped renderer/
motor/detector context. Independently ran18/18 contactContinuity tests (3.42s),
full FK detector sweeps on all11 regenerated canonical cases, direct evaluated
joint/angle probes and in-memory counterfactuals below. No test additions.
Worker full212pass/7skip, typecheck,22Python and smoke logs are hash-matched
reused evidence, not independently rerun whole-project gates.
`git diff --check --` scoped five changed files passed. Full right video decode:
`timeout 50 ffmpeg -v error -i B/workspace/episodes/contact-right/dist/contact-right.mp4 -f null -`
passed. Decoding is neither real-time viewing nor listening.

Reproduction commands ran from repository root with `timeout 40/50/70/90 node
--import tsx --input-type=module` importing `evaluatePerformance`,
`normalizePerformanceManifest`, `solveActorFigure`, `designHandToWorld`,
`detectPropDiscontinuities`, and `plantedLegAngles`; read B/workspace/episodes/EP/
performance.json. Sweep frame0…normalized.durationInFrames−1; default detector
30stage-px/35deg unchanged. Joint probes use the same renderer FK at consecutive
frames. Camera z2/3 converts stage distances to delivered1280×720 distances.
Numbers below are not rounded detector receipts or motor-target-only measurements.

## Repaired seams

- **B1:** default sweep finds no right-arm onset/transfer/deletion warnings in
  right/left/authored cases. Right lin21→22 elbow11.769864px, hand11.801186px
  (much of this is root−11.813864px); waist0→0.000824deg versus prior abrupt5deg.
  Earlier left67→68 is now stationary; onset moved with wider separation, so
  absence at the old frame alone is not evidence: entire left sweep was checked.
  Viewed current full right22: arm begins neutral, no prior hard elbow bend.
- **B2:** authored lin99→100 hand9.054490px/elbow3.115768px versus prior
  116.406350/42.007728px. Viewed full99/100: progressive return, not raised→hang
  hard switch. Independent tests exercise limiting progress1 versus inactive
  endpoint within0.02px, both residual and cleared reach. Recovery is continuous
  but not yet fully rate-compliant (see residual R3).
- **Cue:** inspected native-only indexed sampling and ceil diagnostic change;
  five fractional-phase tests pass. Direct frozen canonical right/left/front-right/
  authored motor inspection: receiver first holds84, zero receiver holds/contact
  before84.84/24=3.5s versus cue3.476644: late23.356ms, not exact synchrony.
  Full rendered FK/prop sweeps show no new transfer jump. Legacy-only frame-end
  sampling is explicitly preserved/documented; no early-frame exemption added.

## Geometry and outgoing forearm judgment

Viewed actual1280×720 right83/84/85, left83/84/85, front-right84, authored99/100
and right22 using image tools. Consecutive frames, not playback/listening.
Right root separation at83 is145.728stage px (97.152 delivered), left160.813864
(107.209243 delivered), quarter133.056 (88.704 delivered), versus prior79.2.
Heads are distinct; lowered object is below faces. Incoming fist meets exposed
handle loop, not cup center; foreground fingers remain outside the cup silhouette.

Right83/84: giver is the right actor; shoulder/sleeve and elbow are attributable,
while distal forearm is partly covered by the tilted cup. At85 its open hand and
forearm emerge below/right of the loop as the left actor retains the fist.
Left83/84: right actor's offering upper arm, elbow and descending forearm are
attributable; at85 open withdrawal separates from the left actor's grip. The
cup masks part of the receiving forearm in this projection. These are anatomically
consistent occlusions at the meeting socket, not evidence of disconnection or
literal penetration. Global native object-between-body-and-fingers layering
explains covered distal segments; FK equality alone did not determine judgment.

**No independently reproduced residual B3 material defect in these samples.**
Do not force front views, enlarge spacing again, or move every forearm above the
object merely to make the whole chain visible. Strict full contact-window and
real-time readability acceptance remains unverified; sampled attribution closes
the prior near-coincident-head/crowded-upper-body reproduction only, not all-view
art acceptance. A new geometry repair needs a specific failing frame/path.

## Residuals: distinguish discontinuity from diagnostic speed alarms

**R1 — native support/rest seam, material generic leg defect.**
Contact-left awei30→31: foot_l40.132214px, shin101.830113→145.560073deg
(43.729960deg); root+17.5, walk0→0.092. At46→47 stopping: foot_l50.555786px,
shin135.087941→101.830113deg; root+14, walk0.467→0. These are not exempted
because the actor walks. Renderer actorPose638–648 replaces rest legs with
plantedLegAngles only when crouched or phase>0. Independent epsilon probe with
same actor/root shows an actual limiting discontinuity:
phase0 foot_l(222.8,699.84); phase0.000001(253.273979,684.834213) design px.
Zero-drop/zero-target IK returns left upper1.219013/lower−24.879240deg, not0/0.
Therefore even an infinitesimal walk starts from another rest branch; easing
root travel alone cannot repair this. Fixed leg bend signs in skeleton206–219
fail rest-FK round trip. Smallest generic hypothesis: derive/preserve native leg
bend branch from declared rest joints (as already done for arm IK), ensure zero
stride/drop target reproduces rest, then bridge walking-stop phase/stride amplitude
continuously. Test limiting rest plus first/last walking samples, both directions.

Other cycle warnings are **real fast motion, not automatically teleports**:
staged-props lin5→6 knee_r50.829405px, thigh94.325019→107.158865deg
(12.833846deg), root−17.5; foot_r38.011398px. The smooth sine stride plus root
translation compounds stage displacement; repeated31–38px foot steps alone are
false positives for an *instantaneous teleport*, but not proof of planted support.
The35deg angle gate does not catch all visible sliding. Preserve30px diagnostics;
separately check world-space stance anchors/sole height and branch/phase exit.
Native rendering currently synthesizes local sine targets, not persistent world
support anchors. R1 has concrete endpoint proof; cycle art judgment remains open.

**R2 — orientation claim exit, material.**
Contact-front-right lin4→5 elbow_l(1121.904763,341.553492)→(1092.584,351.3792),
30.923319px; shoulder_l40.120251px; root−17.5. Upper segment114.531417→
104.931417deg. Native waistPitch9.6→0 as the five-frame `turn the body
front-right` claim expires. Removing active events in-memory at4 reduces elbow
step to17.5px, isolating semantic claim exit rather than socket/flip.
Fallback actorPose473 adds16*(p−0.5)*amount for turn/orient, then disappears.
Smallest hypothesis: explicit orientation-only claims must not introduce transient
semantic torso tilt; actual authored turn acting needs endpoint recovery. Test
limiting claim exits, retaining requested view and head actions. Front shoulders
f1–4 at31.48–32.59px are smooth tilt+root velocity, false positives for *teleport*
but still over the unchanged diagnostic ceiling; quarter/profile f5 is a true
claim endpoint discontinuity. No blanket orientation exemption.

**R3 — coupled rendered recovery rates, material acceptance gap, not snaps.**
Loaded staged/front/back-family thermos38→39→40→41 positions:
(921.07,608.89)→(904.72,582.41)→(888.33,555.67)→(873.09,529.1).
Steps31.120940/31.363350/30.630418px =746.90/752.72/735.13stage px/s.
Rotation increments3.75deg, not35deg branch turns. Loaded palm follows socket;
waist65.5→60.5→55.5→50.5deg, crouch0.523333→0.456667→0.39→0.323333.
This is smooth coupled posture/hand/object rotation, **not ownership teleport**,
but exceeds required30px prop ceiling. Recovery's120deg/s waist and1.6/s crouch
plus shoulder-relative carry and rotated socket move the visible object faster
than any one target cap. Smallest generic hypothesis: jointly rate-constrain
posture/hand/prop recovery in world FK while preserving loaded socket equality;
do not clamp prop independently, break grip, or increase warning threshold.

Additional unloaded20px ceiling is missed by30px-only tests: right lin85→86
rendered hand(825.945773,405.785985)→(844.969622,417.466114),22.323357px;
baked target moves exactly20px, while influence0.970600→0.925926 compounds
angular blend. Left lin84→85 rendered21.139915px. Authored awei143→144
hand(1026.072162,417.400959)→(1002.487360,431.024734),27.236926px, with
influence0.029400→0.004324 during point recovery. These exceed480px/s unloaded
ceiling without a hard endpoint switch. Fix rendered withdrawal/arbitration path,
not just motor target; parameterize point recovery against actual geometry/time
if retaining that ceiling. Preserve optional point and no-reset authoring.

## Next hypotheses and limits

Prioritize R1 rest-branch round trip and R2 orientation claim lifetime; then R3
coupled recovery velocity, adding renderer-level20px unloaded assertions and
retaining30px/35deg detector plus socket tolerances. Regenerate only affected
canonical walking/onset/recovery/contact media, inspect stance and consecutive
frames, and route fresh final-revision review. Do not restart repaired B1/B2/cue
or add geometry polish absent a concrete failure. Existing all16view/travel tests
pass but do not establish all-channel visual acceptance. No reverse canonical
media, whole-M2 audit, real-time playback, listening, matched AV comparison or
user acceptance conducted here. Full M2/AV and production gates remain open.

2026-10-13T12:56:43+08:00 — Evidence collection checkpoint. Inherited staged
SHA256 remains b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e;
reviewer staged nothing. Existing vendor/.gitmodules staged entries preserved.
