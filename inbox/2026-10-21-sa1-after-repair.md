kind:    report
from:    agentic-animation (manager, milestone S-A1)
spend:   idle-compute, machine_time
id:      the contract `inbox/2026-10-21-next-contract.md`, answering the verdict `inbox/2026-10-21-sa1-review-verdict.md`

# S-A1: every blocking item closed, R1 and R4 landed, re-rendered and reviewed — the second blind review says FAIL on the net, and that needs your decision

## The verdict first

A fresh blind reviewer (run `f461a433`, given only the five stills and the video of the
repaired rendition) answered **FAIL**. Its text is filed verbatim at
`evidence/tickets/S-A1-REVIEW-2.md`. Its primary finding is one neither earlier reading made:

> Both figures stand on the camera side of the net at all five still times … the players are
> drawn over the mesh; shoe soles bottom at y 382–387 while the net posts' bases stop at y 368.

**That is a compositing fact, not a staging one.** Every actor draws above the set, so no
staging value can put a figure behind the net. The shot therefore has no net between its two
players, and a serve that crosses one cannot be delivered by any rendition with this renderer.

It found four more, each sufficient alone and each already in our records: no hand contact at
frame 0 (the release is in the intent, not the video); the camera locked for the last 3.0 s
(jersey centroids fixed to 0.1 px for frames 61–131 — R3, now measured precisely); the last
0.79 s byte-identical frames (that is R5's statues plus R3's locked camera plus a *correct*
rest, not a rendering fault); and the rest off court beside the bench (the 1440–1560 px
downrange lands on the wood).

## What landed (each at a named revision, none pushed)

- **All six blocking items of the first verdict are closed.** The /tmp artefact lives in
  `episodes/a-badminton/artifacts/sa1-er-2026-10-21/` with its video committed, its identity
  and a `verify.sh` that recomputes every field; the `make` warnings are recorded with the
  arithmetic that makes them the physics of the descent; `motor.diagnostics: []` is stated as
  the encoding it is (the compiler omits the key when empty, the CLI prints one line per
  entry and printed none); `tools/prop-track.mjs` takes the floor from the set, prints each
  frame's gap and states the rest as ON the line or how far above; the "EA named it *could
  not land 1*" attribution is gone (it was the review's finding, not the producer's); the
  head-cut claim is corrected (real at `zoom: 1`, absent at this shot's 0.75).
- **R1 landed** (`bfa837d`): a prop declared `projectile` lands on the set's lowest declared
  surface. Negative control: the new test failed at y 650 against the 691 floor before the
  fix; the episode now bakes `projectile.settled` at 3.717 s `[476.56, 691]` where it was
  `[509, 650.16]`, and every resting frame is on the painted floor line.
- **R4 landed in part** (`c38c782`): `stageWidth` 130 → 116 (~2.6×/2.8× a real shuttlecock →
  2.4×/2.5×). Real size is refused by the engine, and I measured both sides of the boundary
  myself: at 115 the native pair's receiver fails `segment-angle-rate/hand_r 8.419 > 7.000`;
  below 72 even a legacy-figure strike stops touching the shrunken contact body. Drawn size
  and the physical body the palm must touch are one declaration. **The occlusion clause did
  not land**: the first contact lands at the receiver's own x and a held prop draws above the
  actor layer, so the cure is staging (R5) or framing (R3).
- **Re-rendered** into `episodes/a-badminton/artifacts/sa1-r1r4-2026-10-21/` (132 f / 5.500 s
  / 1280×720, video `29ca57f4…`), with the stills cut at the first review's own times so the
  two verdicts judge the same beats.
- **Green at this HEAD**: `npm test` 334/334, `npm run smoke` exit 0, `npx tsc --noEmit`
  exit 0, `git diff --check` clean, `check` and `make` on the episode exit 0, both renditions'
  `verify.sh` exit 0. 15 commits, none pushed.

## Decision needed (this is the terminator, not a repair)

**Does the 2D convention stand, or does the renderer buy depth?** Either the shot is accepted
with both figures in front of a painted net — the convention most 2D animation uses, and what
this record's own stills show — or the engine grows per-actor depth against a declared set
layer, which is a feature with a cost and touches the compositor. Nothing I can land decides
it. Alongside it: R2 (does a 88 px then 21 px hop read), R3 (the follow pans ~120 px and locks
for the last 3 s) and R5 (the players are statues) stay yours.

## What I would do next, if you say "keep going"

The cheapest thing that could move the reading is **R5 + a shorter follow** — a receiver who
reacts and a camera that does not lock — because those two are what make the last 3 s look
dead, and both are decisions already on the table. The net is the expensive one.

## Evidence pointers

- `episodes/a-badminton/artifacts/` — both renditions, each with `bake-identity.json`,
  logs, the committed video and `verify.sh` (exit 0 = intact).
- `episodes/a-badminton/REVIEWS.md` — both verdicts, what each forced, and the net finding
  stated for the next reader; `README.md` — what the episode is and what it cannot do.
- `docs/0_ROADMAP.md` §"The repair workset" (R4's partial landing stated as partial)
  and §"Current facts"; `evidence/tickets/SLICE-A-ENGINE.md` (E1's old scene caveat).
- Commits: `f681cb5` artefact home · `02831e7` four falsified claims · `806f3b6`
  `mail/`→`inbox/` · `bfa837d` R1 · `c38c782` R4 · `da9b8bb` repaired rendition ·
  `3bd40ac` review 2.

## Effort

Reading: two artefacts (a 5.5 s video, five stills each) and two verdicts. Answering the
decision costs a direction call; buying the depth feature costs a package and a compositor
change. Nothing here is waiting on more measurement.
