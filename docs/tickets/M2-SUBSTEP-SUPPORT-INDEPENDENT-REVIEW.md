# M2 retained annulus helper: independent scoped review

2026-10-13T14:30:41+08:00 — Fresh reviewer, execution tools, no repairs or
recursion. Scope: task-start dirty baseline → retained helper/test/doc delta in
M2-SUBSTEP-SUPPORT and its checkpoint archive. Budget: 12 minutes; commands
bounded at 120 seconds. Only this review document is written.

## Verdict

**PASS: retained helper, meaningful tests, attribution and scoped rollback.**
No blocking defect found in this retained delta. **World support remains NOT
ACCEPTED; this is not M2PASS or whole-objective impossibility.** Three rejected
hypotheses independently reproduce red full-chain cases. The next owner must
implement a cohesive whole-body proposal transaction, not reapply the archive.

## Revision and attribution

Repository HEAD: `4213bc40b64241b500b0d6097cccc585a0dc3eb3`, with inherited dirty
and staged work. Review baseline is archived `work/baseline`, NOT clean HEAD.
Archive root:
`/home/z/.local/share/agentic-animation/art-baselines/m2-substep-support-20261013T142251+0800/`.

Python SHA256 verification of every entry in `SHA256SUMS.json`: **410 checked,
zero mismatches**. Retained diff hash:
`595085626fc3eaabf542e5956642d22ed5bcd17a3e91e930bdd6ec08c2caf1b1`.
Current hashes agree with the archived source inventory:

| File | SHA256 |
|---|---|
| core motor/skeleton.ts | `0deca5b0121dd501efe817189ba6d3af2707b187b2748bd2f86fb4a1d5baf419` |
| core test/nativeSkeletonPose.test.ts | `d9ad5db4862177c6ebe4c54cd3718ca328030798ef3b58295265b3400588044b` |
| WORLD_PUPPET_MOTOR.md | `a4fa701ce0e8a4ea60f03db8835877a2b983f577ccba894d9c62e2655fb3754b` |
| ART_CHARACTER_M2.md | `fc923a846fbde199535e14b7255e8b86f03dd75d116d85f2045d4891e7a60c10` |
| M2-SUBSTEP-SUPPORT.md | `072f750834a7fc289a656e7101a1504f5f1d151f39ff124ffe72a4d13de8786f` |

Byte comparison to scoped baseline confirms exact restoration of motor/index,
evaluate, types, actorPose and contactContinuity.test. Retained-scoped.diff has
only the geometry helper, two tests, owning doc statements, ticket and two
nonsemantic line joins. No new production support fields/controller survives.
`rg legDropInterval packages` finds only definition and tests, no live caller.

`git diff --cached --binary` is byte-identical to archived baseline staged.diff
and staged-final.diff, SHA256
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`.
Earlier staged entries (.gitmodules and two vendor gitlinks) remain present;
this reviewer staged nothing. This proves scoped restoration and unchanged
staging, not an independent historical audit of every unrelated dirty asset.

## Geometry and tests

For finite validated native joints, let a/b be segment lengths, dx/dy target
minus rest hip, R=a+b-.01 and r=|a-b|+.01. On the nonnegative-drop branch
with ankle at or below hip, feasible vertical distance is
`sqrt(max(0,r²-dx²)) … sqrt(R²-dx²)`, provided `|dx|<=R` and `R>=r`.
Intersecting corresponding drop values with `[0,+infinity)` gives exactly the
implemented interval. Empty intersection returns null. The .01 conservative
annulus is inside solveArmIK's .001 clamp envelope; successful target FK must
not rely on plantedLegAngles' horizontal clamp. Units are design pixels, not
world pixels; this does not validate leaning/flipped/transformed whole bodies.
Missing joints/nonfinite inputs are outside the validated skeleton contract.
The lateral equality branch permits hip and ankle at equal height (above is
non-strict); that is consistent with a closed standing half-plane.

Tests are meaningful: synthetic unequal 60/40 bones independently assert both
annulus radii, outer horizontal rejection, inner-circle impossibility, negative
target and zero-drop permission. Five native views × two legs × three lateral
offsets × endpoint/midpoint yields 90 actual shared-FK comparisons with 1e-6
coordinate tolerance. Checking realized target coordinates detects target
clamping, unlike checking IK angles alone. These tests prove helper geometry,
not stance persistence, sole-height contact or body-rate feasibility.

Independent current-tree commands:
- `node --import tsx --test packages/core/test/nativeSkeletonPose.test.ts`: 4/4 PASS.
- `node --import tsx --test packages/studio/test/contactContinuity.test.ts`: 22/22 PASS.
- `npm run typecheck`: PASS.
- Scoped `git diff --check` for skeleton/test/two owning docs: PASS.

Archived test:all/smoke/Python logs were hash-verified, not independently rerun;
no media/audio acceptance was performed or inferred from reused stills.

## Independent falsification of rejected hypotheses

Read archived implementations, strengthened test (lines 430–455) and detector.
The test invokes default 30px/35deg whole-visible-chain diagnostics before
support assertions, then checks actual renderer FK against world anchors and
previous stance positions (<.02px), duplicate bake and final double support.
These are real counterexamples, not infrastructure failures or failures of the
retained current baseline. Its early assertion means later orientations and
stance checks are not proved by a red run.

Read-only replay used a process-local CommonJS readFileSync overlay: original
repository filenames retain relative imports; only archived motor, skeleton,
evaluate, actorPose and test contents are substituted. Nothing on disk was
replaced. Same archived strengthened test used for all variants:

| Variant | Independent expected-red result |
|---|---|
| H1 motor-h1 / actorPose-h1 | 22 pass / 1 fail; front/-1 foot_r f8 63.086690px; knee_r f10 68.897730px |
| H2 motor-h2 / actorPose-h1 | 21 pass / 2 fail; left/1 persistent hold fails; front/-1 foot_r f8 36.336773px, knee_r f10 41.759000px |
| H3 motor-h3-initial / actorPose-h1 | 22 pass / 1 fail; front/-1 foot_r f7 31.766848px, knee_r f10 40.278363px |
| H3 refinement rejected-final motor / actorPose-h1 | 22 pass / 1 fail; front/-1 knee_r f10 34.790260px and knee_l f15 30.877755px |

All listed geometric red deltas match archived logs. H2 lowered native root
speed; H3 changes swing planning/travel budget and speed-aware pre-roll, then
refines speed/reserve: distinct paths, not identical retries. A fixed 420px/s
alternating stance requires roughly 840px/s average swing for symmetric duty,
already above 720px/s at 24fps/30px; that reasoning is conditional on duty,
not proof that every possible gait is impossible.

Replay caveat: dynamic ESM imports bypass this synchronous overlay. Therefore
archived H3 front elbow f50 34.433018px / quarter elbows f49 30.712994px and f55
34.624234px, and H2 cue -1 versus 84, are hash-bound recorded evidence, not
independently reproduced here. The independently reproduced knees/feet suffice
to reject each hypothesis without relying on those supplemental cases.
An initial ESM-loader attempt failed missing archived relative dependencies;
an import-based overlay then ran only the 22 current tests (not prototype
proof). The corrected createRequire replay printed each OVERLAY and ran all
23 tests. No false green was used as support acceptance.

Replay recipe (stdin; no source writes), repeat H=h1,h2,h3-initial,h3-refined:
```js
// node --import tsx --input-type=module; set H in environment
import fs from 'node:fs'; import {createRequire} from 'node:module';
const r=process.cwd(), a='/home/z/.local/share/agentic-animation/art-baselines/'
 +'m2-substep-support-20261013T142251+0800/work', h=process.env.H;
