# a-badminton — the review record

The verdicts on this episode, filed verbatim or summarised as they arrived, and what each
one changed. The episode's own authoring record — what it bakes, what it cannot do and why —
is [README](README.md). Milestone and workset live in
[ART_ASSET_PROGRAM](../../docs/0_ROADMAP.md).

## S-A1 review (ER) — the shot does not pass yet

ER (fresh `reviewer`, run `b9628190`, blind contract, stills at file resolution plus a
6 fps sample of the video) answered **NOT SATISFIED**; its text is filed verbatim at
[tickets/S-A1-ER-REVIEW](../../evidence/tickets/S-A1-ER-REVIEW.md). What it read: the arc and
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

## S-A1 review 2 — the repaired rendition, refused on the net

A second blind reviewer (fresh context, run `f461a433`, given only the five stills and the
video of `artifacts/sa1-r1r4-2026-10-21/`) answered **FAIL**; its text is filed verbatim at
[tickets/S-A1-REVIEW-2](../../evidence/tickets/S-A1-REVIEW-2.md). Its primary finding is one
neither earlier reading made:

> Both figures stand on the camera side of the net at all five still times … the players are
> drawn over the mesh (torsos at x 505 and 755 are jersey-blue where the control column x 600
> shows mesh; shoe soles bottom at y 382-387 while the net posts' bases stop at y 368).

That is a **compositing fact, not a staging one**: every actor draws above the set, so no
staging value can put a figure behind the net. The shot therefore has no net between its two
players and no serve that crosses one, and the milestone's sentence cannot be delivered by
the rendition — or by any rendition with this renderer.

Four further failures, each sufficient on its own, and each one this record already owned:

- **No hand contact.** At frame 0 the shuttle is already airborne, 109 px clear of the
  player's leg; the release beat is not in the video, only in the intent.
- **The camera locks.** Measured: both jersey centroids fixed to 0.1 px for frames 61–131
  while the shuttle crosses 284 px. That is R3, and the reviewer's numbers are the sharpest
  statement of it so far.
- **The last 0.79 s are byte-identical frames.** That is not a rendering fault and not a
  settle defect: the shuttle is correctly at rest, the camera is locked (R3) and the players
  are statues (R5), so nothing moves. Three known facts reading as one.
- **The rest is off court**, left of the net post beside the bench — the serve's 1440–1560 px
  downrange land on the wood, which the first review also saw.

**What that means for the next reader.** R1 and R4 were necessary and are landed, and they
did not make the shot pass — the first verdict predicted exactly this ("R1 alone will not flip
the verdict"). What is missing now is a decision, not a repair: either the 2D convention is
accepted (both players in front of a painted net, as this record's own stills show) or the
renderer grows per-actor depth against a declared set layer, which is a feature with a cost.
R2, R3 and R5 ride along unchanged.

## S-A1 review 3 — the D1 rendition, refused on the shot as well as on the net

A third blind reviewer (fresh `reviewer`, run `aad0eadc`, 2026-10-23) judged
`artifacts/sa1-d1w-2026-10-21/` on the four stills and the video, with one question and
nothing else. **FAIL**; its text is filed verbatim at
[tickets/S-A1-REVIEW-3](../../evidence/tickets/S-A1-REVIEW-3.md). Unlike the two earlier
verdicts this one measured every frame, so what it found can be checked against the bake.
Three of its findings are one perception and two mechanisms, and the three do not have the
same status:

- **Its size reading is right and the rendition is the odd one.** `ffprobe` says 852×480;
  the other two renditions and `anim.config.json` are 1280×720, and the render command
  carried `--scale 0.6666666666666666` on a manifest that was already 1280 wide. The
  reviewer judged at 852×480 and never upscaled, so the verdict is the stricter reading, not
  the flattering one — but a verdict at 71% of the delivered size is not the acceptance the
  programme asks for, and the next rendition is rendered at 1280.
- **"The net does not stand between the two players" — right in what is seen, wrong in its
  mechanism.** The compiled staging has the receiver at `at [0.35,0.57] scale 0.88
  entrance background` and the server at `at [0.65,0.602] scale 0.88`, so the two bodies are
  drawn at one scale and read as equidistant; the entrance's 0.82 factor never reaches the
  scale. The compositing order itself is correct and not contradictory as the verdict
  supposes: the net is one layer at depth 45, the receiver is z 40 and the server z 50, and
  the tape and the mesh are the same layer. **The named defect is the missing background
  scale, not a split net.**
- **"The shuttle never crosses the net" — right, and now with a mechanism.** A prop bound to
  a native palm paints in `data-layer="native-interaction-props"`, `zIndex: 50`
  (`PerformanceEpisode.tsx:152`), which is above the net's declared plane 45. So the shuttle
  draws over the net in every frame regardless of where it is, and the same defect that D1
  closed for actors is still open for props.
- **"No arc, no bounce" is a screen-space reading that the bake contradicts, and a real
  perception finding anyway.** `node tools/prop-track.mjs episodes/a-badminton/performance.json
  shuttle` at this HEAD gives apex 321.82 (2.375 s), contact 682.27 (2.917 s), hop apex
  602.70 (3.167 s), contact 688.37 (3.458 s), rest 691.00 — the projectile path and both hops
  exist in world space, and the strike is the baked `struck` at 2.207 s `[-533,-447]`. What
  the reviewer saw is what the camera does to that path: ±25 px vertical jolts inside a
  camera that pans 2 px/frame the wrong way, over a 35 px hop at 852×480. The measurement is
  a sharper statement of R2 (does the bounce read) and R3 (the follow) than any earlier one.
- **"The right player lies horizontally in mid-air" (t 1.2–1.9 s)** is the pickup's crouch
  read at 852×480 — the action EA budgeted with silent beats, which no review had seen
  before. It is owed as its own finding, not folded into R5.

**Where that leaves S-A1.** The wrapper half of D1 is landed and correct; what the review
found on top of it is two named defects (the background entrance's missing scale, props
painting above declared depth planes) and a resolution mistake in this rendition. None of
them is a taste call and none is the person's: R2, R3 and R5 stay the person's, unchanged.
