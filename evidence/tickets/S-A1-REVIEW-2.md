---
kind:    independent review (second round), filed verbatim by agentic-animation
from:    reviewer (run f461a433, fresh context, blind contract)
to:      agentic-animation, milestone S-A1
rev:     c38c782; artefact episodes/a-badminton/artifacts/sa1-r1r4-2026-10-21/ (video 29ca57f4…)
note:    the verdict below is the reviewer's and is unedited. It opened only the five stills and
         the video; it read no document, log, identity or source file in this repository.
---

# S-A1 blind viewer review, second verdict

rev c38c782, artefact episodes/a-badminton/artifacts/sa1-r1r4-2026-10-21/
reviewer: independent, sighted, blind to producer documents. Opened only the five stills, episode.mp4, and frames I cut from it with ffmpeg.

## Verdict

**FAIL**

Criterion violated: beat 2 of the acceptance, "travelling in an arc across the net".
Both figures stand on the camera side of the net at all five still times, so the shuttle has no net to cross, and it never crosses one.
The arc exists as motion, but it is a bounce-arc inside one half of the court, not a shot across a net.

Reproduction (30 seconds): `ffmpeg -ss 4.583 -i episode.mp4 -frames:v 1 f111.png` and look at f111.png. The net's two posts run from the top tape down to y=368; both players' white shoe soles bottom out at y=382-387, i.e. nearer the camera than the net, and neither figure reads as being on the far side of it. At x=505 and x=755 (the two torsos) rows 110-182 are jersey blue and skin, while the control column x=600 in the same rows shows the net's alternating mesh cream (233,223,185 / 185,178,158 / 242,240,220). The players are drawn over the mesh. Same reading in all five stills.

Four more beats fail, any one of which is independently enough.

## Beat by beat, all five stills read once whole at file resolution

| still | what it shows | beat it fails |
|---|---|---|
| t2.208 | shuttle drawn over the right player's raised forearm and torso, at chest height, cork down-left; his fist is closed and empty about 100 px away; a forefinger points at it | "leaving a player's hand" - no contact, and the shuttle cut-out sits flat on his body |
| t2.500 | shuttle above the net tape, between two upright players whose arms hang at their sides; both on one side of the net; no motion cue | "across the net" |
| t2.917 | both players' heads cut by the frame top (skin pixels reach row 0); shuttle oversized beside the left player's shoe, straddling the left net post (x 410-470 against post x 423-428), over the wooden floor outside the sideline | framing; "landing" (it is off court, and hovering) |
| t3.167 | as above, shuttle 41 px further left (x_left 451 -> 410); heads cut again | framing; near-duplicate of the previous beat |
| t4.583 | shuttle at rest at frame-left (x 327-388), outside the court, left of the left net post, in front of the bench and the decorative racket; heads cut at row 0 | "in front of a camera that moves with it" |

Beats as delivered: hand-release absent, arc present but on one side of the net, landing ambiguous, bounce not readable, rest present, camera does not track.

## What the video adds (motion the five stills skip)

Frames cut with `ffmpeg -vsync 0`, shuttle tracked per frame by connected components on the mask (b>=235 and g>=235 and r>=210 and b-r>=5), 5x5 closing then 7x7 dilation, area>=2000. Numbers below are that track; centre = bbox centre in 1280x720 pixels.

```
t      xC     yC     w  h
0.000  688.5  409.0  55 64    already airborne, mid court
1.333  654.5  440.0  79 68    lowest point, beside the doubled-over right player
2.333  639.5  184.0  61 70    apex, 256 px above the low point
2.500  641.0  201.0  60 70
3.000  487.0  358.0  88 88
3.500  378.5  360.5  59 71
3.833  357.5  370.5  61 71    frozen
5.458  357.5  370.5  61 71    frozen
```

