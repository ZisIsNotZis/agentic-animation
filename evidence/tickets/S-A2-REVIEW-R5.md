---
kind:    independent review (S-A2, third), filed verbatim by agentic-animation
from:    fresh viewer (run ad36d067, fresh context, blind contract)
to:      agentic-animation, milestone S-A2, rendition r5
rev:     episodes/a-rally/episode.yml sha256 b1bf6010…, video 7c8ac0a9…
note:    the verdict is the reviewer's, unedited. It read the shot after R9 put
         the racket in the hand; it still reads no strike, and its decisive
         findings are the accepted vocabulary rather than S-A2's rally: a floor
         pickup whose fold reads as a collapse, a serve that is a palm push and
         not a swing, a far player with no racket, and a shuttle that floats.
         Those are packages of their own (slice B's swing, the pickup pose, the
         shuttle asset) and the person's decisions where they touch the
         accepted shot and the cast.
---

# S-A2 · the third independent review — verdict

## Verdict

**NOT SATISFIED.** — The shot never shows a serve or a return: the shuttle is never in either player's hand, the far player has no racket at all, and the shuttle only ever drifts/floats and drops to the floor, so the "serve that comes back" reading doesn't exist on screen.

## What does read

- **Framing and staging (0.0–4.5 s):** two players in blue, a net between them, a lit sports hall with banner and scoreboard — instantly legible as a badminton court, clean rendering, no ink over a face, no cut head in any frame I inspected (0.0, 0.6, 1.4, 2.3, 2.66, 3.3, 4.45).
- **Camera (0.0 → 2.8 → 4.5):** opens wide, pushes in / follows the near player to a medium two-shot by ~2.0 s, pulls back wide from ~2.95 s to the end at 4.5 s. I found no cut and no jump: the composition moves contiguously at 24 fps across 2.60–2.97 and 3.15–3.57.
- **The shuttle is recognisable** as a shuttlecock throughout (shape, cone, cork), and its "landing" at ~3.3–3.35 does read as a shuttle on the floor.
- **The pull-back to the wide at the end** keeps both players in frame and the court/net readable — no bad framing error, no black frame, no freeze (frame-difference scan over the whole clip found no static run).

## What does not read

1. **The shuttle is never in a hand — no serve.** At 0.00 s (frame 0) the shuttle is already lying on the near court at about (690, 440), and it is in open air or on the floor for the entire shot. The near player walks to it, and around **1.05–1.95 s** the shuttle sits *on the racket face* (`/tmp/qa3/scoop.png` at 2.05/2.13/2.22 shows it parked on the racket head) — a scoop, not a toss from the hand. **High confidence.**
2. **The serve pose reads as a collapse.** At **1.10–1.95 s** the near player's whole body is rotated ~60–70°: torso horizontal at knee height, head hanging, legs straight with the feet splayed (`/tmp/qa3/f140.png`, t=1.40). A viewer reads falling / limbo, not a badminton motion. **High.**
3. **No strike at 2.3 s.** At 2.30 he stands with arms folded at his chest, racket held with the head down at hip height, and there is no swing; at **~2.37 s** the shuttle simply detaches from the racket face and leaves. **High.**
4. **The shuttle floats instead of flying.** From ~2.37 to ~2.85 s it drifts level at net height and then sits almost motionless above the net top for roughly 0.3 s (frames 2.60–2.90 at 24 fps show it moving only a few pixels per frame while the camera is static). No arc, reads as a floating prop. **High.**
5. **The far player cannot return it.** He has **no racket anywhere in the shot** (verified at 0.6, 2.66, 2.75, 3.3, 4.45). At **2.66–2.75 s** he raises an empty right hand that stops well short of the shuttle — I measured roughly 45 screen px (2–3 hand widths) at 2.66 (`/tmp/qa3/fw.png`). So "hand visibly at the shuttle" is not met, and "struck back" is absent. **High.**
6. **The reversal at ~2.9–3.2 s is unexplained.** The shuttle reappears beside the near player's racket face at chest height and drifts along with the racket (frames 2.96–3.20), reversing its earlier travel with no impact. Reads as a prop glued to the racket. **High.**
7. **It then drops, not lands as a return.** ~3.2–3.35 s: the shuttle descends vertically beside his foot and ends **standing bolt upright** on the green court, where it stays until 4.5 s. No bounce, no skid, no player reaction — and an upright, motionless shuttle on the floor is itself a small wrongness. **Medium-high.**
8. **Dead air at the end.** ~3.6–4.5 s: both players are static and no one reacts to the shuttle on the court; only the camera pulls back. It reads as an unfinished shot. **Medium.**
9. **Net/depth contradiction between the wide and the medium.** At 1.90 s the far player is clearly drawn behind the net's mesh. In the wide views (0.0 and 3.6–4.5) both players' feet sit on the same screen line (y≈450) and the far player's body occludes the net's bottom tape, so they read as standing on the same side of the net. **Medium** (stylised-2D camera cheat is a plausible defence, but it is visible).
10. **Arms read as a greeting.** With no racket in play, the far player's raised hand at 2.66–2.75 and the near player's extended open palm at ~2.75–2.9 read more like a wave/handshake than badminton. **Medium.**

## What I could not judge

- **Audio:** the file is silent, so I cannot assess impact sound cuing; no sound can rescue a serve/return that isn't on screen.
- **Grip detail:** whether the near player's fingers actually wrap the racket grip at 2.30 (the hand is drawn at the grip but the wrap isn't legible at 720p). Minor either way.
- **Intent:** whether the "serve at 2.3 s" was meant to be a *low scoop serve off the floor*; even under that charitable reading, the return at 2.68 and the flight back still fail.

## Method and confidence

Read the five stills at file resolution, then sampled the video with ffmpeg only (no writes outside `/tmp/qa3/`): 12 fps full-frame sheets over 0–4.5 s, 16 fps and 24 fps strips over 2.20–3.60, and 1:1 crops around the shuttle, the far player's hand, the racket face and the near player's face (`zchain.png`, `cam1.png`, `cam2.png`, `fw.png`, `scoop.png`, `f140.png`, `late.png`, `last.png`). Because the shuttle is small and the camera pans while it moves, I checked every screen-space displacement against the near player's own drift before believing a "jump" — which is why I do **not** claim the shuttle teleports; the float/glide and the glued-to-racket behaviour are robust to camera motion, the exact travel distances are not. Judged at normal viewing size: the failures in items 1, 2, 4, 5 and 6 are all visible watching the clip, not only under a counter.