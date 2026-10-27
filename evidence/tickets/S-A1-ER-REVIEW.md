---
kind:    independent review (ER), filed verbatim by agentic-animation
from:    reviewer (run b9628190, fresh context, blind contract)
to:      agentic-animation, milestone S-A1
rev:     HEAD 70bf431; stills from episodes/a-badminton/episode.yml sha256 fcb4de68…, video 6d3cbca5…
note:    the verdict below is the reviewer's and is unedited. Its "no bounce" finding is
         mechanically wrong and is corrected, with the command, in
         episodes/a-badminton/REVIEWS.md §"S-A1 review (ER)" — the rest stands.
---

# ER · the independent review — verdict

rev: /home/z/vibe/agentic-animation @ `70bf431` (main). Subject under review: the five stills in `/tmp/aa-sa1/` cut from `episodes/a-badminton/episode.yml` (episode.yml sha256 fcb4de68…, video 6d3cbca5…, 132 f / 5.500 s / 24 fps / 1280x720). Reviewer read stills and sampled the video; read-only, nothing edited in the tree.

## Verdict

**`NOT SATISFIED`**

The question: at file resolution, do the five stills read as a serve — a shuttle leaving a player's hand, travelling in an arc across the net, landing, bouncing, and coming to rest in front of a camera that moves with it?

Two thirds of that sentence do read. The shuttle's path does arc from the right player across the net to the left, and the shot's framing does drift. What is missing is the half of the sentence the shot is built to deliver: **it never bounces, and it does not come to rest in front of the camera.**

### Frame and what I saw instead

- **frame 110 / t4.583 s (also 3.333 s onward):** the shuttle is parked upright, cork down, on the far left of frame beside a racquet that stands upright on the floor next to the bench — roughly a third of the way in from the left edge, thigh-height in screen terms, with no shadow and no visible contact point with the floor. It reads as a shuttle leaning on a standing racquet in the corner of the court, not as a shuttle that has come to rest in front of the camera. From ≈3.3 s to the end of the shot — 40 % of the 5.5 s — it does not move at all.
- **no bounce, anywhere:** sampled the video at 6 fps across the whole shot. The shuttle's screen height decreases monotonically from the right player to the left player and then stops. There is no upward rebound in any of the 33 sampled frames: not between the stills at 2.917 s and 3.167 s, and not in the 3.17–4.58 s gap the stills skip. A bounce would be a rise after contact; the shot has no rise after contact.
- **frame 70 / t2.917 s:** the shuttle is drawn at full size over the left player's shoe and ankle, overlapping him, so this beat reads as the shuttle hitting the player's leg rather than landing on the court.
- **frame 76 / t3.167 s:** the shuttle hangs clear of his shoe in empty air with no shadow and nothing under it — floating, not falling.
- **frame 60 / t2.500 s:** the shuttle is drawn over the net's mesh with its body below the line of the top tape, so the net-crossing beat reads as the shuttle passing in front of / through the net rather than over it. (Inference from the 2D layering — the shuttle is painted on the camera side of the mesh — not a measured clearance.)
- **frame 53 / t2.208 s:** the shuttle sits inside the right player's racquet head and overlaps his chest, so the "leaving a player's hand" beat is not visible; the shuttle is simply already there.

### What does read

- The trajectory's shape: high on the right, over the net, low on the left — a serve's arc, in the right order, in the right half of the court.
- Both players stand on the correct sides of the net, in a hall with a court, net, posts, bench and scoreboard that a person recognises at a glance.

## Blocking — stated separately, does not change the verdict

- **Shuttle scale.** Relative to the player standing beside it in the same still, the shuttle is roughly a third of his shin height — on the order of 3x oversized against a real shuttlecock. It reads as a white cone / lampshade rather than a shuttle in flight. Inference, eyeballed against the player in the same frame; no measurement run.
- **No motion in the players.** Feet, arms and posture are identical in every still and every sampled frame; the receiving player never reacts and the serving player's arm is back in a resting pose by 2.5 s. The shuttle is the only thing in the shot that moves.
- **A racquet stands upright, unsupported, on the floor** next to the bench in every frame. It is unexplained furniture, and at the end it is what the shuttle comes to rest against.
- **The scoreboard is clipped by the right frame edge** from 2.5 s on: the away column readout disappears and the panel is cut at x=1280.
- **The camera does not track the shuttle.** The shot stays a wide static-ish view of the whole court; the shuttle travels to frame-left while the camera keeps it in a corner of the frame.

## Method and limits

- Each still read once, whole, at file resolution (1280x720, no crop, no zoom).
- One negative control for the bounce claim: `ffmpeg -vf fps=6,tile=4x3` over `/tmp/aa-sa1/episode.mp4` — the only command run against the artefact. This would have shown an ascending shuttle had there been one; it shows none.
- Not exercised: sub-frame detail between the 6 fps samples, and any judgement about code, bake diagnostics or intent. Those are outside this review by contract, and the mechanical checks were not re-run.
- Confidence: high on *no bounce* and *rest position* (both visible in stills and confirmed in the sampled video); the net-crossing and scale readings are inferences from the 2D layering and from comparing the shuttle with the player beside it.
