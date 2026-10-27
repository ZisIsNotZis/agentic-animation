# docs/media — reviewable images the person is asked to look at

Images here are review artefacts, not generated build output: each one exists so the person can
judge an asset at the size the deliverable shows it, and each one is rebuilt by one command.
Nothing here is a render cache, a screenshot of a work in progress or a flattered sample — the
asset's own art, no upscale, no sharpening, no colour change, no crop.

## Cast review, 2026-10-23 — `cast-review-2026-10-23/`

The person's answer to the cast question ("probably yes, but open for me to review",
`docs/0_ROADMAP.md` §Cast) is provisional on seeing the new cast, so these are the three
new assets at the size a 1280x720 episode frame draws them:

| file | what it shows |
| --- | --- |
| `athlete_a.png` | `figure/athlete_a`, front view, 442 px tall on a 1280x720 frame |
| `gymnast_b.png` | `figure/gymnast_b`, front view, 442 px tall on a 1280x720 frame |
| `badminton_hall.png` | `set/badminton_hall`, the whole set at 1280x720 |
| `cast-sheet.png` | the three side by side, 1920x720; the set is shown at 640 px so it fits its cell |

Rebuild all four, and the identity beside them:

```
node tools/cast-review.mjs
```

`identity.json` carries the revision the command ran at (the asset hashes, not the revision,
are the identity — a re-run after a newer commit records that commit), the sha256 of every source
file and of every image, and the arithmetic of each size: a figure's design space (400x720) x
the staged actor scale for a one-actor shot (0.92) x stage-to-video (1280/1920), which is 442 px
tall; a set is its intrinsic 1920x1080 art at the video's width. Feet stand on y 691, the floor
line `set/badminton_hall` declares, so a figure still and the hall still share one frame
geometry. A two-actor shot draws the same figure at 0.88, so these stills are at the size of a
figure standing on its own, not of a figure sharing a frame.

The four images are tracked, contrary to the repository's default of not committing generated
media, because a review the person is asked to make may not rest on bytes a reboot deletes; the
command above and the hashes in `identity.json` are what make them checkable rather than
trusted.
