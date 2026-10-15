# M2 STATUS documentation repair

## Scoped contract

- Input: independent blockers in [readiness ticket](M2-DOC-READINESS.md).
- Interpretation: STATUS is a current milestone router, not a chronological
  evidence log or a second motor specification. Motor slices 3–4 remain pending;
  shipped orientation/fabric is separate. Geometry is owned by skeleton data and
  `packages/core/src/motor/skeleton.ts`; `figureGeometry.ts` does not exist.
- Scope: repair STATUS, preserve its removed historical text here, and link this
  record from the readiness ticket. Preserve all other dirty/staged work and
  historical assets. No code, commit, publication, deletion or M2 acceptance.
- Recommendation: replace baseline/runtime/Visual-QA history with owner references,
  retaining current status facts without repeating implementation or evidence.
  Alternative (renumbering motor slices) contradicts the owner and is rejected.
- Acceptance: no Slice 3 orientation claim or nonexistent geometry reference in
  STATUS; baseline/QA/motor history retained only in ticket records; local links
  and anchors resolve; scoped Markdown below 200 lines; diff whitespace passes;
  typecheck, tests and canonical smoke rerun with bounded deadlines.
- Leaf decision: cohesive docs-only repair, no delegation; one edit/check pass
  with a correction pass if needed. Fresh integrated independent review must
  precede M2 continuation; worker self-proof is not that review.
- Baseline: HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3`; STATUS SHA256
  `927b8c4accf9ff3f681708a4b0cb3e9edacd7b4ad0ffc0f639f4410d45c188b1`.
  Inspected INDEX, STATUS, motor owner and independent findings before changes.

## Revision-bound self-proof

- At HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3`, final STATUS SHA256:
  `9aa8f6ce8c71fd69b40539f2ae678b9e87084df4ae2c043872a7fdc15a83b355`.
  Readiness ticket (including repair pointer) SHA256:
  `c8048c4e0bf1a54533e38e1c48f1fa8b9456346c2ef219d64d21ba6bc44c9f6b`.
  Motor owner unchanged:
  `fb7233212b52550961191ad47017d08f40865ee91ef7a586a0bbfb5f2ddd6b91`.
- `timeout 120 npm run typecheck`, `timeout 120 npm run test:all` and
  `timeout 120 npm run smoke` each exited 0. JS: 184 pass, 7 skipped, 0 fail.
  Disposable logs: `/tmp/m2-status-{typecheck,tests,smoke}.log`.
- Python local-link/heading validation passed for STATUS, INDEX, motor, M2,
  roadmap and both readiness/repair tickets; each remains below 200 lines.
  STATUS assertions exclude the nonexistent geometry path, obsolete slice label
  and historical evidence bullets. An initial overly broad history assertion
  matched the routing phrase “Visual-QA rounds”; the corrected bullet assertion
  passed without changing the artifact. No acceptance was lowered.
- Inspected scoped STATUS diff against HEAD and actual pre-edit STATUS. Current
  art-quality facts and deferred backlog are retained; duplicate engine contract
  details route to their owner. Removed baseline/runtime/showcase history is
  preserved verbatim below, including explicitly obsolete terminology.
- `git diff --check` passed. Only STATUS, the readiness pointer and this new
  repair ticket were written by this repair; existing source, staged vendor,
  owners and historical assets were not edited. No rendering/audio/video QA or
  whole-M2 runtime acceptance is claimed by these documentation checks.
- Handoff: **ready-for-review**, not independently accepted. Main must route a
  fresh integrated documentation review before M2 continuation; use current
  hashes and the readiness ticket's blockers, not this completion claim.

## Preserved STATUS history

The following is historical provenance, not current implementation/evidence
acceptance. Paths and numbered labels below are preserved verbatim from STATUS;
its obsolete geometry path and orientation Slice 3 label must not be used as
current contracts. Current motion ownership remains WORLD_PUPPET_MOTOR.

