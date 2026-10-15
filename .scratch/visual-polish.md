# AI work adventure visual polish

- [x] Diverse scene-aware backgrounds across all ten scenes
- [x] Natural, distinguishable body motion plus walking/repositioning
- [x] Connected rig with uniform limb outlines and no joint markers
- [x] Diverse readable eyes, brows, mouths, eye contact, and speech cadence
- [x] Actor/object-targeted VFX and correct foreground layering
- [x] Distinct actor voice mapping verified with fresh preview samples
- [x] Typecheck/tests, compact QA renders, manual visual/audio inspection
- [x] Open final review artifacts with xdg-open

Evidence (2026-08-31): `npm run typecheck` and `npm run test:all` passed
(112 pass, 7 skip). Manually inspected Chromium-rendered background and
pose/expression atlases. Voice QA maps Awei to Yunxi (+8%, +2Hz) and Aqiang to
Yunyang (-6%, -6Hz); measured pitch ranges do not overlap at their centers.
The full YAML rebuild was intentionally not synthesized: it correctly stopped
because 269 exact speech takes would require explicit `--synthesize-unmatched`.
