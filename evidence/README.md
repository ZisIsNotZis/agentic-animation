# Evidence

Captures, not contracts.

This tree holds the artifacts that prove a fact recorded in `docs/`: milestone
bundles, review verdicts, measured numbers, process tickets and the images the
person is asked to look at.

- It is referenced by hash and by measurement, and it is never the authority for
  behavior. Where a file here and a level document in `docs/` disagree, the level
  document wins and this file is the record of what was measured then.
- Files here keep their original dates, commits and narrative. That is what makes
  them evidence: they are a capture of a moment, and rewriting them would destroy
  the only thing they are good for.
- `art/` holds the milestone documents of the art programme (M0–M7) and the
  asset programme, which own the per-milestone measured numbers, review verdicts
  and accepted revisions. Their decisions are distilled into `docs/5_PRODUCT.md`,
  their contracts into `docs/7_*` and `docs/8_MOTOR.md`, and their roadmap into
  `docs/0_ROADMAP.md`.
- `tickets/` holds the process record of individual work packages, reviews and
  backlogs. A ticket that still owns open work is named from
  `docs/0_ROADMAP.md`.
- `media/` holds review images built by a command, at the size the deliverable
  shows them — no upscale, no crop, no colour change.

Durable evidence that is too large for Git lives outside the repository under
`~/.local/share/agentic-animation/art-baselines/`, bound by the receipts beside
each bundle.
