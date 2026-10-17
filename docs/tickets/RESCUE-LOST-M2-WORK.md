# RESCUE: lost M2 work — inventory, homes and acceptance

The user asked to rescue the work that was done during M2 but never merged into
the repository, organise it into the engine or the asset library, and keep
advancing. This document is the single home of that inventory and its state.

## Where the lost work actually was (verified 2026-10-17)

- **Remote branches carry nothing.** Local `main` descends from the squash
  `96fe659`, and every remote branch (`worker-center-grip`,
  `fix/reach-arm-mapping`, `worker-c-orientation-evidence`,
  `worker-views45-pose`, `worker-wardrobe`, `published-main`) is older: a
  `git diff --diff-filter=D <branch> 96fe659` yields only `CLAUDE.md` and, for
  `published-main`, the retired JSON/storyboard DSL. Set aside as history.
- **The archives' `workspace/library/` overlays hold the delta.** Thirteen
  bundles carry one, and all thirteen agree on a single variant of every file,
  so the pre-loss state is unambiguous. Comparing them against `library/`
  yields 33 differing paths and 33 paths absent from the repository.
- The repository's own figure art is **newer** than the overlays (it came from
  the M2 production-integration commit of 2026-10-16), so figure art is not
  lost.

## Consequential loss (worth rescuing)

1. **Cue audio is absent — because of a path seam, not a lost asset.**
   `library/sound/plugin.js` calls `enumerateCueAssets(import.meta.url, "sfx")`,
   which reads `library/sound/cues/*.{wav,mp3,ogg}`; likewise
   `library/music/cues/`. Neither directory exists and no `.wav` is tracked, so
   **every `sfx` and `music` cue resolves to nothing and is silently dropped**,
   and `packages/adapters/renderer-remotion/test/index.test.ts` fails on
   `missing audio cue asset "ending-cadence"`. The overlays carry 21
   `sound/cues` and 2 `music/cues` files under exactly the expected names.
   Measured cause: the tracked generator `tools/audio-qa/generate-cues.mjs`
   reproduces **all 21 sfx and `ending-cadence.wav` byte-for-byte**, but writes
   them to `library/audio/{sfx,music}/` plus a `catalog.json` that nothing reads,
   while the plugins enumerate `library/sound/cues/` and `library/music/cues/`.
   So the audio is not lost work: it is regenerable output written to the wrong
   place. `.gitignore:49` (`*.wav`) is therefore correct for those files.
   `xuehua-piaopiao.wav` is the one genuine loss — the generator does not
   reproduce it and `library/music/xuehua` plays it in `episodes/showcase-snow`.
   **Rescue: close the seam and keep the one non-reproducible cue.**
2. **The thermos handle `grip` declaration.** Present in all thirteen overlays,
   absent from the repository; it gates both the handle socket and the
   wrist-driven prop rotation. Owning register:
   [OPEN-CARRIED-PROP-GRASP](OPEN-CARRIED-PROP-GRASP.md). **Rescue: grip data.**
3. **The eight orientation QA episodes.** `episodes/{contact-front,
   contact-front-left, contact-front-right, contact-back, contact-back-left,
   contact-back-right, contact-left, contact-right}` exist only in the overlays.
   They are the reproduction of the accepted all-view grip evidence.
   **Rescue: QA fixtures** (the authored `episode.yml` only — never the rendered
   media, and never `performance.json` or `audio/`).

## Deliberate retirements (recorded, not rescued)

- `library/action/{bow,nod,point,push,raise_hand,shiver,think,dismiss}/index.js`
  and `library/action/point_one|point_two`: regex pose paths, replaced by motor
  intents in Motor Slice 3 and deleted on purpose. Restoring them would restore
  the parallel path the engine removed.
- `library/prop/putdown/index.js`: superseded by the M5 putdown rest hold.
- `library/set/counter_contact_draft`: superseded by the accepted
  `library/set/canteen_counter_m3` (M3 acceptance).
- `library/figure/lin_b_draft/*/draft-receipt.json`: draft-workspace receipts
  whose claims refer to the draft workspace, not this repository; the current
  provenance is the manifest plus the acceptance ticket.
- Generated media in the overlays (`dist/`, `audio/`, `performance.json`): never
  tracked.

## Work packages

| WP | Owner area | Outcome | Acceptance |
|---|---|---|---|
| R1 | `tools/audio-qa/generate-cues.mjs`, `package.json`, `.gitignore`, `library/music/cues` | The generator writes where the plugins enumerate, `npm run cues` runs it, and the single non-reproducible cue is tracked | Regenerating from empty yields 21 sfx and 2 music and `ending-cadence` resolves; the adapter audio-cue test passes; only `xuehua-piaopiao.wav` is tracked |
| R2 | `episodes/qa-orientations` | Eight orientation fixtures that still `check` against the current library | `anim check` green for each restored fixture; fixtures whose set was retired are recorded as retired with the reason |
| R3 | `library/prop/*`, motor, M5 tests | Every grabbable prop declares `grip`; the thermos is held by the handle and tilts with the wrist | A held-property assertion on the socket and the tilt; M5 derived keys re-derived, invariants and render truth green |
| R4 | `figureArtwork`, `library/figure`, renderer | A grasp hand shape wired from the existing `*/grips/*.svg` art and selected while holding | The holding hand draws `grip`, not `fist`; stills reviewed |
| R5 | `skeleton`, `actorPose` | Crouch drives knee flexion instead of a hip drop on straight legs | Joint envelope holds; a crouch still shows a bent knee and a planted foot |

