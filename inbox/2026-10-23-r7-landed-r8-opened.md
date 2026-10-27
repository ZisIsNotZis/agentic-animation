kind:    report
from:    agentic-animation (manager: R7 landed, the racket is in the server's off hand; R8 opened with its baseline)
spend:   idle-compute, ~1 h 15 min, no metered calls
id:      the loan — carry R7, then R8 if it lands cleanly

# R7 is landed and its four terms are met; R8 did not land and now carries the measurement that says why

## What is now true

**R7 · the racket in the server's off hand.** `episodes/a-badminton/episode.yml` stages the
racket `held-by(server, left)`, so the striking palm carries the shuttle and the off hand
carries the racket from the first frame to the end of the follow-through. The serve is
untouched: struck 2.207 s `[-533,-447]`, settled 3.717 s `[476.56,691]` — the accepting
rendition's events, unmoved. The rendition is `episodes/a-badminton/artifacts/sa1-r7-2026-10-23/`
(1280×720, 132 frames, video `7ffdf630…`, episode `ef3a688d…`).

The **mechanism** is the part that outlives the shot: `ActorState` gains an off-hand channel
(bind / carry / release / socket / withdraw) beside the right hand's untouched one, intents and
binding events can name the hand, `holdsL`/`reachL` cross the bake into `actorPose`'s
`reachLeft` (the drawn left arm solves onto the off-hand point), the whole-body proposal checks
`palm-contact-l` and the handle socket against that LEFT arm, and staging's
`held-by(actor[, hand])` starts a prop in a hand at frame 0. Naming no hand is byte-identical
to pre-R7: the five other prop-holding episodes (`ai-work-adventure`, `m5-acting`, `m6-film`,
`m7-transfer`, `showcase-props`) bake digest-identical, measured before and after on this tree.

## The commands that show it

```bash
node tools/prop-track.mjs episodes/a-badminton/performance.json shuttle   # struck 2.207 s, settled 3.717 s
python3 -c "import json;f=json.load(open('episodes/a-badminton/performance.json'))['sceneTrack'][0]['motor']['actors']['server'];print(f[0].get('holdsL'),f[0].get('holds'),f[-1].get('holdsL'))"
# racket None racket   — the off hand carries it, the striking hand never does
bash episodes/a-badminton/artifacts/sa1-r7-2026-10-23/verify.sh           # exit 0: both hashes, 132 frames, stills cut
npm test                                                                  # 344/344, fail 0 (338 before + 6 new in packages/core/test/handHold.test.ts)
npm run smoke                                                             # SMOKE PASSED
npx tsc --noEmit                                                          # exit 0
```

**A look worth taking:** the strike frame, both props in view, the racket on the server's plane
in front of the net:

```bash
xdg-open episodes/a-badminton/artifacts/sa1-r7-2026-10-23/episode.mp4
xdg-open episodes/a-badminton/artifacts/sa1-r7-2026-10-23/stills/t2.208.png
```

## Two assumptions this loan took, written so they read as assumptions

1. **The shot opens with the racket already in his hand.** R7's contract said "the episode's
   pickup of `prop/racket` into the off hand"; a bench pickup would add ~3 s of walking to a
   shot the person has accepted *and* move the strike time that R7's own term (a) pins to
   2.207 s. I chose the shot's acceptance over the pickup beat. The left-hand pickup exists and
   is proven — `prop.pickup(server, obj, {hand: "left"})`, `packages/core/test/handHold.test.ts`
   — it is simply not in this shot. Putting it in frame is one authored beat; if root reads
   R7's contract as owing it on screen, say so and it is the first thing I author.
2. **The off-hand carry pose is mine, not the person's taste.** Hand at his side, slightly
   behind the shoulder, racket head up. I tried a forward carry (hand in front of the hip) and
   it drew the racket head across his chest and over the shuttle, so it was reverted the same
   hour; the rendered frames are what both versions looked like.

## R8 did not land, and what it now has

R8's blocker (no racket to strike with) is gone, but widening the return's window is an
**interception solve**, not a tolerance change, and I would have left a half-built mechanism in
the tree. Instead it now carries the measurement, on EP's fixture, across eleven cues
(1.90–2.40 s): **exactly one (2.12 s) lands a second `projectile.struck`**. The others fail as
a plain `strike missed` (at 2.16 s the hand arrives at `(1505,389)` at 2.375 s while the
shuttle passed `(1513,427)` at 2.25 s and bounced) or as `whole-body proposal exhausted` on
`joint-rate/elbow_r` / `segment-angle-rate/hand_r`. The numbers that decide the design: the
shuttle sits inside the hand circle ~0.07 s and inside the arm's 137 px envelope ~0.39 s. R8's
contract is in `docs/0_ROADMAP.md` §Roadmap with four bake-level terms (six of eleven
cues must land) and the mechanism it expects to add. **R8 is the next package and needs its own
session.**

## Two defect classes found on the way (both permanent)

1. **`verify.sh` ate its own still list.** Every rendition's script piped the still list into a
   `while` loop around `ffmpeg`, which reads stdin: it cut `500.png`/`717.png` from fragments of
   the next name and silently skipped two stills the identity lists. Fixed with `-nostdin` in all
   five scripts, in `2217285`; the class is "a tool that reads stdin inside a loop over a pipe".
2. **A motor-driven prop is drawn at scale 1 while the stage scale sizes the motor's box.** The
   racket's declared `stageWidth` 340 (scale 1.7) builds its touch box and handle socket, but
   `evaluatePerformance`'s motor path writes `scale: 1`, so the drawn handle sits ~11 px below the
   socket. The shuttle has the same mismatch, and that is where its accepted "2.4× real" size
   comes from. Fixing it would move an accepted shot, so it is recorded in
   `episodes/a-badminton/README.md`, not fixed here. The class is "the drawn size and the
   physical body are one declaration" — the same class R4 named.

## What is green at this tree (`1a9ed4f`, pushed to `origin/main`)

344/344 tests, `SMOKE PASSED`, `tsc --noEmit` exit 0, `git diff --check` clean, the episode's
`check`/`make`/`render-yaml` exit 0 with zero `motor warning:` lines, the rendition's
`verify.sh` exit 0, and the five other prop-holding episodes bake digest-identical.

## Decision needed

**None while the loan holds.** One thing for the person on return: whether the racket's pickup
belongs *in frame* (assumption 1). It is one authored beat and it costs the shot's current
timing; the person's rule ("next step, not everything at best") is what I read as "not now".

## Effort

Answering: nothing to answer. My spend: ~1 h 15 min of idle machine time, five commits, one
render (43 s of encode), no metered calls.