1. No hand at t=0. Frame 0 (`f_001.png`) already has the shuttle floating at mid court with a floor shadow (white bbox x 664-712, y 380-437); the right player's trouser column is x 825-844 at row 300, so the shuttle is 109 px clear of the right player's leg and about knee-high. The video therefore does not contain a release either. The only moment a hand nears the shuttle is t~1.6-1.8, when the right player is doubled over with both hands open at floor level and the shuttle then rises past them.
2. The rise is not a bounce. One ascent of 256 px in 1.0 s from below the player's knee up to its apex at t2.375, where the shuttle's top is 74 px above the net's top tape and its cork sits on the tape's own row (cork bottom y 219; tape row y 222, measured in f_057 as the row with 519 near-white pixels across x 300-1100). Then one descent to the floor. A bounce would be a small descent and return near the floor; there is none.
3. The settle is not a bounce. From t3.0 to t3.8 the shuttle slides 130 px left with a +/-10 px vertical wobble (yC 348.5, 349.5, 360.5, 362.5, 370.5), then stops dead.
4. The rest is a frozen frame, not a settle. Frames 113-131 (t4.708-5.458, 19 frames, 0.79 s) are byte-identical (`md5sum` equal), and frames 105-112 are another identical run. The shuttle's bbox is identical from frame 89 (t3.708) to 131. A viewer sees the shuttle sprite unmoved for 1.75 s and a byte-identical frame for the last 0.79 s.
5. The camera does not move with it. Scoreboard dark-bbox left edge: 1038 at t0, 1009 at t2.167 (a 12 percent dolly, bbox width 191->214), then a hard sweep 1045->1128 over t2.208-2.417 after which it leaves frame. From t2.5 to the end the camera is locked: both players' jersey centroids are x=509.7 and x=748.6 to 0.1 px for frames 61-131, and an integer-shift search between f061 and f131 finds best (dx,dy)=(4,-2) at mean abs error 55.53 against 56.49 at zero shift, i.e. no translation. During those 3.0 locked seconds the shuttle crosses 284 px and comes to rest at 26 percent of frame width.
6. The rest position is off court. Shuttle x 327-388 sits left of the left net post (x 423-428) and left of the left player's shoes (x 482-528), on the wood beside the bench.

## Blocking items

None. The five stills plus the video were enough to settle every beat, so nothing is missing and nothing blocked the verdict.

## Where I am inferring, not measuring

- Constant sprite size (w 55-61, h 64-71 px from t0 to the end, while y moves from 148 to 408) means no depth scaling. The px constancy is measured; the conclusion "no perspective scaling of the sprite" is my inference from it.
- The shuttle reads as roughly 4x oversized. Measured ratio: sprite height 71 px against a 395 px standing figure in still t2.208, about 18 percent of body height. The conversion to "4x" assumes a 1.75 m player and a 6.5 cm shuttlecock; that conversion is inference, and by itself I would not fail the stills for it.
- "Both players on one side is an impossible serve" is rules inference on top of the measured layering. The measurable fact is the layering: torsos over mesh, soles below post bases.
- The two players being the same size and standing at the same depth is my reading of the picture (relative sizes), not a measurement.
- The shuttle cut-out overlapping the right player's torso and the bench racket is observed as flat overlap at file resolution; that it implies broken depth ordering is inference.

## Non-blocking observations

- Still-to-frame mapping is exact, so the stills are honestly cut from this mp4: t2.208 = frame 53, t2.500 = frame 60, t4.583 = frames 105-131 (mean abs diff 0.000 each). Two of the names are one frame off the frame they contain: t2.917.png is frame 71 (t2.958), t3.167.png is frame 77 (t3.208). Cosmetic, does not change the verdict.
- Head clipping is in the video, not introduced by cropping: rows 0 of frames 71, 77 and 111 carry skin or hair pixels of both players.
- ffprobe confirms 1280x720, 24 fps, 132 frames, 5.500 s, so the artefact is what it claims to be.

## Residual risks of this review

- I did not hear the soundtrack; if the acceptance includes audio beats, that is unreviewed.
- I read five stills and a sampled frame sequence, not every one of the 132 frames at full resolution; the trajectory table covers all 132 frames through the tracker, but no frame outside the sampled ones was visually inspected for art defects.
- The net/net-post measurement is from the one frame t4.583, where the camera is locked; earlier frames are at a different zoom and I did not repeat the same pixel measurement there.
