# Project status

## Engine milestone

Status: **closed (engine milestone)** — the plugin-host engine is implemented
end-to-end; three demonstration episodes validate, compile and render through
the canonical YAML pipeline. Deferred backlog does not block engine usability.
The canonical engine contract is [WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md);
[tickets/PLUGIN_HOST_MIGRATION_PLAN](tickets/PLUGIN_HOST_MIGRATION_PLAN.md) is historical reference.
The supported production workflow is owned by [PIPELINE](PIPELINE.md).

## Art-quality work

The approved [M0–M8 roadmap](ART_PRODUCTION_UPGRADE.md) remains active.
[M0](ART_BASELINE_M0.md) is a complete known-defective comparison capture, not
production approval. [M1](ART_DIRECTION_M1.md) is accepted with B selected and
A/B/C preserved. **M2 milestone judgment is met:** the user accepted the current
candidate (“我感觉没啥问题，自动推进”) at the trusted `m2-facial-object-20261014T0010`
entry; he did not itemize listening/lip-sync. On 2026-10-16 he opened the
production-path gate for `figure/lin_b_draft` only (“old characters shall still
be there, just not the top choice”): it is now the preferred production figure
via the figure category manifest `use` recommendation, while old figures stay
installed. No publication or spending was approved. Facts and accepted-revision
binding:
[tickets/M2-MILESTONE-ACCEPTANCE.md](tickets/M2-MILESTONE-ACCEPTANCE.md).
Current M2 evidence, remaining limits and next actions are owned only by
[ART_CHARACTER_M2](ART_CHARACTER_M2.md).
Task history and independent documentation findings live in the
[readiness ticket](tickets/M2-DOC-READINESS.md); historical STATUS evidence is
preserved in the [STATUS repair ticket](tickets/M2-STATUS-REPAIR.md).
M3–M8: M3 is delivered and judged met — the user said “Looks good enough” at
the gate bundle `m3-20261016T2305+0800`
([tickets/M3-MILESTONE-ACCEPTANCE.md](tickets/M3-MILESTONE-ACCEPTANCE.md));
`set/canteen_counter_m3` now backs the canteen scene in `showcase-props`,
while every legacy set stays installed. One M3 criterion was honestly failing
and routed onward: the putdown is geometrically on the painted top but
occluded by the clustered receiver
([ticket](tickets/BACKLOG-M5-PUTDOWN-VISIBILITY.md)). M5 WP3 closes it on
`episodes/m5-acting`: the rest is clear of the bodies with the carrying
step-back and shaped placement (measured in [ART_ACTING_M5](ART_ACTING_M5.md)).
A fresh image review of the WP3 evidence set failed three hard defects — the
two actors' drawn bodies colliding at the handover, the placed prop resting one
pixel high with the report comparing its anchor, and the pickup/point poses
folding instead of acting. All three are closed at their causes (drawn-body
separation, the scaled prop solid on the painted line, least-pitch grab
postures and a shaped, completed point) and pinned by
`packages/core/test/actingInvariants.test.ts`. M5 remains at its own gate. M4 is delivered and awaiting the
user's milestone judgment: the materials/light treatment composites with
non-luminance blend modes (`color` for pigment, `soft-light` for both light
passes), so ink contrast is 0.964–1.063 in all eight regions with no matte,
cut-out, tiled texture or raised layer, and the fifth perceptual review returned
ART PASS ([ART_MATERIALS_M4](ART_MATERIALS_M4.md)). Cost is measured, not
assumed: +65% wall time over the M3 baseline (53–70% across three sessions) at
concurrency 4. Routed onward: cross-session render non-determinism
([ticket](tickets/BACKLOG-RENDER-NONDETERMINISM.md)), and counter/floor staging
depth plus vector-puppet joint stiffness at the handover (M5).
M5 is delivered and awaiting the user's milestone judgment: `episodes/m5-acting`
performs six beats (pickup, handover, putdown, point, surprise, push) with
anticipation, accent and settle, and the third perceptual review returned
ACTING PASS on corrected evidence ([ART_ACTING_M5](ART_ACTING_M5.md), bundle
`m5-20261017T225432+0800`). Acting shapes are additive motor-intent data
(`anticipation`/`accent`/`settle`, defaults 0) — 11 existing episodes re-bake
byte-identically — and three invariants now guard the class: no actor-body
overlap, a placed prop's base on its declared support, and joint angles inside
their documented envelopes.
M6 is delivered and independently reviewed PASS at revision `fb5baa6`, and its
object insert (13.10 s) was rebuilt as a prop insert after the viewer could not
tell what that shot was looking at: the beat now authors its own zoom and the
camera frames a prop on its declared silhouette
([ART_FILM_LANGUAGE_M6](ART_FILM_LANGUAGE_M6.md) owns the contract, defect 5;
evidence bundle `art-baselines/m6-20261018T0840+0800/`). It awaits the user's
judgment. M7 is delivered and independently reviewed PASS at revision `8f8f1e8`
([ART_TRANSFER_M7](ART_TRANSFER_M7.md) owns the transfer table and the three M8
prerequisites; bundle `art-baselines/m7-20261018T110236+0800/`). Three defects it
found were general and are fixed: prop art follows the declared asset, debug name
plates are gone from the frame, and the head rule no longer applies to person
shots. The asset programme is the current work: three independent slices (badminton rally,
bar swing, pouring tea), each with genuinely new native assets — four new figures,
three new sets, new props — under [ART_ASSET_PROGRAM](ART_ASSET_PROGRAM.md), which
owns the capability contract, the file ownership and the wave order. M8 is planned,
not delivered. The M7 review also established the decisive blocker:
the legacy puppet figures (`aqiang`, `elder`, `awei`, `liu`, `lin`) have no
articulated posture, so any contact beat with them lifts the prop while the figure
never bends; a compile warning now reports it. Acting requires native artwork, and
`lin_b_draft` is the only native figure (ART_TRANSFER_M7).

