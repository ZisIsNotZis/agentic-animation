---
name: qa-stills
description: The visual-review checklist for animation stills — silhouette readability, anti-twinning, house-style conformance, composition. Use when reviewing rendered stills from anim stills (episode QA) or a rigged puppet (character QA) before shipping or approving.
---

# qa-stills

The craft checklist for the stills gate. Visual QA is a **gate, not a policy**
(ARCHITECTURE §12, CLAUDE.md): after `anim stills`, actually **Read every PNG**
with the image tool and iterate **≥ 2 rounds** before `anim render`; `render`
refuses on a stale stills-review receipt (overridable only with `--force` —
don't). The bar is "would I ship this," not "it rendered without an exception."
Use this from [make-episode](../make-episode/SKILL.md) step 7 (episode shots) and
[make-character](../make-character/SKILL.md) step 5 (a rigged puppet).

House style is a **Rajput/Pahari miniature-painting** register: warm grounds,
kohl-ink outlines, gold ornament, flat color fields modelled with soft gradients;
profile-to-¾ faces with almond kohl-lined eyes and arched tapering brows; god
rays / oil-lamp glows / contact shadows / warm per-scene grade / vignette + grain.
If a frame looks like it came from a different show, it does not ship.

## How to run the review

1. Generate the frames: `anim stills --episode <slug>` (start/mid/end of every
   shot). For a puppet, render it in several poses + a couple of visemes.
2. **Read each PNG individually** (the image tool — never a text description).
3. For each frame, walk the checklist below and write down concrete defects with
   the shot id + timestamp.
4. Fix in `storyboard.json` / `script.json` (episode) or the parts/pivots
   (character) — or flag a character asset for `make-character`. Regenerate.
5. **Look again. Iterate at least twice.** Only a frame you have looked at and
   judged shippable passes.

## Checklist — read every frame against all of these

### 1. Silhouette readability
- Is the character instantly readable as a solid shape, before color? A pose
  whose silhouette is ambiguous (limbs merging into the torso, a gesture lost
  against the body) reads as mush at video scale — re-pose it.
- Is the emotional beat legible from the silhouette + face alone?
- **Painting, not puppet:** no visible joint circles / seams / "mannequin" look;
  limb chains and torso read as one continuous tapered ink contour; garment
  masses carry interior fold strokes. The mannequin look is a ship-blocker.

### 2. Anti-twinning (any group: crowds, armies, brothers, a repeated actor)
- No two adjacent figures share the same height/build/skin/garment/headgear/
  pose-phase. Vary them; use uneven spacing, not a grid.
- Adjacent figures may **not** share garment color *and* headgear.
- Named characters must differ in **silhouette**, not just palette — if two
  characters are only told apart by color, fix the shapes.

### 3. House-style conformance
- Kohl outlines, gold ornaments, modelled flat color — present and consistent?
- Faces in the profile-to-¾ register with almond kohl eyes + tapering brows;
  expression via face dials, never rubber-hose distortion.
- Lighting pass present (rays/lamp glow/contact shadow), warm grade + vignette +
  grain applied — not a flat unlit canvas.
- Ornaments are worn bands (rotated ellipses that sit on the form), never
  floating circles.
- Iconography correct for the character (skin tone, marks/`tilak`, crown,
  weapon, `vāhana`) and grounded — no invented attributes.

### 4. Composition grammar
- Nothing important is cut off, badly overlapping, or off-canvas; subjects sit in
  a deliberate frame, not dead-center by accident.
- Named shot intent reads (`wide`, `two-shot`, `close-up`, `processional`,
  `hero-frame`). **Every episode needs at least one close-up at an emotional
  peak** — verify it exists and lands.
- **Safe area / subtitle clearance:** the lower band stays clear for captions; no
  face or key action buried under where the subtitle sits.
- Facing: actors face into the action / each other as the beat requires, not out
  of frame.

### 5. Scale & continuity
- Actor `scale` values look consistent with the set and with each other
  (a "king" isn't accidentally child-sized next to a servant).
- Position/facing makes sense against the previous beat — no teleport or
  sudden flip mid-shot.

### 6. Narrative sync
- The pose + facial expression at a timestamp matches the **line being narrated
  at that time** (cross-check the shot time against `timeline.json` and the
  scene's `display`/`tts`). A blessing gesture over a line of grief is a defect
  even if it renders cleanly.

### 7. Manuscript identity (episode-level, spot-check on the poster / title frames)
- Film renders inside the illuminated Pahari margin frame (dark rule + ornament
  band); title/end cards are calligraphic folios; the colophon cites the corpus
  file paths the episode is grounded in.

## Common defects → where to fix

| Symptom | Fix |
|---|---|
| Limbs merge / pose unreadable | re-pose the `beat` (pose/face) in `storyboard.json` |
| Two figures look identical | vary build/garment/headgear/pose-phase; differ the silhouette |
| Face/action under the subtitle band | raise the subject or reframe `camera` (y / z) |
| Mannequin joints, flat unlit look | character asset problem → flag `make-character` (re-cut/re-rig) |
| Wrong expression for the line | align the beat's `at` / `face` to the narrated line via `timeline.json` |
| Off-canvas / cut-off subject | adjust actor `at` / `scale` or the `camera` keys |
| No emotional close-up anywhere | add a `close-up` shot at the peak scene |

## Non-negotiables

- **Read the pixels.** A described frame is not a reviewed frame.
- **≥ 2 iterations.** One pass is not review.
- **A change that hasn't been rendered to stills and looked at does not ship.**
