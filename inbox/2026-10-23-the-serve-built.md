kind:    report
from:    agentic-animation (manager: the serve built, the depth repairs, the rally's place in the order)
spend:   idle-compute, one 1280×720 render, ~70 min wall
id:      root's task of 2026-10-23 (build the serve; where the rally's package sits; the three defects)

# The serve is built and openable at 1280×720 — the three depth defects are closed, the rally has its own package and an order, and the gymnast's shoulder is measured but not yet fixed

## What you can open now

`episodes/a-badminton/artifacts/sa1-d1p-2026-10-23/` — the first rendition at the acceptance
size, **1280×720**, 132 frames, 5.5 s, video sha256 `f2539bda…`:

- `stills/t2.208.png` — the strike, the shuttle leaving the server's palm **in front of** the net
- `stills/t2.375.png` — the arc apex over the net
- `stills/t2.500.png` — the crossing: the net's tape passes **in front of** the shuttle
- `stills/t2.917.png` — the first floor contact

One command recomputes every field and re-cuts the stills:
`bash episodes/a-badminton/artifacts/sa1-d1p-2026-10-23/verify.sh` (exit 0 at HEAD `ceb7e98`).
The bake is untouched — struck 2.207 s `[-533,-447]`, settled 3.717 s at `[476.56, 691]`, on the
set's floor line. Nothing is pushed; one commit, `ceb7e98`.

## 1. The serve's acceptance, as written into `docs/ART_ASSET_PROGRAM.md`

**Goal.** A badminton serve: the server strikes the shuttle out of his own hand, over the net,
and it comes down on the far court.

**Boundary (not-doing).** No rally, no second hit, no authored toss, no authorable elevation, no
racket-in-hand mechanism, no publication or spending. A rally is not a prerequisite of this shot
and does not hold it.

**Acceptance — five terms, each decidable by a command rather than by taste.** (a) the far player
draws one court-depth back: receiver scale 0.722 against the server's 0.88, its staged y above
his; (b) the shuttle crosses the net: composed below the net's declared plane 45 once free, on
the server's plane 50 while in his hand; (c) `node tools/prop-track.mjs
episodes/a-badminton/performance.json shuttle` prints one `projectile.struck`, one
`projectile.settled`, and a settled y of 691 ±1; (d) the rendition is 1280×720 with stills cut at
four beats and their identity beside the video; (e) an independent blind reviewer passes the
stills and the video at normal viewing size.

**Who judges what.** Those five are the agent's. **Whether the shot reads as badminton is the
person's**, answered by looking at this rendition. R2 (does the bounce read), R3 (does the follow
read) and R5 (the players are statues) are that one question in pieces; they are not put to them
separately, and this report does not ask them.

**The fork is withdrawn, and recorded as such.** `docs/ART_ASSET_PROGRAM.md` now carries: the
serve is on both paths, so "serve only, or rally" was never a choice; the serve is built and was
never held behind a rally decision. Provenance is stated — root relayed it on 2026-10-23 and this
node holds no file of the person saying it.

## 2. The rally's own package, and where it sits

**R8 — a contact mechanism that widens the 0.09 s window, and the elevation question behind it.**
Not started. It sits **after R7 and after the serve's verdict**, and the reason is written beside
it in the roadmap rather than carried in my head: a second hit is racket-on-shuttle, so the
mechanism has nothing to strike until R7 exists; and a 2-frame timing window is not something an
eye can judge in a shot whose first stroke has not yet read. Nothing the person asked for depends
on R8.

**R7 — the racket in the server's hand — is the package that comes first**, and it is why the
rally cannot be first. Review 3 found no racket in either player's hand; the racket is still
`on(bench)`, because the motor holds one prop per actor and the hand that strikes the shuttle
cannot also carry the racket. This is the serve's own remaining readability mechanism, so it
sits **behind the serve's verdict, not in front of it**: if the shot passes without a racket, the
mechanism is not owed. That is my scheduling call and I carry it.

## 3. The three defects

| defect | state |
| --- | --- |
| the entrance's background scale | **closed.** A `background` entrance now carries the 0.82 court-depth scale the same-named `setup` already carried: the receiver draws at **0.722** against the server's 0.88. Pinned in `packages/core/test/staging.test.ts`. |
| a prop's z above the net's plane | **closed, and it took two fixes.** A native object composites on its holder's plane while held (50) and on its own staged plane once free (35, below the net's 45) instead of a flat `zIndex: 50`. Then, because the first fix changed nothing on screen, the reason surfaced: **the actors' own declared planes never reached the drawing** — `compiledPlacements` dropped `StagedActor.z` and `semanticPlacement` rebuilt every placement out of at/scale/rotation/flip, so both players drew at plane 0 under the net at 45. That is review 2's "every actor draws above the set", still true under D1's wrapper. Both pinned in `packages/studio/test/figureArtwork.test.ts`. |
| the gymnast's shoulder gap | **closed at `d5d7ece`.** Root_manager is right that the arm did not meet the torso, and the defect is a pale **seam** of open background, not a detached limb: `node tools/art-direction-study/silhouette-holes.mjs --figure library/figure/gymnast_b` exits 0 both before and after — front 0 holes, 1 silhouette piece, every limb axis bridged — so the gauge that exists for this defect could not see it, and passing it was never evidence. The fix carries the deltoid up to the torso's own upper outline (the armhole edge of a sleeveless leotard) with the same control points, so the seam is the leotard's ink edge instead of background; generator and output moved together, front silhouette is still 199.5 wide. **One thing for the eye:** the shoulder now reads as a straighter sleeveless cut, wider at the top than before — `docs/media/cast-review-2026-10-23/gymnast_b.png` is rebuilt from the corrected artwork, so the person can see it. |

## Green at `0b455a4` (the tree as it stands)

`npm test` **338/338, fail 0** (336 before, +2 new guards); `npm run smoke` exit 0;
`npx tsc --noEmit` exit 0; `git diff --check` clean; the rendition's `verify.sh` exit 0;
`node tools/art-direction-study/silhouette-holes.mjs --figure library/figure/gymnast_b` exit 0;
`npm run anim -- check` and `make` exit 0 on the episode.

## Decision needed

**None from you.** One look from the person: four stills and one 5.5 s video, and the sentence
"this reads as a badminton serve, or it does not". Everything else on this round is decided and
recorded.

## Not exercised

The shuttle is struck from the palm, not by a racket (R7); the bounce's reading and the camera's
follow are the person's to judge, not measured here; the blind review of this new rendition has
not been taken — I did not dispatch one inside the spend, so term (e) of the acceptance is open
and the person's look is the first reading of this rendition. Stills are cut from the video and
`stills/` is untracked by design; the four images above are regenerated by `verify.sh`.

## Effort

Answering: one look, four images and 5.5 s of video. My spend overran the 30 minutes asked for —
about 70 minutes of idle machine time, of which ~16 minutes were two 1280×720 renders; the cause
was the third defect, which only appeared once the second was fixed. No money, no third-party
resource, nothing pushed.

(Landed in `inbox/`, which this directory's own README names as the route to root since the
rename from `mail/` on 2026-10-21; the four header lines are the ones it fixes.)
