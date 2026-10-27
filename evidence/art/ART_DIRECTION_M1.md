# M1 — thermos scene art directions

## Outcome and approval

**Accepted: B selected.** Three original static art studies compare the same
thermos handover beat in genuinely different directions. Direction acceptance
is not production rig/asset readiness or proof the engine renders this art.
User approval provenance/history is in the
[ticket](../tickets/M2-DOC-READINESS.md); exact selection receipt:
`/home/z/.local/share/agentic-animation/art-baselines/m1-selection-20261008/direction-approved.md`.
All A/B/C candidates remain immutable. B's warm interior, thin contours,
character proportions and clear exchange are the working direction. A/C are
references, not automatically mixed into B. Next: [M2](./ART_CHARACTER_M2.md).

## Brief and comparison contract

Two distinguishable fictional adult students: lin gives awei the same teal
handled thermos in the Qingyun school shop, with dialogue “给。”. Keep the cup
and both hands focal, separate faces and counter/shop context; no invented plot,
relationship, brand imagery or new audio. Preserve a subtitle-safe lower band.
1280×720 whole composition and labeled interaction crop compare to frozen
[M0](./ART_BASELINE_M0.md) props frame 104 (4.333s).
These are designed poses for that narrative beat, not the motor's exact pose or
canonical engine frame. Changed composition is explicit; dynamic geometry and
integration are deferred, not certified by designed contact.

| Direction | Mechanism | Integration limit |
| --- | --- | --- |
| A Paper-cut shop | Asymmetric rounded silhouettes, warm palette, tactile layers and shopfront framing | Overlap/edges must survive articulation |
| B Sunlit story frame | Anatomical proportions, fine variable contours, receding interior, warm light | Complete views/parts, joint treatment and lighting needed |
| C Ink-and-gouache courtyard | Architectural lines, mineral colors, paper reserve, brush-like cloth/foliage | Fine edges, texture stability and expressive faces need work |

References are mechanisms in installed Huashu skills, not copied drawing code or
named-studio imitation. Original local SVG paths/marks use Noto CJK fonts;
no external illustration, generation service/model, new TTS or video is used.
Provenance/environment is in the archive receipt. Static study generators are
not supported production entry points.

## Evidence inventory and limits

Durable root:
`/home/z/.local/share/agentic-animation/art-baselines/m1-20261008-directions/`.
Disposable workspace: `/tmp/agentic-animation-art-m1-20261008/`.

- `index.html`, three direction HTML boards: original/A/B/C, palettes and limits.
- `renders/`: 1280×720 images; `browser/`: inspected board screenshots.
- `comparison.png`: same-size original/candidates; `closeups/`: aspect-preserving
  padded crops. Crop windows differ, so not equal-magnification metrics.
- `source/`, `svg/`, receipt and `SHA256SUMS.json`: authored inputs/fingerprints.
- `pass1/`, `pass2/`, `pass3/`, `logs/`: immutable iteration/check history.
- Repository source: `tools/art-direction-study/build.py`, `test_build.py`.

Reviewed images show stronger silhouette differentiation, visible cup/grips,
separate faces and coherent designed depth. Remaining limits: proposed identities,
no validated turnarounds; B light simplified; C is restrained vector/gouache,
not mastered ink painting. All figures remain code-drawn with face/hand work open.
A stronger still is not speech, movement or physical handover acceptance.

Self-review covered whole images, boards, same-size comparison and final crops.
No fresh independent artistic review or dynamic validation was performed. User
selection is real; do not invent independent proof, beauty scores or studio quality.
Historical observed gates: three structural study tests, typecheck, test:all
166 passed / 7 skipped, canonical smoke, browser/link/diff checks. They belong to
archived source, not current dirty-tree certification. Failed screenshot/initial
structural attempts and revisions remain in logs/ticket, not current-state claims.

## Reproduction

```sh
PYTHONDONTWRITEBYTECODE=1 python3 tools/art-direction-study/test_build.py
python3 tools/art-direction-study/build.py /tmp/<study>/svg
```

Archive packaging/render helpers use installed sharp/librsvg and Chromium with
local renderer hooks; immutable third-party skills are not modified. Compatible
dependencies/fonts and the archived receipt are needed. `/tmp` is disposable;
recover from durable inputs into a new directory, never overwrite the original
boards or selection receipt. Preserve original B for future matched comparisons.
