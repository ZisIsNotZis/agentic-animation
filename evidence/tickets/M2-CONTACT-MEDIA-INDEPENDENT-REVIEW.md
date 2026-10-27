# M2 contact media — fresh independent root-cause review

2026-10-13T12:25:45+08:00 — Independent Reviewer. Contract: 15-minute maximum;
read-only source/assets/history/staging; write only this report. No repairs,
recursion, publication, production replacement or additional generated media.
Read current ART_CHARACTER_M2.md user requirements, INDEX, contact-media ticket,
contact-model independent review and frozen bundle REVIEW.md. Goal: independently
falsify limb/contact continuity and readable handle attachment on canonical media,
not promote technical tests into visual acceptance.

## Verdict: BLOCKED, not visual PASS or whole-M2 PASS

Three material rendered defects reproduce: profile approach/offer elbow jumps,
optional authored-gesture endpoint snaps, and crowded profile grip silhouettes.
The early cue is a separate timestamp/contract defect, **not demonstrated audible
or real-time perceptual failure**. Finite fps forbids exact arbitrary subframe
presentation, but does not require presenting ownership before its cue. Do not
waive the no-earlier contact requirement as unavoidable nearest-frame rounding.
No audio, lip-sync, balance or real-time-motion acceptance is claimed here.

## Revision and independent evidence

Bundle root (`B` below):
`/home/z/.local/share/agentic-animation/art-baselines/m2-contact-media-20261013T041200Z/`.
HEAD remains `4213bc40b64241b500b0d6097cccc585a0dc3eb3` plus dirty candidate.
Independently verified all360 current source files against source-before.json:
360 matches, zero mismatches. Independently verified seven viewed/input entries
against SHA256SUMS.json, all match (warning/authored sheets, right f22/f83,
authored f99/f100 and source-before). Source inventory SHA256:
`3c2ea16eb2023b21fc6620c937ed4d66b1922463fa2e1a4a6b685ac5f689dda4`.
Exact manifest byte SHA256, not normalized JSON or HEAD:

| Episode | performance.json SHA256 |
| --- | --- |
| contact-right | 0ff7e3d5fe79c8ab6926c7cb0c95efadef43cbfb03f15c8f81b6d170044a1caf |
| contact-left | d8f29ff754142f47ff8a1d212a0878bfe0ac48b5d0ca8beb8c305a5f593f1b98 |
| authored-overlap | 5a897ebd0b132edfdf06dd8b3bb53ce1bcad416925ef27a3cebfeba24f664acd |
| staged-props | 57fe1f38fcbb51c107ecd84882b133f44779eac1a7db53b60331e1c8e04acf09 |

Viewed actual sheets warning-contact, authored-overlap, right/left/front-right grip;
full1280×720 canonical right f22/f83 and authored f99/f100. These modalities
establish visible pose/occlusion changes, not how they feel during playback.
Independent full video decode of contact-right exited0; no listening/playback.
`timeout 100 node --import tsx --test packages/studio/test/contactContinuity.test.ts`
passed15/15, including all16-view/travel challenges: the defects below coexist
with that PASS. Prior209pass is not independently rerun or treated as visualPASS.

## Reproduction and material findings

Run from repository root; this bounded read-only command uses frozen canonical
manifests and current hash-matched renderer FK, not worker warning receipts:

```sh
timeout 70 node --import tsx --input-type=module <<'JS'
import fs from 'node:fs';
import {detectPropDiscontinuities} from './packages/studio/src/performance/teleports.ts';
const B='/home/z/.local/share/agentic-animation/art-baselines/m2-contact-media-20261013T041200Z';
for (const ep of ['contact-right','contact-left','authored-overlap']) {
 const m=JSON.parse(fs.readFileSync(`${B}/workspace/episodes/${ep}/performance.json`));
 console.log(ep,detectPropDiscontinuities(m).filter(w=>
 /\.(elbow_r|hand_r)/.test(w.id)&&[22,68,100,146].includes(w.frame)));
}
JS
```

