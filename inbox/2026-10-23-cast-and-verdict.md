kind:    report
from:    agentic-animation (manager: the cast consent, the cast review stills, the S-A1 verdict)
spend:   idle-compute, machine_time
id:      root's task of 2026-10-23 (the cast answer, the cast review, the fresh verdict)

# The cast yes is recorded open, the three new assets are openable at viewing size, and the fresh verdict is FAIL — on two defects nobody had named

## What you can open now

The cast review, four images, all under `/home/z/vibe/agentic-animation/docs/media/cast-review-2026-10-23/`:

- `athlete_a.png` — `figure/athlete_a`, front view, **442 px tall on a 1280×720 frame**
- `gymnast_b.png` — `figure/gymnast_b`, same size, same frame
- `badminton_hall.png` — `set/badminton_hall`, the whole set at 1280×720
- `cast-sheet.png` — the three side by side, 1920×720 (the set is at 640 px there to fit its cell)

One command rebuilds all four and their identity: **`node tools/cast-review.mjs`**. It draws the
asset's own art, composed in the order `ArtFigure.tsx` draws it, scaled by the staged actor scale
for a one-actor shot (0.92) × stage-to-video (1280/1920); no upscale, no sharpening, no colour
change, no crop. `identity.json` beside them carries the revision, the sha256 of every source and
every image, and that arithmetic. The sizes are stated on the sheet itself, so a reviewer cannot
mistake the review scale.

## 1. The cast answer, recorded as the person's, open

`docs/ART_ASSET_PROGRAM.md` §Cast now records: the person answered root's question 3 on
**2026-10-23** with “probably yes, but open for me to review”. From that date `figure/athlete_a`,
`figure/gymnast_b` and `set/badminton_hall` may be recommended by default for new episodes, and
`figure/lin_b_draft` keeps its recommendation (the figure category's `use`) until the person has
seen a slice they appear in. The record says **open**: provisional on that review, reversed by one
sentence from the person, and cheap to reverse because a new episode's cast is one line of its
`episode.yml`. The `use` recommendation itself is unchanged, and nothing here grants publication or
spending. Two pointers, no second statement of the fact: `docs/ART_CHARACTER_M2.md` (the
per-character gate rule) and `docs/STATUS.md`.

## 2. The fresh verdict — FAIL, and it found two real defects

Dispatched blind (`reviewer`, run `aad0eadc`, 2026-10-23): the four stills and the video, one
question, nothing else — no docs, no identity, no motor numbers. **FAIL**; filed verbatim at
`docs/tickets/S-A1-REVIEW-3.md`, with what each finding means for the shot in
`episodes/a-badminton/REVIEWS.md` §"S-A1 review 3".

**It judged `sa1-d1w-2026-10-21`, not the `sa1-r1r4-2026-10-21` your task named**, and that is a
correction, not a substitution of convenience: the wrapper landed at `264a09a` after `r1r4` was
rendered, so `r1r4` is the rendition whose net laces both players — a verdict on it is a verdict on
a shot known to be wrong, which this project already refused once. `d1w` is the current shot and
`docs/ART_ASSET_PROGRAM.md` names its review as the remaining pin.

Its findings, with what I could check at the source:

- **The net does not stand between the two players — right in what is seen, and now with a
  mechanism we did not have.** Compiled staging: receiver `at [0.35,0.57] scale 0.88 entrance
  background`, server `at [0.65,0.602] scale 0.88`. The `entrance: background` **0.82 scale factor
  never reaches the drawn scale**, so both bodies are 0.88 and read as equidistant. The
  compositing order is not the problem — the net is one layer at depth 45, the receiver z 40, the
  server z 50. Its other mechanism claim (tape behind, mesh in front) is wrong, and the record
  says so rather than repeating it.
- **The shuttle never crosses the net — right, mechanism named.** A palm-bound prop paints in
  `data-layer="native-interaction-props"` at `zIndex: 50` (`PerformanceEpisode.tsx:152`), above the
  net's declared plane 45, so the shuttle draws over the net in every frame. D1's defect is closed
  for actors and **still open for props**.
- **"No arc, no bounce" is contradicted by the bake and true as a perception.** At this HEAD
  `node tools/prop-track.mjs episodes/a-badminton/performance.json shuttle` prints apex 321.82 at
  2.375 s, contact 682.27, hop apex 602.70, contact 688.37, rest 691.00, with `struck` at 2.207 s
  `[-533,-447]`. What the reviewer saw is the camera's doing: ±25 px jolts and a 2 px/frame pan
  the wrong way over a 35 px hop, at 852×480. That sharpens R2 and R3, it does not answer them.
- **The rendition is 852×480, not 1280×720.** `ffprobe` on all four renditions: `er` and `r1r4` are
  1280×720, `d1w` is 852×480 because its render command carried `--scale 0.6666666666666666` on a
  manifest that was already 1280 wide. The reviewer never upscaled, so the verdict is the stricter
  reading — but it is not the acceptance size, and the next rendition is rendered at 1280.
- **The pickup's crouch reads as levitation** at 852×480 (t 1.2–1.9 s). No earlier review saw it;
  it is owed as its own finding, not folded into R5.

## 3. What is green at this HEAD

`npm test` **336/336, fail 0** (2 m 14 s); `npm run smoke` **exit 0**; `npx tsc --noEmit` exit 0;
`git diff --check` clean; `bash episodes/a-badminton/artifacts/sa1-d1w-2026-10-21/verify.sh` exit 0
(episode `78bfdefe…`, video `2ad11717…`, 132 frames, stills re-cut). Four commits, none pushed:
`340aa90` the cast consent · `5738385` the cast review stills · `7b1869e` the verdict · `3f323d5`
the roadmap facts.

To see the state this claims:

```
git -C /home/z/vibe/agentic-animation log --oneline -4 && git -C /home/z/vibe/agentic-animation status --short
node tools/prop-track.mjs episodes/a-badminton/performance.json shuttle
```

## Decision needed

**One, and it is the person's, not yours:** open the four images and say whether the new cast
stands. Everything else on this round is decided: the two defects are mechanism, not taste, and the
next package is named below.

## What I would do next, if you say go

One package, ~40 minutes: apply the entrance's 0.82 scale to the drawn actor, put a palm-bound prop
under the declared depth order instead of at a flat `zIndex` 50, re-bake, re-render at **1280×720**,
and take a fourth blind review. The rally question is untouched — it is still with the person, and
`docs/ART_ASSET_PROGRAM.md`'s slice B was neither opened nor used.

## Not exercised

`npm test` was run at this HEAD but not after the media/script commit (`5738385`) — that commit adds
one `.mjs` tool and images, no code under `packages/**`. The cast stills' figure scale is the
staging ladder's one-actor value (0.92) and is stated as such; a two-actor shot draws the same
figure at 0.88. The stills are tracked images in `docs/media/`, against the repository's default of
not committing generated media — the reason is in `docs/media/README.md`, and you asked for
openable paths.

## One correction to the house shape

This directory's README fixes **four** header lines and says `to:` is not one (it was renamed
`mail/`→`inbox/` on 2026-10-21); your task asked for five. I wrote the four this directory owns, and
flag the difference here rather than inventing a fifth line this file's own rule deletes.

## Effort

Reading: four images, one 5.5 s video, one verdict. Answering: one look by the person at four
images. The next package is one renderer fix, one re-bake and one review.