- Earlier baseline checks that passed: `npm run typecheck`; `npm run test:all`
  with 128 passed, 7 skipped, 0 failed; all three episode validation commands;
  `npm run skill:audit`; and `git diff --check`.

## Step 3 verification evidence (plugin-host runtime)

- All three episodes validate and pass `anim check` (liu-secret 3 scenes/10 takes, bailan-system 10/167, ai-work-adventure 10/268).
- All three compile fresh performance manifests under /tmp; manifests show paired lifecycle events and normalized staging/camera geometry with no out-of-range values.
- The canonical pipeline reaches and completes the Remotion input stage: a 2-second `render-yaml` of liu-secret rendered 48 frames in /tmp. Frames were inspected manually and match the checked-in golden MP4 scene (school corridor, correct actors and staging) after fixing the renderer to resolve location scenes from `resolved.identity`.
- `npm run typecheck`; `npm run test:all` 140 passed, 7 skipped, 0 failed; `npm run smoke`; `npm run validate:episode-yaml`; `npm run skill:audit`; `git diff --check` all pass.
- Checked-in MP4s are byte-identical to HEAD (never regenerated).

## Explicitly preserved

Existing checked-in MP4 files remain untouched. Generated audio, video, manifests, screenshots, caches, and temporary QA artifacts remain outside the source change set.

## Backlog (deferred; not required for the closed milestone)

Ideas recorded but intentionally left undone. They are optional extensions, not
engine prerequisites:

- Per-frame plugin-owned canvas behavior (`run()` bodies beyond identity).
- Bailan visual asset upgrade: three distinct outlined character puppets,
  repointed cast, upgraded cultivation/arena sets.
- Optional `render-yaml` of a full episode as a showcase; not needed to render
  demos, since the engine is what this repository ships.

## Showcase evidence (evaluated invocations, particle category)