R1–R2 and R3 are independent by file area; R4 and R5 follow R3 because they
move the same bake.

## State (2026-10-17)

- **R1 merged** — the seam is closed in the generator, `npm run cues` is wired
  into both `pretest` and `pretest:all` (npm only runs the hook of the invoked
  script, and `test:all` is the documented gate), and only
  `library/music/cues/xuehua-piaopiao.wav` is tracked (639 KB, the one cue the
  synthesis recipes cannot reproduce). Regeneration is byte-identical to the
  archived overlay for all 23 files. Verified on the integration branch from a
  deleted-cues state: `npm run test:all` regenerates 21 sfx + `ending-cadence`
  and the audio-cue test passes. Hazard worth knowing: the tracked cue sits
  inside the generated directory, so deleting that directory needs a
  `git restore` of the one file.
- **R2 merged** — eight `episodes/qa-orientations/<name>/episode.yml` restored.
  Eleven overlays carry these episodes in two variants; the later variant was
  restored, and its only semantic change is the retired draft set swapped for
  the accepted `set/canteen_counter_m3`.
- **R3 in progress under decision (A).** Restoring the grip achieves the goal —
  hand-to-handle distance 0.00 px and the thermos rotates 104.8° with the wrist —
  but it then exposes a **motor defect**: the hold path targets
  `shoulder + eased rel + breath` without clamping to the drawn arm's reach, so
  a 0.02 px overshoot makes `wholeBodyProposal` reject every attempt, the bake
  freezes at 4.675 s and a single sub-pixel miss ends the performance with a prop
  frozen 34.8 px inside the counter. The fix belongs in the motor (clamp the
  target and make the contact residual honest at the cap), not in the data —
  raising the tolerance only moved the freeze.

### The tilt is real but over-rotated (found 2026-10-17)

Restoring the socket also re-armed the wrist-driven rotation, and measuring it
shows the mechanism is too crude for this rig:

- `wristDirection` is the **forearm's absolute world angle**, and the rig has no
  wrist joint, so the whole arm swing becomes prop rotation: 0° at bind, 104.8°
  at the carried key frame, 87.32° at the putdown rest. The thermos is carried
  and placed on its side.
- The drawn hand sprite **does not rotate**, so the object turns against a hand
  that visibly does not — which is why it reads as wrong rather than as tipping.
- The putdown itself is correct: at 87.32° `solidSupport` gives 44.89 and the
  drawn base is 355.11 + 44.89 = 400.00, exactly the painted top. The M5
  invariant failed only because it measured the anchor while
  `docs/ART_ACTING_M5.md:144` says the **drawn base** is the value to measure —
  the ±8 slack had been absorbing the 4-unit ink offset. That assertion is
  corrected to measure the base at 1 px.

Decision deferred to a package (R8): either give the rig a wrist so the drawn
hand rotates with the tilt, or hold a carried object at its authored
orientation because a point socket transmits no torque and let tilt be an
authored intent (pour, lie down). The second is closer to a real handle grip,
the first is what makes the current mechanism legible. This is a
product-visible choice and is reported to the user, not decided silently.

### Grip socket rule

A `placement.grip` is declared only where the artwork has a real handle. The
thermos is the only current prop that qualifies (closed loop, ink x 133..158 /
y 54..98, socket `[148,76]`). Notebook, phone, skill cards, roasted sausage,
skill bottle, desk, mirror, scroll, flashlight and the sign are carried at the
centre, which is the correct behaviour rather than a gap.

### Follow-ups found during R1 and R2

- **R6** — `packages/adapters/tts-edge/test/fixtures/boundaries.{srt,vtt}` were
  never tracked (`.gitignore` excludes `*.srt`/`*.vtt`), so three adapter tests
  fail for the same class of seam the cues had. They need a generator or an
  explicit tracked exception, decided once rather than per test.
- **R7** — `enumerateCueAssets` treats a missing cues directory as valid, so a
  clone that skips the test hooks silently drops every sfx, and only the music
  case is caught, by a direct file read. `make` has a loud missing-asset check
  but it sits *inside* `Object.entries(cueAssets)`, so it is unreachable when
  nothing was enumerated: a manifest is written with `audio.cues: {}` and exits
  0, and the failure only surfaces at render. The gate must compare the compiled
  performance's cue references against the embedded cues, in the pipeline.
