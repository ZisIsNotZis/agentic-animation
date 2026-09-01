---
name: qa-stills
description: Visually inspect animation stills or puppet samples for framing, containment, overlap, acting, continuity, and renderer-visible changes before delivery.
---

# qa-stills

This is a visual gate. Read every sampled PNG with an image viewer; a passing
test or contact-sheet filename is not inspection. Use `/tmp` for disposable
renders and record defects by scene and frame.

- Full silhouettes and moving parts stay inside the camera frame.
- Focus preserves moving subjects, actors, and important objects before useful
  zoom or golden-ratio emphasis.
- Same-lane actors separate deterministically; no unintended overlap, twinning,
  exits, population changes, or broken layer order.
- Backgrounds, props, bindings, and target-bound VFX retain continuity.
- Poses, gestures, gaze, face, and speech visibly express the authored beat;
  speech alternates deterministic open/closed mouth states.
- Joints connect, outlines are consistent, expressions remain distinct, and
  subtitles are readable and aligned to speech.

## Loop

1. Render start/mid/end frames, camera transitions, entrances, interactions,
   focus changes, and dense groups.
2. Inspect each frame, fix the YAML/asset/engine owner, regenerate, and inspect
   again. Require two iterations for changed visual behavior.
3. Record a receipt keyed to the current build before final render.

Completion: every sample has a verdict and no blocking visual defect remains.
