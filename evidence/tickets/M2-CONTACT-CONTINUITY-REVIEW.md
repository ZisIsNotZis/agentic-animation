# M2 contact continuity — independent review

2026-10-13T11:26:07+08:00 — Fresh Reviewer, read-only source review; only this
report written. HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3` plus dirty
candidate. Contract: M2-CONTACT-CONTINUITY.md and ART_CHARACTER_M2.md; bounded
continuity leaf, not whole-M2 acceptance. Budget 15 minutes.

## Verdict: BLOCKED (authored-arm regression)

Actual finite-hand approach, withdrawal, rest-branch IK and shared FK diagnostics
are substantially implemented. Existing targeted tests pass. However, extending
reach after release newly suppresses an explicitly authored right-arm gesture,
then snaps to its advanced pose when reach clears. This violates preservation of
explicit authored arms and continuous recovery. Do not accept this leaf yet.
No repairs, source/owner-doc changes, staging, commits or asset changes made.

### B1 — explicit right-arm override lost during withdrawal

Locations: `packages/core/src/motor/index.ts:771–782` retains reach after release;
`packages/studio/src/components/performance/actorPose.ts:648–656` unconditionally
replaces the derived right-arm pose whenever motor reach exists. The extracted
pose body is otherwise unchanged; the new lifetime creates the regression.
Existing authored-arm tests have no live reach and therefore miss this case.

Independent reproduction used the hash-bound archived synthetic manifest, added
one ordinary explicit bone event to receiver, and evaluated existing source:

```js
const m = JSON.parse(readFileSync(bundle + '/synthetic-proof/manifest.json'));
m.actors.find(a => a.id === 'receiver').tracks = [{kind:'bone', events:[{
  frame:108, endFrame:132,
  value:{action:'point', parts:['arm_u_r','arm_l_r','hand_r']}
}]}];
// evaluatePerformance(m, frame); deriveActorPose(actor);
// solveActorFigure(actor); detectPropDiscontinuities(m);
```

At frame112, receiver has no ownership: authored arm is upper -14.324074,
lower -7.583333, hand point; renderer instead yields upper 17.414478,
lower -32.314343, hand rest. At frame120, authored upper -29.75/lower -15.75
still loses to withdrawal upper 1.992395/lower -3.619758. Clearing reach on the
same evaluated actor restores the authored pose, establishing the cause.
At frame128 reach finally clears: hand jumps **100.833114px**, elbow
**40.115052px**, forearm angle **46.670131deg**. The new detector catches all
three. The later authored event-end jump at frame132 is separate and is not
attributed to this package. Baseline release cleared reach immediately, so did
not defer this explicit gesture until frame128.

Required repair: preserve the explicit override contract during outgoing
withdrawal with continuous arbitration/transition, not merely suppress the
warning. Add a release/transfer plus authored right-arm regression and fresh
independent review of the corrected result. Scope/priority design remains with
the implementation owner; reviewer did not select or implement a repair.

## Checks and positive findings

- Read actual `scoped-runtime.diff`, motor integration/release/transfer state,
  shared IK signature, renderer/extracted pose, detector and scoped tests.
- Independently SHA256-hashed all 12 scoped current files: all match archived
  source-hashes.json. Verified all **38** SHA256SUMS.json bundle entries: match.
  Baseline motor/detector hashes also match ticket baselines.
- `node --import tsx --test` on contactContinuity, nativeFigureMotor,
  figureArtwork, nativeSkeletonPose and performanceEpisode: **32/32 PASS**.
  Covers actual approach, transfer/release, unrelated flip masking, joint-only
  jumps, invisible actors, angle wrap, all eight orientations/both travel
  directions and existing authored-arm regressions (limited as above).
- `npm run typecheck` and `npx tsc --noEmit -p packages/studio/tsconfig.json`:
  PASS. `git diff --check`: PASS.
- Independent in-memory actual-draft 10s pickup/hold/release challenges for all
  eight orientations, with matching motor orientation AND evaluator bone
  orientation tracks: bind frame13 (profile frame16); continuously held through
  frames60–191; released frame192; rest by frame239; **zero shoulder/elbow/hand
  position or segment-angle warnings** for every orientation. This checks
  holding beyond intent duration and no timeout/drop. Existing transfer test
  verifies outgoing ownership loss and incoming ownership acquisition.
- An initial malformed profile challenge omitted evaluator orientation tracks
  while rotating motor geometry; its warning result was rejected as invalid,
  then corrected and rerun across all eight orientations. It is not a finding.
- Independently reran detector on archived synthetic manifest: zero arm warnings.
  Visually inspected contact-release-fixed.png: approach/contact and withdrawal
  are visible, limbs connected in these samples. This is only a synthetic
  rectangular prop, not handle/depth, canonical media or real-time/AV proof.
- Default detector thresholds remain advisory: gait/gravity false positives are
  documented. Removal of global flip waiver is real; renderer and detector use
  the same React-free solver. No silent ownership expiry introduced in inspected
  hold path. Default solveArmIK callers retain prior bend default.
- Reviewed archive gate logs as secondary evidence only; full test:all, smoke and
  Python were not independently rerun in this bounded targeted review.

## Revision binding — independently computed SHA256

```text
evidence/art/ART_CHARACTER_M2.md d5f7745013ef93644bda74c0b4c40b12e03b0b491a6c89bdb201d357eb706906
docs/8_MOTOR.md bdbbcfe10fb7e591ed680b36e34334a6669640b8d36b97ac142e8aa190702837
evidence/tickets/M2-CONTACT-CONTINUITY.md 11e38db8746be3e6f8d29d4fa38d254d387cf9d02d6a258dc2ccc1ace04ef977
packages/core/src/motor/index.ts 7a2ca98ebe156aeff596554405b5e92fbf59e09073952174bc25d7715e4decd5
packages/core/src/motor/skeleton.ts a192eb6e7c4e494c74586b5ef411e200c4a56f1c1f3a0d2159b7c08a28eceab1
packages/studio/src/components/performance/Actor.tsx 65558ea66cdb12529fa2c68168c5bc45c3fb7bcb8737a98056ec0c4d39975420
packages/studio/src/components/performance/actorPose.ts dde014144622dd8a883f89076ddf0e7882b848d8a28a4e224f1658b14bfb6c59
packages/studio/src/components/performance/reach.ts 8266bf3f66fd74bf612a84ecc4086c946f9df7753045839bd6799f69e214d93c
packages/studio/src/performance/teleports.ts 4f02654259195141387232f444c28fcd553efe2470664d815a56526fe533c21e
packages/studio/test/contactContinuity.test.ts d567937075cd464810334e53cabb433d22e44f1cba0fa99a9af2d3dba9e5e962
packages/studio/test/nativeFigureMotor.test.ts e6e6526ae347a4e7dbb9cf3dd2c2e6289e8b7a68f19be42936757ae493acbe48
packages/studio/test/performanceEpisode.test.ts cdb325265a3baf3521a69f3670a70f4d4e7baca459d697906c44a579febfc8c6
```

Bundle: `/home/z/.local/share/agentic-animation/art-baselines/m2-contact-continuity-20261013T032109Z`.
Source-hash inventory SHA256:
`b8973b8c300a36a751d81f5112bb51bd15d9121b5d6002ca21a8fd22aeed9253`.
Scoped runtime diff SHA256:
`5726a248507218630929b0d88e16b9c7423dfc31f57d869c6ab7dc8af4ebbdbe`.
Pre-existing staged diff SHA256 unchanged before/after checks:
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`.
Staged files exist (.gitmodules/vendor gitlinks); reviewer staged nothing.

## Remaining M2 limits

Handle grip sockets, live relative orientation/depth, pre-cue bilateral planning,
canonical affected media regeneration and independent real-time audiovisual QA
remain open per owner docs. No full M2 acceptance, user judgment or production
asset-path approval is implied by these tests or this review.
