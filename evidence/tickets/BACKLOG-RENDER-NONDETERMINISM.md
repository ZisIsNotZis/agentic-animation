# Backlog — renders are not byte-reproducible across sessions

Status: open, not started. Found 2026-10-18 during the M4 v4 fix round
([ART_MATERIALS_M4](../art/ART_MATERIALS_M4.md)).

## Observation

The same still, from the same manifest, art and renderer, differs by **1 level**
in **80988 px (8.8 % of a 1280×720 frame)** between two sessions; inside one
session it is byte-identical, and a repeated render in the same run is
byte-identical too.

## Reproduction

- Six renders of the `a0-m3` arm at f0000 in two fresh `renderStill` runs: all six
  identical to each other, all six 1 level away from the archived
  `m4-20261017T110548+0800/scripts/v3/m3-baseline-f0000.png` (max 1.0, 80988 px).
- An earlier run on the same day reproduced that archived PNG byte for byte
  (`max_abs_rgb 0.0`), so the state flips between sessions rather than drifting.
- The difference is diffuse over the whole frame, not localised, and does not
  depend on the M4 art: a render of the M4 art and a render of the untouched M3 art
  in the same session are byte-identical to each other.
- Whichever way the state sits, it also changes blend-layer composites: an ablation
  arm that drops `material_detail` differs between frames in 4222 px at antialiased
  edges (max 14 levels) in one state and in 0 px in the other
  (`pass_contribution_wobble` in `scripts/v4/analyze.py`).

## What it breaks

Byte-hash evidence binding across sessions. A still, clip or frame whose evidence
is "sha256 equals the stored hash" cannot be re-verified in a later session, and a
pixel-exact comparison against an archived PNG measures the rasterizer state as
much as the art. Within a session, and for whole-manifest renders compared to
themselves, hashes remain sound.

## Smallest next probe

`sha256` one fixed still across three separate sessions on an otherwise idle
machine, and record Chrome/Chromium build, GPU driver, `gl` mode and system load
with each. If the hash is unstable there too, move evidence binding from hashes to
(a) the manifest plus revision plus the render command, and (b) tolerance-based
pixel comparisons with a stated level threshold, and say so in the layer documents
that quote hashes.

## Not in scope

No renderer, bundler or Chrome-flag change is attempted for this; the M4 round
records the limit and re-baselines its one identity check to a same-session
reference instead.