- **B1 profile onset/offer:** right lin f21→22 (0.875→0.916667s), elbow
  30.744034px stage displacement; left awei f67→68 (2.791667→2.833333s),
  elbow31.711106px. Both exceed unchanged30px diagnostic. At camera z2/3,
  these are20.496/21.141 delivered pixels. Actual sampled art abruptly bends
  the previously near-straight elbow, not an ownership teleport.
- **B2 authored endpoint:** lin f99→100 hand116.406350px/elbow42.007728px;
  awei f145→146 hand116.482494px/elbow41.218540px. Forearm segment turns
  51.124150/51.702211deg. Full f99/f100 visibly switches raised pointing arm
  to hanging arm in one frame (~77.6 delivered pixels hand displacement).
  Optional authorship does not exempt this from M2 explicit-arm acceptance.
- **B3 crowded grip:** right f60/82/83/84/96 and front-right f60–84 overlap
  silhouettes; right full f83 has near-coincident heads and a cup across both
  upper bodies, with no clearly separated incoming/outgoing arm ownership path.
  Root separation79.2 stage px =52.8 delivered px throughout right f60–96.
  A visible fist on the loop is not proof that two hands/contact depth read
  credibly. This is a concrete readability blocker, not proof of literal mesh
  penetration. No speculative finger-animation requirement is introduced.

## Root seams and smallest viable repair hypotheses

**B1: continuous hand targets do not imply continuous elbow FK.**
`reach.ts:solveReach` feeds analytic `skeleton.ts:solveArmIK`; its fixed native
bend branch is preserved here. Near full extension, acos IK is ill-conditioned.
Right f21 has no reach; f22 starts waist5deg/crouch0.066667 with almost fixed
hand (891.586136,441.1392)→(892.250963,441.112885), while shoulder moves
(869.410136,285.9072)→(880.806584,294.398473). IK radius falls from near178.31
to167.227376 design px. Independent in-memory counterfactual f22 with waist/crouch
zero yields elbow(881.188945,354.706102), only0.907px from f21 rather than30.744.
This isolates coupled shoulder/crouch onset, not a world-target jump.
Left f67 target radius178.309003 equals chain max178.309002; f68 radius162.101264.
Only14.615stage-px hand motion produces31.711px elbow and lower angle
-3.810282→45.362927deg. Holding the previous target removes that elbow change.
Counterfactual flip-only changes neither case: native side view determines mirror,
so evaluator flip changes are **not** this root cause.
Smallest hypothesis: ease waist/crouch onset plus reach radial motion against
rendered elbow/angle velocity near extension; retain socket/contact authority.
Do not globally relax warnings, change native bend side, or cap angles alone
and thereby pull loaded palms off the handle. Test a coupled shoulder/hand path.

**B2: claim lifetime changes the blend authority discontinuously.**
`evaluate.ts:107` marks bone event inactive at end; `actorPose.ts:semanticEvents`
consumes active events only. Point (`:336`) eases toward34/18deg, not back to
rest. `solveActorFigure:654–656` sets weight to1 as soon as authoredRight disappears,
even with baked reachInfluence0. Lin f99 arm(-33.993080,-17.996336) switches at
f100 to(1.032093,-1.897358); awei behaves likewise at146. Unloaded near-rest reach
is reasserted in one frame. The overlap test checks only start…clear+1, while
its point remains active until143; it never examines that authored event's end.
Smallest hypothesis: give semantic point a continuous recovery envelope within
its event, and make authority handoff respect withdrawal influence/pose at claim
exit. Add canonical short point endpoints with reach still present AND cleared;
fixing only reach deletion misses this reproduced case. No required author reset.

**B3: physical body exclusion is not rendered silhouette readability.**
Motor arrival/body separation (`index.ts:878–979`) uses torso half-width geometry,
not heads, projected offer/hand outlines or readable interactor contact corridor.
Forced profile views also do not become opposing profiles merely via facing.
Tests measure connected FK, socket equality and ownership, not visible coverage.
Smallest hypothesis: derive view-aware safe stopping/offer positions from existing
native extents and reachable interactor handle space, preserving two semantic calls
and all requested views. Then reassess masks/depth ordering at that spacing.
Do not hide failure by always rendering front or adding manual YAML repositioning.

