---
name: make-character
description: Create or approve an immutable versioned puppet for this engine when an episode needs a character absent from the approved library.
---

# make-character

Read [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md),
[docs/DECISIONS.md](../../../docs/DECISIONS.md), and [docs/SCHEMAS.md](../../../docs/SCHEMAS.md).
Episodes pin approved assets; drafts do not enter production rendering.

1. Run `npm run anim -- doctor` and confirm the image-generation environment.
   Ground the brief and record provenance.
2. Create a draft and identity anchor. Stop for human anchor approval before
   deriving parts.
3. Generate, cut, and rig complete layered parts, pivots, sockets,
   face/eye/mouth shapes, and compatible motion. Record model and license.
4. Render pose, expression, and viseme stills; apply [qa-stills](../qa-stills/SKILL.md).
5. Approve to freeze a new `v<N>`; a later look is a new version.

Use immutable [algorithmic-art](../algorithmic-art/SKILL.md),
[canvas-design](../canvas-design/SKILL.md), or [svg-creator](../svg-creator-skill/SKILL.md)
only for their native asset formats. This skill owns library integration and QA.

Completion: a pinned approved version exists, metadata is complete, and sampled
poses/visemes pass visual QA.
