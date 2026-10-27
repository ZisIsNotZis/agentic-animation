# M2 contact continuity — bounded engine package

## Contract and baseline

2026-10-13T11:00:52+08:00 — Worker began a 25-minute single-writer leaf.
Goal: remove implicit instantaneous reach/retraction in generic grab/transfer/
release, and expose visible joint/angle jumps rather than hiding them on flips.
Canonical episode YAML, frozen audio, original assets and production defaults
remain unchanged. No commit, staging, external service or destructive cleanup.
HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3` plus existing dirty candidate.
Baseline motor SHA256 `672cfa19d576abaa97fb433eaf85aaad78be89b70e7b3119d333a2d7dde224a1`;
detector `7e6b2b5e10d58f66814afeeb24c374217be02c7ade993fbb351675384cad847d`.
Pre-existing staged diff SHA256
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`:
.gitmodules and vendor gitlinks; preserve all staged work. No clean baseline.

## Interpretation, recommendation and ownership

Observed source binds using hypothetical fully extended hands, clears giver reach
on transfer, and clears native reach on release. Detector samples only roots and
props at 60px and suppresses all jumps if ANY actor flips. These mechanisms can
hide the user's observed arm defects. Recommend rate-limited actual hand travel
and persistent retract state, with renderer-FK diagnostic sampling. This is a
reusable motor correction, not a clip patch. A full socket/orientation/depth and
cue-before-preparation planner is a separate cohesive next package; it cannot
honestly be proven within this leaf's finite budget. No requirement is lowered.

Multi-seam coverage: motor owns hand approach/contact/retract; canonical bake and
evaluator carry existing reach fields unchanged; renderer owns visible FK used by
diagnostics; CLI consumes existing warnings. Worker is sole writer and integrator
for motor, detector, tests and these owner-doc amendments. No recursive split or
parallel writer; parent owns independent review and remaining M2 integration.

## Quantified acceptance and proof

1. Grab binds only on actual moving hand contact, not possible future posture.
   Existing native orientation/pickup regressions remain green.
2. Approach/retraction use finite hand speed (480 stage px/s); transfer/release
   preserve last hand target, retract without an immediate disappearance, then
   return to resting state. TDD reproduces abrupt first-frame/transfer/release.
3. Diagnostic samples rendered skeletal joints, actor/prop rotation and prop
   positions every frame. Default translation threshold 30px/frame, angle 35deg;
   explicit threshold override remains supported. No global flip exemption.
   Tests prove joint-only jumps and unrelated prop jumps during a flip detected,
   smooth movement not reported; absent actors excluded.
4. Run scoped tests then typecheck/test:all/smoke/Python/diff-check within bounded
   commands. Record outputs and final hashes. Independent review remains pending.

Open higher-level AC: handle grip socket (not center), live relative prop
orientation/depth, exact cue transfer with sufficient pre-roll diagnostic,
automatic bilateral preparation, regenerated affected media and actual AV QA.
No full-M2 PASS is possible from this package. Rebound remains backlog-only.

## Durable checkpoint

2026-10-13T11:14:55+08:00 — Worker checkpoint before 15 minutes. Motor approach/
withdrawal and renderer-FK detector implemented; targeted tests and full suite
passed (194 pass/7 skip before two extra detector cases). Root/studio typechecks,
smoke and 22 Python tests passed. Source checks remain to rerun after final fix.
Scoped red proof reconstructs motor bytes exactly to recorded baseline hash;
three regressions fail against baseline motor/detector and pass against candidate.
Evidence currently in ".scratch/m2-contact-continuity/"; synthetic actual-draft
render challenge at "/tmp/m2-contact-continuity-proof/". It is not canonical
media, audio or handle/depth acceptance. Two sheets were manually read.
Rendered/diagnostic inspection found native rest-branch snap on withdrawal:
receiver elbow 40.46px / 37.18deg at frame110. New regression is RED: solveReach
forces positive elbow bend despite draft rest geometry's negative bend. Next
immediate action: derive IK branch from rest geometry, rerun challenge and gates,
archive exact source/evidence and hand off fresh review. Socket/cue/depth AC remain
unmet; no milestone PASS or whole-objective failure. No jobs left detached.