- Seven minimal showcase episodes under `episodes/showcase-*` (docs/SHOWCASES.md): states, action timing overrides, camera/movement, effects+lifecycle, props, voice/music, and the special `showcase-snow`.
- New `particle` category: `particle.snow({count, seed, durationSec})` — deterministic seeded snowfall rendered by a new `Snowfall` component (vfx style `particle-snow`); `music.xuehua` loops a synthesized pentatonic 《一剪梅》 homage cue (7.25s wav under `library/music/cues/`, gitignored like all library audio — regenerate with any synth or drop in a licensed take).
- `showcase-snow` verified end-to-end: 14s render, full-bleed frame, BGM + 4.9s edge-tts scream + shiver audible across the timeline, subtitles clean in both the burned-in overlay and the soft mov_text track, awei visibly crying (tears) while collapsed. An independent fresh-context visual QA pass compared rendered frames against each episode.yml.
- Bundle staleness fixed: the Remotion webpack persistent cache served stale component code after source changes (silently rendering outdated faces/framing); bundling now runs with `enableCaching: false`.
- Visual-QA follow-ups (reviewer-confirmed): props project from scene staging (thermos/screen exist, sized, positioned); prop bindings carry objects at hand height through pickup→handover→putdown (chronological bind/release state + default hand sockets for figures without declared anchors); `action.push` visibly displaces its target (dx/dy transform deltas); `movement.to` eases the mover and only `transform` tracks project position (movement phase tracks caused the visible oscillation/jumps); `emotion.crying` renders tears; the audio segmenter shares the compiler's depth-aware brace scan so nested call arguments never leak into TTS text or subtitles; `make` prints `[make] teleport warning: ...` for implausible actor jumps (all ten episodes lint clean).
- Puppet motor (docs/WORLD_PUPPET_MOTOR.md, slices 1-2): compile-time deterministic simulation replaces imagined motion for push/move — support, contact-gated force (the hand must reach the target before it moves), reaction lean, prop friction. Trajectories bake into `scene.motor`; the renderer is a pure lookup; motor actors are exempt from repel. `action.push`/`movement.to` re-authored as motor intents; contact-before-motion asserted by test and verified in showcase-actions frames (aqiang walks into range, arm contact, awei staggers).
- Visual-QA round 2: motor body separation (actors cannot share ground; pursuit halts at adjacency — the collider now matches the visual 400px body); prop bindings ease the object from its resting spot into the hand (no teleport snap); vfx bind points (`bind: "head" | "hand_r" | ...`, with actor-subject fallback so emotion effects originate at the acting body); rhubarb lip sync wired end-to-end (vendor binary resolution fixed for isolated cwds, take-level visemes correlated into speech events, viseme-driven mouth in the face rig — the mouth articulates the real audio; edge-tts renders 啊-repetition as discrete syllables, so a fully held scream needs held-vowel audio direction).
- Visual-QA round 3: camera transform composition fixed (translate-then-scale made camera x/y screen-space offsets, so zoomed-out pans leaked the background void; now scale-then-translate matches the documented viewport-top-left semantics) plus an every-frame camera clamp to the painted stage and a `[make] camera overflow warning` lint when a camera key demands out-of-background space; motor geometry now shares the renderer's skeleton (arm reach 286px, body half-width 200px, scale-aware) so push contact matches the drawn hand; prop pickup emits a motor approach and bindings are proximity-gated with eased lift and eased release drop — no prop teleportation.
- Visual-QA round 4 (physics honesty): figure geometry got a single source of truth (`packages/core/src/motor/figureGeometry.ts`) consumed by both the drawn SVG and the motor collider, so the push hand physically touches the target body; prop placement was unified into one recursive physical authority in `propState` (chained lifts from wherever the prop actually was, hold-past-expiry, explicit-release drops, distance-scaled lift/drop windows) and the old snap paths were deleted — the dry-run lint (`[make] sudden-move warning`) plus `scripts/keypoints.mts` report 0 discontinuities across all showcases; handover now walks the receiver to the giver (motor intent `actor` field); name labels no longer mirror on flip; 45-degree facing shipped as actor orientation + procedural quarter-front/back views with `pose.orient` (decision recorded in docs/WORLD_PUPPET_MOTOR.md).
- Visual-QA round 5 (debug overlay + real grabs): physics debug overlay shipped (`ANIM_DEBUG_PHYSICS=1`) drawing figure/ground/collider/hand-anchor/reach/prop-boxes onto the video, which immediately exposed the real root cause of "hands never touch": the figure div was positioned at `actor.y - 720*scale` while its bottom-edge transform origin puts the drawn ground at `top + 720` — every figure stood 720*(1-scale) below its physics ground. Fixed (baseY = actor.y - 720). Props now use true grab semantics (wait until the hand arrives, follow the hand, grip seats, transfer at hand contact), the motor bakes reach-down/grip/stand-up hand trajectories, and the drawn arm aims at the motor reach point via analytic two-bone IK (figureGeometry.solveArmIK). 45-degree facing delivered with rendered examples: quarter-front (both sides) and back views in showcase-actions, sheet at .scratch/orientation-sheet.png, push-contact evidence at .scratch/push-contact-debug.png.
- Slice 1 (one body, real touch): figures declare skeleton.json data (joints, part shapes, arm lengths, waist) consumed by a generic FK in core — the drawn puppet and the physics share one kinematic model; the figure-ground alignment bug (figures stood 720*(1-scale) below their physics ground) is fixed; props render bottom-anchored at their declared base line; the thermos stands on the canteen counter via declared support surfaces (`on(counter)`), the motor bakes waist-bend reach trajectories, and grab = hand circle ∩ object box (GRAB_RADIUS deleted). Grip/bend rework: the grab aims at the object's box center, the waist bends only to the smallest pitch that lets the extended hand touch the declared body box (either lean direction), the touch gates the grip, and the stand-up blends the hand continuously to the carry anchor — the 98px discontinuity is gone (lint 0). The handover receiver's move carries `grab` and the carried prop rides the hand inside the simulation, so the receiver's touch tracks it live. Prop placement data (base/body/size/stageWidth) flows from prop manifests through the registry; the touch box is the declared drawn-body bounds, not the art frame. Evidence: thermos on counter with lin's hand on it (frame-verified).
- Slice 2 (contact push + balance): push force conducts only through hand-circle-on-torso contact every substep; the pushee staggers through their own foot friction and the balance controller takes recovery steps (capture-point stepping, thresholds from figure skeleton.json `balance` data) with baked step markers; a sustained shove past step capacity travels far — fall poses are future work, the two regimes are already dynamically distinct. action.push takes a force argument.
- Slice 3 (views + fabric): eight orientations from five drawings (front, back, side, quarter-front, quarter-back + mirrors) with pose.orient accepting all eight; validation sheet committed (.scratch/orientation-sheet-8way.png) and a pixel-difference gate over adjacent views (min 0.068 > 0.01); seeded algorithmic fabric weave on robes (per-figure hatch angle/density/opacity, deterministic, figure-local).
- Known minor issues: same-role figures share one palette (cosmetic); a scene-bounded expression may flip to neutral right at a following action track's end boundary (sub-second, after the line); glitch scanline art spans the full frame by design while the error box targets the screen.
- Camera fix: the performance camera div scaled about the wrong origin (composition center instead of stage top-left), shrinking the stage inside the frame and exposing black bands around every set; `containCamera` also allowed zooming out past the stage fit. Both fixed (`transformOrigin: "0 0"`, zoom floor + viewport clamped to the stage). liu-secret re-render verified full-bleed; the checked-in golden MP4s predate the fix and still show the old banded framing.
- Compiler: brace groups now parse nested object literals (`splitDialogue`/`inlineTokens` are depth- and quote-aware); the spread override form `{...call(args), durationSec, mode}` evaluates as real JS with body duration validated against the factory declaration (`declaredSec`).
- tts-edge retries now log each failed attempt and the final success to stderr.