## Rescue of lost M2 work (in progress 2026-10-17)

The remote branches carry nothing; the archives' `workspace/library/` overlays
carry the delta. Consequential loss: all cue audio, the thermos handle `grip`
declaration, and the eight orientation QA episodes. Inventory, homes and
acceptance: [RESCUE-LOST-M2-WORK](tickets/RESCUE-LOST-M2-WORK.md).

## Open acceptance carried from M2 (user-raised 2026-10-17)

Carried-prop grasp: handle socket instead of centre, live prop orientation
while held, a grasp hand shape, and knee flexion under crouch. Recorded as open
M2 acceptance that was routed as "the next engine package" and then overtaken by
M3–M5 — not a regression, but a criterion that fell out of sight. Owning
register: [OPEN-CARRIED-PROP-GRASP](tickets/OPEN-CARRIED-PROP-GRASP.md).

## Motion and demonstrations

Motor slices 1–2 are shipped, vocabulary migration (3) is delivered:
seven actions (bow, nod, shiver, point, raise_hand, dismiss, think) are motor
intents with their regex pose paths deleted, independently reviewed at
`d863f96`. Falls (4) are shipped: failed recovery cuts balance for a
balance-cut collapse (trigger, contract and limits owned by
[WORLD_PUPPET_MOTOR](WORLD_PUPPET_MOTOR.md#slices)). Eight-view
orientation/fabric is shipped separately, not motor Slice 3.
Motion implementation, geometry authority and scoped evidence are owned by
[WORLD_PUPPET_MOTOR](WORLD_PUPPET_MOTOR.md), including its
[body geometry contract](WORLD_PUPPET_MOTOR.md#body-geometry-ssot-drawn--collider).
Demonstration coverage and usage are owned by [SHOWCASES](SHOWCASES.md).
Historical validation counts, runtime checks and Visual-QA rounds are retained
in the repair ticket, not treated here as final-revision acceptance.

## Preservation boundary

Existing checked-in MP4 files remain untouched. Generated audio, video,
manifests, screenshots, caches and temporary QA artifacts stay outside the
source change set. Demonstrations are not finished commercial productions.

## Deferred engine backlog

Optional extensions, not prerequisites for the closed engine milestone:

- Per-frame plugin-owned canvas behavior (`run()` bodies beyond identity).
- Bailan visual asset upgrade: three distinct outlined character puppets,
  repointed cast and upgraded cultivation/arena sets.
- Full-episode showcase `render-yaml`; not required for rendering demos.

## Restart point (2026-10-18 — historical; see ART_ASSET_PROGRAM §Current facts)

This section is a dated snapshot, not the current state. Where it disagrees with
[ART_ASSET_PROGRAM](ART_ASSET_PROGRAM.md) §"Current facts", the programme document wins:
E2, E4, EP and EA are landed since this was written, slice A's independent review answered
`NOT SATISFIED` (`tickets/S-A1-ER-REVIEW.md`), and the repair workset was dispatched on
2026-10-21 — R1 (the projectile's ground) is in the tree. The milestone is not reached until
a fresh reviewer passes the re-rendered stills.

The work is being resumed elsewhere. This is the exact state, so nothing has to be
re-derived.

**Green and pushed:** `main` at the asset-programme commit below, 313/313 tests.
Milestones M0–M7 are delivered; M6 and M7 carry independent viewer PASS verdicts
([ART_FILM_LANGUAGE_M6](ART_FILM_LANGUAGE_M6.md),
[ART_TRANSFER_M7](ART_TRANSFER_M7.md)).

**Slice A (badminton) — assets complete, engine half landed.** Accepted and reviewed:
`set/badminton_hall`, `figure/athlete_a`, and the props `racket`, `shuttle`,
`high_bar`, `teapot`, `teacup`. **E1 projectile with a struck contact landed at
`2836478`**: the fail-loud gate now guards `prop.kind` and `support.kind` as well as
intents, `prop/shuttle` declares its physics, and the bake carries
`projectile.struck` / `projectile.settled` with the measured numbers in
[ART_ASSET_PROGRAM](ART_ASSET_PROGRAM.md). Still missing: **E4 a following camera**
(`packages/studio/src/performance/evaluate.ts`), the episode `episodes/a-badminton/`
(which does not exist), and the review. The package order and each package's
boundary are in [ART_ASSET_PROGRAM](ART_ASSET_PROGRAM.md) §"Roadmap".

**Slice B (giant swing) — capability proven, shot blocked.** The swing works:
hanging support, both hands on one grip, a full −360° turn with grip error
0.000000 px over 86 frames, zero diagnostics (`8c66520` and predecessors). The shot
does not bake because of staging and sub-pixel boundaries, all recorded with numbers
in [ART_ASSET_PROGRAM](ART_ASSET_PROGRAM.md) ("Slice B state"): the set's bar had to
move to a reachable height, a straight-up mount is singular, the staged standing line
is not owned by the set so a full circle cannot fit any frame, and three sub-pixel
invariants (`leg-annulus` 0.002 px, `support-anchor` 0.029 px, a constant
`grip-contact` 1.119 px) keep refusing the mount. `episodes/b-bar-swing/` holds the
episode and a README with the framing measurements.

**Slice C (pouring tea) — not started.** `intent pour` is declared and fails loud;
`prop/teapot` and `prop/teacup` exist; the tea room and two cast members do not.

**Working practices this session proved, worth keeping:**
- a subagent is killed at 30 minutes, so engine work must be split into ≤20-minute
  steps, each committed and pinned with `git -C <repo> branch -f keep/<name>`,
  because a finished worktree is pruned and an unpinned commit is lost (that happened
  three times);
- mechanical gauges beat opinions: `tools/art-direction-study/silhouette-holes.mjs`
  and `limb-depth.mjs` settled two disputes and one false review finding;
- evidence frames are cut from the rendered video of the current revision and carry
  `bake-identity.json`; a reused stills directory is not evidence.
