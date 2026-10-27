---
kind:    independent review (S-A2), filed verbatim by agentic-animation
from:    fresh viewer (run 3d4a6b93, fresh context, blind contract)
to:      agentic-animation, milestone S-A2
rev:     episodes/a-rally/episode.yml sha256 04b0ac96…, video 4f9e565c…
note:    the verdict below is the reviewer's and is unedited. It was given the
         video and the five stills and no producer claim; its "no visible
         contact" and "one half-court" findings are the ones the next cut
         answers or records, and the recorded limits it names (no racket swing,
         the shuttle's size and fixed orientation, the set's painted court) are
         already in the episode's README.
---

# S-A2 · the independent review — verdict

## `NOT SATISFIED`

The shot does not read as *a serve that comes back*: the shuttle leaves the near player's hand and reverses direction over the net at ~2.6 s, but the other player has no racket and never brings a hand to the shuttle — the reversal happens in mid-air, off nothing — and both players are planted on the same visible half-court in front of a net drawn across the back of the scene.

### What reads

- **0.0–0.4 s** — two players in a badminton hall; net, court, scoreboard, signage are all legible; nothing is cut off at frame edges.
- **~2.2–2.45 s** — the near player straightens up and the shuttle leaves his chest area and rises (0,265 → 0,135 by 2.7 s).
- **~2.6–2.65 s** — the shuttle does reverse: it is at x≈570 at 2.60 s and x≈600 at 2.70 s, and it drifts right thereafter. So the *path* has an out-and-back shape at roughly the right moment.
- **~3.0–3.5 s** — the shuttle descends over the near player's own side and comes to rest on the near court at ≈(920, 415), i.e. it does end on the first player's side.
- Camera, framing and hall are stable; no cut heads, no ink over a face (the shuttle passes *beside* the far player's head at 2.58 s, not over it).

### What does not read

1. **No return stroke — deciding finding.** At 2.583/2.60/2.70 s the far player's right hand is a hand-width (~30 px) from the shuttle's skirt, half-curled and passive; the shuttle reverses at 2.65 s with no visible contact. The far player has **no racket at all** in any frame (inspect 1.0, 2.4, 2.583, 3.3, 4.9 s — both his hands are empty). The shuttle bounces off empty air. Confidence: high.
2. **The near player's extended open palm at 2.50–2.75 s** (hand at ≈675,200, palm open, facing the other player, shuttle 100 px away) reads as a wave / high-five / "over to you" gesture, not a badminton action. Confidence: high.
3. **Net/court geometry contradicts the action.** The far player is drawn *behind* the net (the mesh grid crosses his torso and forearm — visible in a crop at 1.0 s and in the 2.583 s still), yet his shoes are at y≈385 on the same green patch as the near player's (y≈410), which is the *near* half-court, in front of the net's base line (y≈300). No far half-court exists — behind the net is wooden floor and wall. At normal size both men look like they are standing side by side on one court with a net behind them. Confidence: high that the geometry is wrong; medium that a casual viewer names it as the error rather than feeling it as "off".
4. **The "serve" is not struck.** No racket–shuttle contact anywhere in the 5 s: at 2.2 s the shuttle is at chest while the racket is parked at the right shoulder, and the racket never swings at any point in the shot (1.0, 1.6, 2.2, 2.9, 3.3, 4.9 s). The first 1.9 s are the player walking up to a shuttle standing on the floor and folding double over it (1.30–1.80 s) — it reads as stooping to pick it up, with his head down at hip height. Confidence: high.
5. **Shuttle scale and orientation.** The shuttle is 85–100 px tall against a ~395 px figure — about a quarter of a person's height, roughly 4–5× life size — with a black ring at the cork end, so it reads as a cone / lampshade rather than a shuttle. It also keeps exactly the same upright, feathers-up orientation through the entire rise, traverse and drop (2.2→3.3 s). Confidence: high on size, high on fixed orientation.
6. **Passes through the near player.** At 2.85 s the shuttle is half-hidden behind the near player's shoulder, at 2.90 s it is completely invisible behind his torso, and at 2.98–3.05 s it reappears on his other side, larger and *in front of* the net. Screen-wise it looks like it goes through him. Confidence: high on the frames, medium on how much a viewer minds.
7. **Frozen tail.** Every frame from 4.12 s to the end (≈0.83 s, 20 frames) is byte-identical in the difference stream: frame-to-frame luma delta is exactly 0.00 from 4.12 s onward. Nothing moves, not even idle sway. Confidence: high (measured).
8. **The landed shuttle keeps drifting.** It slides right and down from ≈(820,375) at 3.30 s to ≈(910,405) at 3.80 s, then freezes — a resting object travelling.

### What I could not judge

- Whether the shuttle "crossing the net" is geometrically possible: the net's plane and the players' footing are mutually inconsistent, so I can say the shot contradicts itself but not which of the two is the producer's intent.
- Any audio-timed question: the clip is silent and I have no soundtrack, so I only judged picture.
- Fine puppet quality (hand shapes, joint bends) beyond what normal viewing size shows — I did not do a puppet critique.

### Method

- `ffprobe` on the mp4: 1280×720, 24 fps, 119 frames, 4.958 s.
- Read all five producer stills once, whole, at file resolution: `t1.900, t2.250, t2.583, t2.800, t4.200`.
- Contact sheets (written only under `/tmp/qa/`): `fps=12,scale=480:-1,tile=4x4` over 0–1.33 s, then `-ss 1.25/2.50/3.75` for the next three windows; `fps=24,scale=640:-1,tile=4x3` over 2.30–3.45 s; `fps=8,crop=420:440,scale=300,tile=5x4` over the serve phase 0.20–2.55 s.
- Full-size single frames at `-ss` = 0.40, 1.00, 1.60, 2.00, 2.20, 2.45, 2.60, 2.70, 2.85, 2.90, 2.98, 3.05, 3.15, 3.30, 3.80, 4.40, 4.90.
- Motion measurement: `ffmpeg -i episode.mp4 -vf "tblend=all_mode=difference,signalstats,metadata=print" -f null -`, per-frame `YAVG` read out — that is where the 0.00 tail comes from.
- I did not open `make.log.txt`, `render.log.txt`, `verify.sh` or `bake-identity.json`, and I hold no producer claim; every statement above is what the picture showed me.