## Fresh integrated independent review evidence

- Verdict: **PASS for documentation handoff only; M2 remains unaccepted.**
  Fresh reviewer inspected complete INDEX, STATUS, DECISIONS, PIPELINE, SCHEMAS,
  plugin/motor owners, roadmap, M0/M1/M2 and both tickets, plus STATUS diff.
  Root/project Proof and review and Documentation policy applied; no repairs.
- Original three findings resolved: stack is not installed-capability evidence,
  motor orientation is separate from pending slices 3–4, M2 budget routes to the
  roadmap anchor. Both STATUS findings resolved: current router uses the same
  slice semantics; obsolete geometry and baseline/QA chronology are retained as
  explicitly historical ticket evidence, not live STATUS contracts.
- Binding: HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3`; independently computed
  all eleven owner hashes match readiness evidence plus repaired STATUS hash
  above. Pre-review ticket hashes: readiness `c8048c4e0bf1a54533e38e1c48f1fa8b9456346c2ef219d64d21ba6bc44c9f6b`;
  repair `34a34b2cb8003e6c6d610780b4a1c4e0c048db9b4f4d4934c6d05c077be750a1`.
- Independent Python local-link/heading checks pass for all thirteen scoped
  documents; all remain below 200 lines. `git diff --check` passes. Archive and
  workspace directories exist; source symbols confirm native registry/compiler/
  evaluator/ArtFigure seam and skeleton authority, not production correctness.
- No test gates, archive integrity, media inspection, playback or listening rerun;
  runtime proof is not upgraded by this docs-only acceptance. Existing source and
  media mismatch limits remain explicit. Only review evidence in tickets written.
- Continue routine M2 work under its entry/recovery contract without reopening
  met identity/direction gates. User-only gates remain actual milestone judgment
  and production asset-path approval before dependent default replacement;
  publication, material spending/external services and safety changes need authority.
