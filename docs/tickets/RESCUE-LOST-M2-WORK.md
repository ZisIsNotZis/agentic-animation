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

1. **Cue audio is entirely absent.** `library/sound/plugin.js` calls
   `enumerateCueAssets(import.meta.url, "sfx")`, which reads
   `library/sound/cues/*.{wav,mp3,ogg}`; likewise `library/music/cues/`. Neither
   directory exists in the repository and no `.wav` exists anywhere in it, so
   **every `sfx` and `music` cue resolves to nothing and is silently dropped**,
   and `packages/adapters/renderer-remotion/test/index.test.ts` points at
   `library/music/cues/ending-cadence.wav`, which does not exist. The overlays
   carry 20 `sound/cues` and 2 `music/cues` files (1.7 MB) under exactly the
   expected names. **Rescue: audio cues.**
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
| R1 | `library/sound/cues`, `library/music/cues` | 20 + 2 cue files restored; enumeration reports them | `enumerateCueAssets` returns 20 sfx and 2 music; the adapter audio-cue test that referenced `ending-cadence.wav` passes; `npm test` stays green |
| R2 | `episodes/qa-orientations` | Eight orientation fixtures that still `check` against the current library | `anim check` green for each restored fixture; fixtures whose set was retired are recorded as retired with the reason |
| R3 | `library/prop/*`, motor, M5 tests | Every grabbable prop declares `grip`; the thermos is held by the handle and tilts with the wrist | A held-property assertion on the socket and the tilt; M5 derived keys re-derived, invariants and render truth green |
| R4 | `figureArtwork`, `library/figure`, renderer | A grasp hand shape wired from the existing `*/grips/*.svg` art and selected while holding | The holding hand draws `grip`, not `fist`; stills reviewed |
| R5 | `skeleton`, `actorPose` | Crouch drives knee flexion instead of a hip drop on straight legs | Joint envelope holds; a crouch still shows a bent knee and a planted foot |

R1–R2 and R3 are independent by file area; R4 and R5 follow R3 because they
move the same bake.