const paths=['packages/core/src/motor/skeleton.ts',
 'packages/studio/src/performance/evaluate.ts',
 'packages/studio/src/performance/types.ts',
 'packages/studio/test/contactContinuity.test.ts'];
const map=Object.fromEntries(paths.map(p=>[p,a+'/rejected-final/'+p]));
map['packages/core/src/motor/index.ts']=h==='h3-refined'
 ?a+'/rejected-final/packages/core/src/motor/index.ts':a+'/motor-'+h+'.ts';
map['packages/studio/src/components/performance/actorPose.ts']=a+'/actorPose-h1.ts';
const read=fs.readFileSync;
fs.readFileSync=function(p,...args){const k=String(p).replace(r+'/','');
 return read.call(this,map[k]??p,...args)};
createRequire(import.meta.url)(r+'/packages/studio/test/contactContinuity.test.ts');
```

## Exact next whole-body proposal interface contract

This is a required implementation boundary, not approved new public DSL/API:
1. **Input:** immutable accepted substep snapshot for ALL actors and carried
   props; dt/time/cue, authored intents, resolved roots/pursuit/separation,
   view/skeleton/scale/world transform and support surfaces. Snapshot root,
   velocity, view/body, anchors/support ownership/targets/sole offsets, gait
   phase, waist/crouch/lean/walk, reach/retract, hold settling/grip/wrist and
   prop position/rotation/velocity/ownership. No retry may leak mutation.
2. **Proposal:** jointly derive all final roots, gait/compression/continuous
   landing (first stride and arrival included), then contact/recovery against
   that exact final body. Output candidate complete state plus deferred contact
   events; preserve old accepted state separately. No post-validation separation
   or post-bake hip edits; mixed legacy/native separation participates up front.
3. **Validation:** shared renderer-equivalent FK in world space for feet/knees,
   palms/elbows and grip/socket/prop, with reach annulus, ground sole height,
   stance anchor drift, Cartesian and angular rates. Validate against last
   accepted state and presentation-frame samples, not only substep endpoints.
   Retain original thresholds (<.02 stance/palm, socket<=1.6px,
   rotation<=3.76deg and default30px/35deg full-chain detector).
4. **Result:** accepted complete candidate, or rejection with violating joint,
   constraint and measured excess. Finite retries reduce WHOLE-body progress or
   schedule a feasible step; on exhaustion retain accepted state and diagnostic.
   No hand-only limiter or independent prop clamp substitutes for validation.
5. **Commit:** atomically publish accepted body/support/contact state for all
   actors, then commit transfer/release ownership exactly once at accepted live
   contact/cue, outside retries. Compiler/evaluator/actorPose carry the same
   accepted support targets. Preserve legacy-only byte-identical tracks and
   canonical cue84 without extra author synchronization calls.
6. **Proof:** jointly restore archived full-chain/support and canonical contact
   cases, including knees10/15 and elbows49/50/55; add separate sole-height/
   reachability and left31–40/47–51 checks. Then 11 canonical frozen-take media,
   duplicate bake, project gates and manual frame/AV/lip QA, followed by fresh
   final acceptance. Support remains blocked until all owning combined AC pass.
