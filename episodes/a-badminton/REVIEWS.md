# a-badminton — the review record

The verdicts on this episode, filed verbatim or summarised as they arrived, and what each
one changed. The episode's own authoring record — what it bakes, what it cannot do and why —
is [README](README.md). Milestone and workset live in
[ART_ASSET_PROGRAM](../../docs/ART_ASSET_PROGRAM.md).

## S-A1 review (ER) — the shot does not pass yet

ER (fresh `reviewer`, run `b9628190`, blind contract, stills at file resolution plus a
6 fps sample of the video) answered **NOT SATISFIED**; its text is filed verbatim at
[tickets/S-A1-ER-REVIEW](../../docs/tickets/S-A1-ER-REVIEW.md). What it read: the arc and
the court read; the bounce, the rest, the follow and the shuttle's scale do not.

Two of its findings are mechanically checkable, and both need a correction:

1. **The bounces exist — its 6 fps sample stepped over both.** `node tools/prop-track.mjs
   episodes/a-badminton/performance.json shuttle` (landed with this note) prints the path:

   | beat | frame | t | y |
   | --- | --- | --- | --- |
   | apex | 57 | 2.375 s | 329.48 |
   | first contact | 70 | 2.917 s | 635.17 |
   | first hop apex, 62 px | 75 | 3.125 s | 573.44 |
   | second contact | 81 | 3.375 s | 648.32 |
   | second hop apex, 16 px | 84 | 3.500 s | 632.06 |
   | rest, held to the end | 87 | 3.625 s | 650.16 |

   Each hop lasts 4–5 frames, ~0.2 s, so a 6 fps sample lands on one point of it. Its
   perception still holds: a 62 px hop on a 720 px frame, with nothing drawn under it,
   does not read as a bounce. The two rows labelled "contact" are the deepest *sampled*
   frames: the snap onto the surface happens in a substep between two frames, so a
   turning point is always one frame short of the contact it marks — which is why
   `prop-track` now prints the landings and the rest separately from the turning points.
2. **The projectile's floor is not the set's floor — the defect it actually saw.** The
   shuttle is staged at y 691.2 and the hall paints its floor at 691; its contacts are at
   635.17 and 648.32 and it rests at 650.16. It bounces and comes to rest **41–56 px above
   the line it started on**, with no ground shadow at contact, so the still at 3.167 s —
   labelled "the bounce, its apex" — shows a shuttle hanging in empty air. The defect was
   found by the reviews, not recorded by the producer: EA's five limits are swing,
   elevation, toss, head-cut and scale, and none of them is this. The mechanism was
   `supportYAt`, which seeded a projectile's ground with the actor clamp (`groundY`
   0.602 × 1080 = 650) and then accepted only a declared surface with a *smaller* y — so the
   hall's painted floor at 691 could never win. **Fixed in R1** (`bfa837d`): a prop declared
   `projectile` now lands on the set's lowest declared surface, and a raised surface under it
   still wins.

Confirmed by both at the reviewed rendition, and still true of the current one in degree:
the shuttle is drawn ~3× a real shuttlecock at the reviewed `stageWidth` 130 and ~2.4× at
the landed 116 (see [README](README.md) "What the shot could not have" for the boundary and why it is there);
it crosses the receiver's legs; the follow at `zoom 0.75` pans only ~120 px and reads as a
wide; the players never move.

**Corrected: the heads are not cut in this rendition.** The producer recorded a cut "above
the eyebrows from the first floor contact onward"; the review found both heads whole with
margin above them at 2.917 s, and the hair touching the top edge at most at 3.625 s. The
frame arithmetic agrees: the 0.75 follow's frame spans world y 0 → 120 and the drawn hair
tops sit at ≈ 80. The cut is real at `zoom: 1` — which is why 0.75 was chosen — and it is
not present at 0.75, so R3 stays a question about the pan reading as a follow.

**S-A1 is not reached by that rendition.** The shot bakes, renders and is bound to its
revision — the independent viewer did not pass it.

## The repaired rendition (R1 + R4, rendered at `c38c782`)

R1 landed (`bfa837d`) and R4 landed in part (`c38c782`); the episode was re-baked and
re-rendered into `artifacts/sa1-r1r4-2026-10-21/`. Its `bake-identity.json` is the one home
for that rendition's numbers (events, apexes, hops, rest, the set floor it rests on) and its
`verify.sh` recomputes every field — they are not restated here. What is worth saying:

- **The rest now lands on the floor.** `projectile.settled` moved 3.633 s `[509, 650.16]` →
  3.717 s `[476.56, 691]`: the last frame and the whole hold are on the hall's painted floor
  line instead of 41 px above it, and the contacts before it are on that line too.
- **The hops grew with the drop.** 62 px and 16 px became 88.5 px and 20.6 px, because the
  shuttle now falls the full 41 px it used to skip. R2's question — does a hop this short
  read — is asked of the bigger numbers now.
- **Nothing else moved.** The strike is the same 2.207 s `[-533,-447]`, the arc's apex is
  frame 57, and `make` still prints its eight `sudden-move` lines on the descent.
- **R4 bought a little.** The shuttle is 2.4× a real shuttlecock instead of 2.6×, and it
  still crosses the receiver's shoe; the boundary and the reason are in [README](README.md) "What the shot could
  not have". R2, R3 and R5 remain root's, and nothing here presumes them.

A fresh reviewer was dispatched blind against this rendition, as acceptance requires.
