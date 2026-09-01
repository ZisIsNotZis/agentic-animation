---
name: camera-staging
description: Diagnose or improve actor staging, camera framing, cropping, overlap, safe areas, and normalized logical coordinates in this animation engine.
---

# camera-staging

Read [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md),
[docs/NARROW_EPISODE_DSL.md](../../../docs/NARROW_EPISODE_DSL.md), and the
current staging/runtime tests before changing code.

## Contract

Authors describe relationships and intent, not output pixels. Staging uses a
normalized logical canvas; the renderer projects it to any output size. Every
visible actor and important moving object gets a footprint, is clamped to the
subject safe area, and remains layerable and faceable.

Camera priority is strict:

1. Keep moving parts and their destinations visible when possible.
2. Keep other actors and important bound objects fully visible unless the
   source explicitly excludes them.
3. Apply emphasis, golden-ratio placement, and zoom to the remaining space.

Focus means emphasis, not maximum zoom. Same-lane actors at equal or converging
positions are deterministically repelled by stable actor ID order. Preserve
relative lane order, facing, object bindings, and z-order. Fail clearly when
footprints cannot fit; never silently accept overlap or off-screen placement.

## Diagnose

Reproduce at logical coordinates and at the requested output dimensions. Sample
the initial frame, each camera transition, moving endpoints, and dense groups.
Check actor bounds after camera transform, not only their anchor points. Inspect
actual stills from `/tmp` and add a focused regression test for the failure.

Completion: tests prove safe containment and deterministic separation, and
representative rendered frames show no unintended crop or overlap.
