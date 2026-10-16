# Art production upgrade

## Approved objective and boundaries

The approved objective is to learn useful art-production mechanisms of Huashu
Design and Art Motion, retain our asset management and engine, and compare
visible outcomes at each milestone. The drawing-quality deficit is accepted;
M0 does not test whether it exists. Current progress is owned by [STATUS](STATUS.md);
approval provenance is in the [ticket](tickets/M2-DOC-READINESS.md).

Preserve `episode.yml` as the sole authored production input, `library/`
identities, the canonical compiler/Remotion path, dialogue/visemes, reusable
procedures, physical support/contact/grip, and camera capabilities. Priority
order confirmed 2026-10-16: first absorb every valuable Huashu mechanism into
this engine, its skills and its practice (everything except image-generation
models), then continue the main engine goal with ready-made example assets;
every step ships as a vertical slice a user can see. Do not
introduce a parallel DSL or production pipeline. Existing licensing and
no-generative-video decisions remain in force. New recurring costs, external
services, or material contract changes require authority covering them.
Appearance can improve or be replaced; preserving the engine does not mean
preserving weak artwork. Vector, layered raster, and limited sprite approaches
are candidates, not already supported promises. Inspect renderer capabilities
before selecting an integration. Physical geometry must match changed art.

## Production sequence

Story intent → art direction → visible keyframe → production-ready assets →
existing performance engine → coherent materials/light → separate artistic and
functional acceptance. Get a representative frame right before expensive
rigging. Learn mechanisms rather than copying every upstream rule: continuous
motion, three variants on every revision, dense SFX, and model-brand assumptions
are not universal quality criteria. References inform original composition;
record provenance and licenses for incorporated assets.

## Milestones

| Milestone | Work and visible deliverable | Acceptance |
| --- | --- | --- |
| M0 Baseline | Freeze short current-engine clips, exact-frame stills, source/audio/config fingerprints, visual findings, learning coverage | Reproducible evidence and explicit limits; no beauty re-test or engine repair |
| M1 Art direction | Same scene in three genuinely different rendered directions; whole composition plus close crop | Clearly stronger chosen keyframe; user selects direction before production |
| M2 Character | One improved character; views, expressions, visemes, reach/grab/speech clips | Better silhouette and face; articulation, identity, mouths and contact survive |
| M3 World | One coherent set, props and dressing; depth, perspective, composition, support metadata | Character and environment belong together; wide/close/moving frames work |
| M4 Materials/light | Region palettes, appropriate brush/contour/paper treatment and light; layered ablation frames | Detail preserved, no flicker, coherent lighting, measured render cost |
| M5 Acting | Upgrade speech, pointing, pickup, handover, surprise, push/recovery | Clear preparation, key poses, accents and settling without lost contact/support |
| M6 Film language | Focus-driven camera, meaningful transitions, semantic audio cues and restrained sound | Better explanation/rhythm in actual audiovisual clips, not decorated slides |
| M7 Transfer | Second layout/character/light situation; double-actor interaction and unfriendly inputs | Quality transfers without starting over; identify genuinely reusable tools |
| M8 Default production | Integrate proven assets/recipes, docs and skills; final short showcase | Canonical pipeline remains usable; both art and regression evidence pass |

Every row is a bounded outcome with the listed visible deliverables; acceptance
also requires the Art, Function and Production dimensions below. Each milestone
requires fresh independent final-artifact review and applicable actual-media
experience QA: stills for static M1, real-time visual playback and listening for
motion/audio deliverables. Record scope/modalities and revision binding; a narrow
fix challenge, tests or media metadata alone cannot satisfy the milestone.
M0/M1 historical self-review limits remain disclosed in their evidence owners;
do not retroactively claim independent acceptance.

