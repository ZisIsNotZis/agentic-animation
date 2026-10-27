kind:    report
from:    agentic-animation (manager: the serve's acceptance recorded, the person's rule standing, R7 opened)
spend:   idle-compute, ~20 min, no metered calls
id:      root's follow-up of 2026-10-23 (the person accepted the serve; carry the order)

# The serve is accepted and recorded, their "not very natural" sits beside it as an observation, their depth rule is now the programme's acceptance rule, and R7 is the next package with its contract written

## What the acceptance closes — and what it does not

**Closes:** milestone **S-A1**, on the rendition `episodes/a-badminton/artifacts/sa1-d1p-2026-10-23/`
(video `f2539bda…`, 1280×720, 132 frames, 5.5 s; episode `78bfdefe…`), together with the three
depth defects package R6 carried (the background entrance's 0.82 scale, a native object's plane,
and the actors' declared planes reaching the drawing at all).

**Does not close:** **R7** — the racket in the server's hand — **R8** — the rally's contact
mechanism — and the elevation question behind it. Also not closed, and now recorded as limits
rather than defects: no authored toss, one strike elevation, and the shuttle at 2.4× a real
shuttlecock because its drawn size and the palm's contact body are one declaration
(`episodes/a-badminton/README.md` owns those).

## 1. Their words, recorded once, with the rendition's identity

`docs/0_ROADMAP.md` §Roadmap now opens the milestone with: accepted 2026-10-23 by the
person on that rendition, **their words verbatim** — “probably yes, not very natural, but again
we prefer vertical improvement, not do everything as best as it can and next step.” — the
provenance line that this node did not hear them and holds no file of them, and **“not very
natural” marked as their observation, not as a defect**. The record says the consequence out
loud: no polish pass is owed on this shot, none is scheduled, and the next move is the layer
below it. `docs/0_ROADMAP.md` and `artifacts/README.md` carry pointers to that one statement, never
a second copy of it.

One honest note about the milestone's own terms: its independent-reviewer clause was **not**
separately exercised on this rendition — their look is the verdict that closed it. The rule that
a builder never grades its own frames still stands for every package under the milestone, and
the record says which of the two did the closing.

## 2. Their rule, standing, and it is checkable

Recorded in §"Acceptance per slice": a layer is accepted at the level where it can be judged,
and the next cut goes deeper — one layer is not perfected before the one under it is begun. Made
checkable rather than inspirational: **no package is dispatched to improve a shot that has
already passed its own verdict, and a "not very natural yet" observation is recorded where it was
made instead of being converted into work.** That is why this round adds no frames, no polish and
no re-render.

## 3. The order carried: R7 now, its contract written, its regression surface counted

**R7 · the racket in the server's hand** is the next package and no longer waits on anything:

- **Goal:** the server holds the racket in his non-striking hand from the pickup to the end of
  the follow-through, while the shuttle is still struck from his palm.
- **Not-doing:** no second hit, no rally timing, no change to the strike's arc, force, elevation
  or staging, no re-polish of the look, and the racket does not swing through the shuttle in
  this package.
- **Acceptance, four terms:** the shuttle's `prop-track` events are unchanged (struck 2.207 s
  `[-533,-447]`, settled 3.717 s `[476.56, 691]`); the bake carries a held-racket channel for the
  off hand and prints no `motor warning:` line; a 1280×720 rendition shows both the racket and
  the shuttle at the strike, planes ordered per D1; and **the six episodes that author
  `prop.pickup`/`hold`/`release` — a-badminton, ai-work-adventure, m5-acting, m6-film,
  m7-transfer, showcase-props — keep their bake numbers**, because the hold model is shared by
  legacy and native bodies.
- **The mechanism, named so it is not rediscovered:** `ActorState.holding` is `string | null` —
  one prop per actor — and the reach model is single-hand, so a hand that strikes cannot also
  carry. The package adds a per-hand hold (`holding_l`/`holding_r`, or `holding: {hand, prop}`),
  parameterises `carryHandAt`, `clearHandHold` and the grip channel by that hand, lets a binding
  name the hand (today it is holder/object/start/end only), and authors the episode's racket
  pickup. The default hand preserves today's behaviour exactly.

**R8 — the rally's contact mechanism, then elevation behind it** — unchanged in place, now that
the serve's verdict is in and no longer gates it. Its reason stands as written: a second hit is
racket-on-shuttle, so the mechanism has nothing to strike until R7 exists.

## Not started, on purpose

R7's implementation. Between the two commits above I had ~10 minutes of the 30 left and a
mechanism that touches the hold model of every prop-holding episode; starting it would have left
a half-built channel in the tree at the end of the spend, which is the thing the person's rule —
next step, not everything at once — argues against. R7 is the next package with its four terms
and its regression surface already written, so the next session starts on evidence rather than on
re-derivation.

## Green at the accepting tree (`e0bf3db`)

`npm run smoke` **SMOKE PASSED**; `npx tsc --noEmit` exit 0; `git diff --check` clean; the
rendition's `verify.sh` exit 0. The last full `npm test` at this line of work was **338/338, fail
0** (`0db71c8`); these three commits touch `docs/` and one artifact README only, and no code.

## Decision needed

**None.** Nothing is pushed. One line for you: if the person wants R7 to be the thing built next,
it is written and ready; if they would rather see something else deepened first, R7 is the only
item this node has opened as "next".

## Effort

Answering: nothing to answer — this is a record. My spend: ~20 minutes of idle machine time, no
metered calls, three commits, no renders.