## Final leaf evidence and review scope

2026-10-13T11:19:58+08:00 — Worker completed bounded mechanical implementation, NOT
full contact-model/M2 acceptance. Continuous actual-hand approach and outgoing
withdrawal are generic; withdrawal decelerates with 0.1s settling to avoid an
endpoint elbow whip. Rest-bend branch is independent from mirrored rest-vector
side in shared IK. Existing callers keep their default solve. Native release
regression now checks ownership/contact clear immediately, reach clears after
natural withdrawal; its prior immediate-reach-clearing assumption contradicted
the confirmed user contract. No ownership timeout or implicit drop introduced.

React-free actorPose.ts is the exact prior pose/FK body (verified byte equality
against matching archive after four export-visibility changes), re-exported by
Actor.tsx. Detector and renderer share that source, with no copied pose solver.
Detector now samples every joint, segment angle, root/prop rotation and prop
position, retains threshold override, excludes invisible actors and never
suppresses motion due to another actor's flip. Six added tests cover travel,
transfer/release recovery, joint-only snap, flip masking, sub-60px movement,
angle wrap/smooth movement, invisible actors and native negative rest bend.

Final commands (each bounded): root typecheck 180s, studio tsc 90s,
test:all 180s: **204 tests / 197 pass / 7 skipped / 0 fail**;
canonical smoke 120s: check/make pass, 0.55s isolated manifest;
Python study/parts 60s: 22 pass; git diff --check: pass. Earlier test:all
failure was the source-inspection assertion still looking in Actor.tsx after
pure extraction; updated to inspect its owning actorPose.ts, not removed.
New rest-branch regression reproduced RED before branch correction. Three
baseline regression cases fail against hash-matched original sources, then
pass against candidate; baseline execution only relocates imports.

Actual draft challenge was rendered with local headless Chromium and manually
read as PNG sheets at frames 0/50/51/108/112/140 and 49/50/51/52/108/109.
Final contact/release sheet shows connected limbs and visible withdrawal, and
final detector reports **zero shoulder/elbow/hand positional or angular warnings**
in that challenge. Initial endpoint defect was repaired and sheet re-read.
These are synthetic motor intents with a small rectangular diagnostic prop,
NOT canonical authored media, cup-handle proof, full art acceptance or audio QA.
Detector still flags large gait-joint steps and gravity-driven falling distances;
those advisory thresholds are not proof of teleport or full physical validation.
A CLI screenshot attempt timed out at 45s; bounded Remotion CDP capture succeeded.
An initial CDP result-unwrapping error was corrected; no service/focus action.

Fresh independent review must cover motor actual contact/retract, shared IK branch
compatibility, pure extraction/re-exports, detector false positives/coverage,
new and updated regressions, docs and proof hashes. No self-review substitutes
for that gate. Pre-staged diff hash remains identical; Worker staged nothing.

## Critical-path continuation (not a user stopping gate)

Next cohesive engine package: prop-local handle grip sockets through schema,
registry/staging, motor bind/hold and renderer depth/orientation; pre-cue bilateral
preparation planner and explicit infeasible-pre-roll diagnostic. Keep pickup +
handover as two semantic calls and release one; no coordinates/sync boilerplate,
new DSL or production default replacement. Extend detection/tests to real grip,
relative orientation and contact depth. Then regenerate affected canonical
contact/orientation/acting media with frozen audio; perform fresh independent
package/integrated acceptance and real-time AV review, then user M2 judgment.
Open AC are not PASS and budget exhaustion is not whole-objective failure.

2026-10-13T11:21:09+08:00 — Final source gates rerun after IK definition comment: root/studio
typechecks and test:all remain green (197 pass/7 skip); diff-check green.
Immutable leaf source/log/synthetic proof bundle: `/home/z/.local/share/agentic-animation/art-baselines/m2-contact-continuity-20261013T032109Z`.
`source-hashes.json`, `scoped-runtime.diff` and `SHA256SUMS.json` bind review.
