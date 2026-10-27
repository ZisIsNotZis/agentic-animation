# M2 coupled support design and independent limiter review

2026-10-13T14:00:32+08:00 — Fresh specialist/reviewer; read-only source,
sole writable artifact this ticket. Deadline14:20:32+08:00; foreground commands
bounded to120s, at most3 distinct designs, no recursion/services/publication.

## Contract and baseline

Objective: simultaneous actual world-planted support and continuous native
limbs/grip under existing two-call pickup/handover semantics. Preserve M2 art,
contact timing, authored-arm arbitration, persistent hold, free release/putdown,
rest bend branch and all30px/35deg diagnostics. Isolated foot-target success is
not acceptance. No source repair or metric relaxation authorized here.
Leaf: limiter review/coupled design; implementation/media/M2 acceptance separate.
Proof: inspect baseline-to-final delta and rejected prototype; rerun source tests;
in-memory exact-frame reproduction through evaluator/renderer FK, with no disk
source replacement; bind evidence to current hashes and preserve staging.

HEAD4213bc40b64241b500b0d6097cccc585a0dc3eb3 plus inherited dirty/staged tree.
Inherited staged diff SHA256:
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`.
Inputs: WORLD_PUPPET_MOTOR, ART_CHARACTER_M2, WORLD_SUPPORT_REPAIR and
RESIDUAL_INDEPENDENT_REVIEW; frozen bundle
`/home/z/.local/share/agentic-animation/art-baselines/m2-world-support-20261013/`.

| Current source | SHA256 |
| --- | --- |
| motor/index.ts | 3b198fe75017d1eb2f6390005957c7a0d9997a19e261d795f4dac1244b91f12e |
| motor/skeleton.ts | 6d5d1fbbfdfa6b65ae0af7d4a0c603a166fcc20331a92542e516149ce47b411e |
| performance/actorPose.ts | be2d86086ce3da5ce93d3af37dea5291d82f792a2df2319635edc447825f3980 |
| contactContinuity.test.ts | 649fde7376c7c8be27be45bf6aa4f416df2fdfada1509646fc8444be2a153f56 |

Paths: packages/core/src, packages/studio/src/components, packages/studio/test.
Initial `find ... src tests` exited1 (missing root directories); corrected
packages-scoped search found no nearer instructions. No source changes made.

## Evidence and verdict

2026-10-13T14:05:25+08:00 — Independent verification complete.
**PASS: scoped limiter-exhaustion diagnostic delta. NOT support/M2PASS.**
The delta only adds bounded diagnostics and preserves them through bake merging;
no motion/control branch, clamp, threshold or ownership change. Current versus
captured `motor-before.ts` actors/props are deep-equal on held-flip, fixed-front
and large-front controls. One message per actor per simulation is explicitly
bounded, not one message per failure; later failures for that actor are suppressed.

Held challenge: native fixture, x750/ground650/facing−1/scale.88, cup650/650,
50×40, socket(12,−14)/radius1.5; move+grab0/1.6s, right0→left3s, free release6s.
Independent result: `hero at 3.000s; remaining 74.151px exceeds 6.000px`.
Frames71→72 prop x551.96→477.81, y341.55:74.15px unchanged jump, NOT repaired.
Frames73/74/75 steps1.209339/1.206524/1.206027px; palm→reach0,
rotated socket→palm <=.004388px throughout71…75, ownership retained.
Fixed-front.88: no diagnostic. Fixed-front1.6: one2.233s residual6.002px.
Diagnostic exposes exhaustion, not universal720px/s enforcement; root/view and
later integration remain outside it. Bake preservation/quiet-control test passes.

Independent archive verification:365/365 current source hashes and1471/1471
bundle hashes match. Index hashes:
- source-hashes.json: `2fbe50260186ab63424d8899ac33d8e7ddcf3231dfb6ccca404c9e3caddc364a`
- SHA256SUMS.json: `01cea4ecd7c5f2c3c9c9825d596f705584b38c6b03ea1dbd9273fca9292520f3`

Rejected prototype reproduced **in memory**, with archived motor/actorPose,
current evaluator amended in memory to forward worldFootTargets in both actor
projection paths, and detector importing that evaluator/pose. TranspileModule
ESNext/ES2022, absolute file URLs, data-URL modules; node:test replaced by a
callback collector running every archived test. No source replacement on disk.
Result exactly **20pass/3fail** including passing16-way foot support:
- receiver61→62 upper40.041144deg, forearm37.651435deg;
- front-right/−1 pickup15→16 elbow39.038124px;
- canonical front giver12→13 elbow30.116775px and35→36 elbow30.919922px.
Current real tests pass all these cases. First in-memory command failed resolving
bare @anim/core/skeleton from a data URL; corrected via createRequire resolution,
then rerun all callbacks successfully. This error did not alter files or coverage.
Prototype motor: `6c2cd6e69f379b1e1ff90d7e7253d4844b390efedbdc01a5525e4f5f278bdf44`;
pose: `cbfef68cd8a005fbef22f98dc58a1b83a5e498c6abb845e31914a3014edca350`;
tests: `b1335863331f0c68037050ac3c91bf4080a4d3647b5116c4cdd4c2a4798adb4d`.

Actual canonical contact-left/awei world-FK reproduction, ground691.2:
- right stance31…35 x688.669081/719.062744/739.202630/748.045310/748.617621;
  y673.4592, travel59.948540px; fixed31 anchor errors at33/34/35:
  2.752712/20.252712/37.752712px after plantedLegAngles clamp.
- left36…40 travel76.658718px; fixed36 anchor error40:46.108394px.
- stopped root966 left47…51 x958.481698/974.413398/981.091541/976.456889/
  961.916466; travel41.784918px; fixed47 anchor reachable within5e−13px.
Ankle joint is17.7408px above ground, not sole. Image reader:1280×720 left31/48
connected contours/handle contact, not planting proof. No prototype frames or AV QA.

## Root cause and bounded design comparison

Renderer actorPose637…650 synthesizes root-local foot+sine40/lift22 targets;
world mapping adds moving root. plantedLegAngles limits unreachable horizontal
reach, so replacing a target alone cannot plant actual FK. The rejected motor
postprocess changes frame.crouch after contact, wrist/socket and withdrawal were
solved: shoulder moves under an old world palm; arm IK can approach/clamp extension
and accelerate elbow sharply. Its future-frame hip-drop smoothing is not coupled
substep control. The failure is interface inconsistency, not a foot-art problem.
Motor root/pursuit/separation currently execute AFTER hold/retract solving; simply
inserting a gait drop before hold while leaving final root edits outside the
proposal repeats the same class of failure.

1. **Shared substep support/contact proposal — recommended, plausible not proved.**
   Keep persistent world stance anchors and continuous swing landing in native
   actor state. Predict bounded near-term landing from live movement, not a
   post-bake scan. Compute shared leg reach envelope before accepting root/drop;
   effective crouch satisfies BOTH gait minimum and contact posture. Recovery
   returns toward gait minimum, not blindly zero. Solve hand/rest/withdrawal and
   rotated socket from that same accepted body. Validate whole proposal before
   commit; if unreachable, bound root progress or schedule a step rather than
   silently clamping a planted leg. Modest measured compression makes this the
   least timing-disruptive path. Support ownership changes only on liftoff/landing.
2. **Fixed-posture bounded gait/body integration — viable fallback, higher cost.**
   Hold contact posture unchanged; intersect each planted leg's feasible root
   interval, reduce travel/shorten stance or schedule shorter recovery steps.
   Still requires persistent anchors, common final root and contact recomputation.
   At.88 rest, front/quarter/back full horizontal leg range only29.710…30.403px,
   side55.596px versus current95.455px root travel per half-cycle (420/4.4).
   Retaining cadence implies severe slowing; raising cadence needs independent
   limb-rate proof. Can lose canonical cue84/pre-roll unless planning integrates
   achievable travel. Do not choose merely to avoid12px of compression.
3. **Renderer-only authoritative-foot option — rejected for this contract.**
   A pure renderer can consume motor-owned targets, but cannot independently
   establish support or lower hips while preserving motor shoulder/socket truth.
   Fixed hips fail above37.75/46.11px anchor FK checks. Replaying gait state in
   rendering duplicates simulation; shifting torso/root there changes collider
   truth. Stateless leg IK is part of1/2, not a third physics authority.

## Exact cohesive worker contract (recommendation, not implementation proof)

Deliver native motor-owned support AND unchanged contact/limb continuity through
canonical two-call pickup/handover; no new author calls or defaults. Single owner
covers motor/index.ts, shared motor/skeleton.ts geometry, evaluator/types,
actorPose, source-named tests and owning motor/M2 docs. No independent concurrent
writers at these interfaces. Compiler already carries ReturnType bakeSceneMotor;
verify serialization preserves added optional native support fields. Leave old
assets/legacy-only motor behavior unchanged; no schema/DSL fork or broad rewrite.

Interface: one spelling `worldFootTargets` for world-stage l/r joint targets,
with motor-private stance/swing ownership; optional bake ownership markers only
if needed to prove support transitions. MotorActorFrame→both evaluate projections
(including actorAtFrame for bindings)→EvaluatedActor→actorPose→shared leg IK/FK.
Coordinates map with selected native view, scale and mirror exactly once.
Shared reach-envelope helper must report infeasibility (full two-bone annulus,
not sqrt(max(0,…)) masquerading as reach). Preserve rest bend and separate sole
height offset; never count a clamped target as an achieved anchor.

Native substep sequencing: establish candidate final root including pursuit,
adjacency/separation and active geometry; advance support/drop; resolve posture,
reach/rest/retract/held wrist/socket on that body; validate and accept together.
No root correction after accepted contact without recomputing it. Retain finite
retry bounds; snapshot all changed support/body/hand/prop fields for proposal
rollback. Commit transfer/release ownership ONCE after live contact/cue, not
inside speculative retries; handle giver/receiver ordering deterministically.
Do not silently reopen release or irreducible-view behavior to meet walking AC.

Falsifiable full-interface AC, all required on the SAME final revision:
- Real renderer FK stance displacement <=.02 stage px per consecutive planted
  sample, continuous onset/stop/wrap, both travel directions and eight fixed
  orientations. Include exact left31…40/47…51 and16-way moving/resting paths.
  Stance cannot be evaded by relabeling every sliding sample swing: maintain
  ground support while walking and both planted feet after completion. Verify
  anchor equality AND IK reachability AND actual shoe-sole height separately.
- Default30px/35deg detector: no introduced native root/limb/prop snaps, including
  knees/feet; no walking exemption. Rejected prototype frames62/16/13/36 must be
  green jointly with support checks. Test held walking, pickup bend, loaded rise,
  giver/receiver transfer, free release, putdown and rest/withdrawal deletion.
- Drawn palm→baked reach <.02px, rotated socket within declared contact radius
  (canonical radius1.5px, existing1.6px numerical test ceiling), continuous
  rotation<=3.76deg/frame. No independent object clamp, lost grip, early transfer,
  timeout hold, remote bind or mandatory raise/reposition/sync calls.
- All11 canonical manifests: recipients first hold84 for cue3.476644s, zero
  arm/prop warnings; preserved explicit arm claims/exit and free/place semantics.
  Loaded canonical props<=30.01px/frame, unloaded rendered withdrawal<=20.01px;
  assess final accepted body, not only targets. Existing held-view diagnostic
  remains bounded/contact-preserving; do not claim its74.15px jump was repaired.
- TDD red support plus coupled counterexamples before implementation; typecheck,
  test:all, smoke, Python parts/study tests and diff-check all green. Deterministic
  duplicate bake equality; exact source/manifests/audio hashes, frozen-take reuse.
- Regenerate affected canonical media; inspect frame triplets around above failures,
  onset/stop/wrap, grips/contours/sole, then actual real-time motion/audio/lips.
  Fresh independent final artifact review required; no M2PASS from unit gates.

Bounded next worker: one cohesive leaf,30min initial implementation/proof budget,
foreground commands<=120s, no recursion/services/publication/audio regeneration.
Checkpoint failed AC and next distinct hypothesis at budget; never lower metrics
or present partial tests as M2 acceptance. Switch1→2 only with recorded evidence
of infeasible coupled envelope/timing; scope expansion routes to parent authority.

## Commands and limits
Independently ran `timeout 60 node --import tsx --test
packages/studio/test/contactContinuity.test.ts packages/core/test/nativeSkeletonPose.test.ts`:
24pass/0fail. `timeout 60 npm run typecheck`: pass;
`timeout 100 npm run test:all`:216pass/7skip; `timeout 90 npm run smoke`: pass.
Three bounded node/tsx heredoc probe families: archive checks + prototype rerun
(120s), baseline/current diagnostic + canonical FK (90s), leg envelopes (30s).
First prototype import failure disclosed above; corrected run completed all tests.
Scoped diff-check passed. Python logs hash-verified only, not independently rerun.
2026-10-13T14:09:01+08:00 — Final source/staging hashes unchanged; no new
source/tests/staging/jobs. Implementation feasibility, coupled media and M2
AV/art/user acceptance OPEN; not whole-objective impossibility.
