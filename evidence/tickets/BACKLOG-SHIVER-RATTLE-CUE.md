# BACKLOG: ship or remove the "shiver-rattle" audio cue

Status: open, non-blocking for Motor Slice 3.

The migrated `shiver` action emits sfx cue "shiver-rattle", which is absent
from `library/sound/` (it exists only in the `generate-cues.mjs` palette) —
the same never-shipped-cue situation `action.push` had before the slice-3
repair removed the dead "push-thump" reference
([WORLD_PUPPET_MOTOR.md](../../docs/8_MOTOR.md), slice 3). Any future
episode render that triggers shiver will fail at the renderer's cue gate.

Decision needed: produce a real cue asset under `library/sound/`, or remove
the cue reference the way push-thump was removed. Asset production is
approval-gated; finding recorded by the slice-3 independent review
(2026-10-16).