## Cue: quantization versus premature presentation

Independent receipt: transfer frame83 at83/24=3.458333333; intended3.476644;
early18.310667ms. Correct earliest non-early frame is84 at3.5, late23.356ms.
This is within one24fps interval but early presentation is not forced by fps.
Root differs from bundle's “nearest-frame rounds” explanation: motor has120Hz
substeps; `index.ts:487` uses now=step/120 and `:1015` stores AFTER each five
substeps, indexed at interval start. Frame83 stores through step419 at3.491667;
cue first eligible step418 is3.483333. The internal no-earlier gate (`:733`)
can be correct while the indexed rendered frame displays its future state early.
Evaluator consumes frame index directly (`evaluate.ts:1112–1123`). Diagnostics
`:1171–1173` accept floor(cue*24), so this premature rendered transfer is silent.
Integer3s cue test cannot distinguish this off-grid seam.
Smallest hypothesis: align bake sampling timestamps with presentation timestamps,
or retain substep event timestamps and defer ownership presentation to ceil(cue*fps).
Validate ALL channels (prop position/rotation, incoming contact, outgoing ownership),
not a holds-only delay. Keep physically infeasible cue diagnostics. No audio
perceptual judgment or new timing tolerance is authorized by this review.

## Falsifiable repair acceptance (not a waiver or new user decision)

1. Regenerate hash-bound canonical plain two-call pickup/handover, one-call free
   release, all8views/both directions and short optional point overlap. Sweep every
   rendered frame, including reach appearance, first contact, transfer, reach clear,
   authored start/end ±2frames and settled hold. Use final solveActorFigure FK,
   including torso/crouch/mirror/actor rotation and camera projection, not motor
   reach alone. No existing30px/35deg warnings for arm chains or props; unloaded
   hand steps remain≤20px at24fps under existing480px/s cap. These are necessary
   ceilings, NOT sufficient visualPASS. Preserve socket radius2/contact equality.
2. Authored endpoint continuity: with motor state frozen at event boundary, compare
   limiting progress1 active pose against inactive/next pose; palm/elbow positions
   must agree within0.02stage px, or a declared engine-owned recovery interval must
   bridge them while satisfying the same per-frame gates. This excludes the
   reproduced hard switch without imposing author resets or disabling point.
3. At1280×720 inspect consecutive contact-window crops plus real-time clips:
   clearly trace both actors' shoulder→elbow→hand paths; gripping hand meets handle
   loop rather than cup center, cup body does not visually cut through the palm,
   and foreground hand/object order agrees with declared socket depth throughout.
   Reject any crop where actor overlap prevents attributing the receiving grip;
   reviewers annotate exact failed frame/occluding part, not merely “looks good”.
   Sparse grip sheets and numerical palm equality cannot close this criterion.
4. Sweep fractional cue phase across a24fps tick. No receiver holds/contact state
   at presentation time<cued time. For feasible ample-pre-roll scenes first contact
   appears at ceil(cue*24), and internal timestamp≥cue; otherwise emit a miss.
   Preserve infeasibility diagnostics and continuous prop/arm channels. Exact
   subframe rendering is impossible at24fps; never label ceil sampling exact.
5. Rerun source gates and canonical rendered evidence on repaired hashes, then fresh
   independent media review. Real-time viewing/listening remain separate open
   modalities; this report establishes blockers without claiming those modalities.

2026-10-13T12:29:36+08:00 — Evidence gathered; staged diff SHA256 still
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`.
Reviewer staged nothing; inherited staged vendor/.gitmodules entries remain.
Next: authorized writer repairs these seams after freeze ends, preserves this
bundle, regenerates bounded affected media and routes fresh independent acceptance.