User gates: M1 direction selection, M2 identity derivation approval and the M2
milestone judgment are met — the user said “我感觉没啥问题，自动推进” at the
trusted `m2-facial-object-20261014T0010` entry and did not itemize
listening/lip-sync ([acceptance ticket](tickets/M2-MILESTONE-ACCEPTANCE.md)).
listening/lip-sync ([acceptance ticket](tickets/M2-MILESTONE-ACCEPTANCE.md)).
On 2026-10-16 the user opened the production path specifically for
`figure/lin_b_draft` ("old characters shall still be there, just not the top
choice"), which is now the recommended library figure; the production gate for
further character/art replacements, publication and new spending stays closed
until named per item. Stills, test runs,
renders and independent review are internal checkpoints, not reasons for progress
pauses. M3–M8 still require scoped contracts and human milestone judgment, not
automatic production replacement. Publication and material spending remain
approval-gated.

M2–M4 can iterate together within these gates. Generalize drawing helpers after real repeated use,
not before the first successful scene. This roadmap does not authorize a broad
engine rewrite. Each future milestone starts by updating its owning contract
when public behavior changes, and uses TDD for behavior changes.

## Comparison and render budget

Keep the original M0 immutable and the last accepted milestone separately.
Each review shows original → last accepted → candidate at matching narrative
beats, plus exact frame/time mappings. Changed composition is allowed; replacing
a difficult interaction with an easier demonstration is not.

Three independent acceptance dimensions:

- **Art:** silhouette, composition/focal hierarchy, palette/value structure,
  materials/light, visual identity, expressive motion, readability.
- **Function:** visemes/dialogue, contact/grip/support, handover, orientation,
  continuous motion, camera containment and subtitles; preserve YAML usability.
- **Production:** editability, transfer/reuse, special-case burden, asset effort,
  render wall time and resource cost. Subjective ratings support review, not
  objective proof or pixel-difference proxies for beauty.

Default comparison passes: 1280×720 at 24 fps, four workers, at most 15 seconds
per clip and at most 30 seconds total footage per iteration. Prefer targeted
stills first, then interaction clips. Do not run the long-form 180-second
benchmark for these short samples. Increasing this budget needs a concrete
reason. Bind all comparisons to source and audio fingerprints; hold narration
and timing fixed where possible so different TTS does not confound visuals.

Do not fix baseline defects during M0: record them by frame and owning layer.
Capture honest capability evidence, not claims that every intended action is
already correct. Generated media/manifests/caches stay outside Git. Keep a
local external evidence bundle; `/tmp` is disposable, so archive it outside the
repository before cleanup if continued comparisons depend on it. Missing
baseline media means recapture explicitly, never silently relabel a new build.

## Learning coverage

This table is the maintained coverage map. Inspect upstream code and references
at the implementation milestone; importing third-party code requires its
license review. Upstream skills remain immutable.

| Mechanism to learn | Planned milestone | Current state |
| --- | --- | --- |
| Reference decomposition, visual motifs, real direction boards | M1 | Three reviewed boards archived; user selected B in ART_DIRECTION_M1 |
| Keyframe-first composition, focal hierarchy, depth and density | M1/M3 | Explored in three M1 studies; no production integration |
| Character proportions, silhouettes, measured landmarks, views | M2 | Native draft parts/views; acceptance in ART_CHARACTER_M2 |
| Medium selection: vector/raster/limited frames and provenance | M2 | Original vector draft through canonical artwork seam; not production approved |
| Scene perspective, narrative props, common visual language | M3 | Baseline to expose gaps |
| Region palettes, scale-specific strokes, contour/detail recovery | M4 | Upstream inspected; C study tries clipped regional pigment, runtime deferred |
| Paper/pigment/ink/halftone and lighting/shadow mechanisms | M4 | Upstream drawing library inspected; select per direction |
| Preparation, accents, secondary motion, deliberate stillness | M5 | Baseline to expose gaps |
| Continuous-space camera and content/style-driven transitions | M6 | Existing camera functionality retained |
| Semantic cue timing, reveal accents, suitable BGM/SFX | M6 | Current measured audio retained |
| Reference comparison, separate art/function QA, adversarial inputs | M0/M7 | Comparison method defined here |
| Validate QA tools; independent review and successful-recipe feedback | M7/M8 | Self-review only in M0; do not claim independent review |
| Reusable drawing library extracted after demonstrated repetition | M7/M8 | Deferred; no speculative art framework |

## Evidence and continuation

See [ART_BASELINE_M0.md](ART_BASELINE_M0.md) for selected episodes, fingerprints,
commands, inspected frames, findings and validation. M1 studies and the user
selection live in [ART_DIRECTION_M1.md](ART_DIRECTION_M1.md); character work is
tracked in [ART_CHARACTER_M2.md](ART_CHARACTER_M2.md).
This roadmap owns milestone scope; PIPELINE owns ordinary production order.
