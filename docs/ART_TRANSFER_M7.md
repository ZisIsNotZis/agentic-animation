# M7 transfer

Roadmap row: "Second layout/character/light situation; double-actor interaction
and unfriendly inputs — quality transfers without starting over; identify
genuinely reusable tools". Progress is owned by [STATUS](STATUS.md).

## The slice

`episodes/m7-transfer/episode.yml` (revision `6bd71a1`) — deliberately different on
every axis the engine can express without being changed: `set/qingyun_courtyard`
instead of the canteen, `figure/aqiang` and `figure/elder` instead of
`lin_b_draft`, `effect.lights_down` for the reveal, and a two-actor
`prop.handover` of an examination register. It was authored from stage prose
rather than copied from an existing episode's skeleton, so the authoring friction
shows up instead of being hidden by a template.

## What transferred (the milestone's actual claim)

| capability | verdict |
|---|---|
| set swap | unchanged — loaded, staged and rendered with no engine or episode work |
| figure swap | unchanged mechanically; **fails visually** — `aqiang` and `elder` share a face and hair, so "authority versus disciple" does not read at viewing size |
| expressions | unchanged |
| `prop.pickup` from a support | unchanged |
| camera subject framing, zoom argument, head rule | unchanged mechanically; **fails compositionally** in this slice — a 1.35 push with a neighbour 30% of the stage away fills the frame with two overlapping bodies, and the 3.3 insert has no subject when the prop is smaller than the torsos around it |
| cues | all four resolve and appear in `audio.cues`; **library gap** — only 4 of the 21 restored sfx have factories, so `object-whoosh.wav` exists but cannot be authored |
| `effect.lights_down` | unchanged with a limit: a targetless global dim, which cannot be aimed at one actor or region, and which carries its own sound so a second sfx doubles it |

## What did not transfer

1. **Declared supports are canteen-only.** `set/qingyun_courtyard` declares no
   `supports` and no M4 layer passes, so `on(counter)` has no counterpart and the
   table had to be staged through a prop support. The M3/M4 world declarations are
   not a general capability yet.
2. **`prop.handover` staged two bodies as one mass.** The two-actor case was
   never proven (M6 never ran a handover); the arm splay and the frame-193
   teleport it exposed are fixed, and the remaining defect was staging: at the
   bind the root distance was 184.8 px against a drawn torso-box reach of
   92.4 px per side, so the drawn gap was **0.0 px**
   and the two robes ran ink-to-ink in the delivered frame. Fixed by rule, not by
   episode: a hand-held transfer pair now keeps `TRANSFER_CLEARANCE` =
   1.5% of the 1280-wide stage frame = **19.2 stage px** (14.4 screen px at 960),
   the smallest gap that still reads as two bodies at viewing size. The receiver's
   approach stop requires it and the body-separation projection restores it at a
   96 px/s creep, so the pair eases apart instead of snapping; only the transfer
   pair is affected — a corridor on every approach shortens the offer reach until
   a cue misses. M7 now binds at a root distance of **204.0 px** (drawn gap 19.2
   stage px = 19.4 screen px at 960 at the 1.35 push), measured background gap in
   the chest band 0 → 15 px and 20/12 → 39/31 px one row up, `make` reports zero
   handover diagnostics, and `packages/studio/test/nativeFigureMotor.test.ts`
   holds the rule. Scope, measured not assumed: the clearance is scoped to the
   offer window because holding the plain approach apart also stops the receiver
   short of the prop, and the M2 scenes have less than the clearance in reach
   slack — `native transfer cue never appears before presentation time` and the
   canonical two-call sweep then reach **no contact at all** (expected cue frames
   73 and 84, actual −1) for every phase of the sweep. So the approach still
   converges to drawn-touch and the pair separates when the offer is armed
   (frame 155, 6.46 s, 0.2 s creep); the shots from the bind onward are separated.
3. **Prop staging cannot be read.** `prop/scroll` is the register — the in-scene
   art is an unrolled scroll with two rollers and ruled lines, with nothing
   scroll-like in `prop/desk` (a table) — but at its declared `stageWidth: 170`
   it drew 119.9 × 64.6 stage px, under a tenth of the frame height, so beside
   634 px figures it read as a plaque. Declared `stageWidth: 302` (scale 1.51):
   the drawn register is **213 × 115 stage px = 16.6% of frame width and 16.0% of
   frame height**, 33.6% × 18.1% of a figure's own height — a 卷册 opened in two
   hands, with the rollers and ruled lines legible at 960. The same declaration
   sizes the scroll in `ai-work-adventure` and `bailan-system`, where it is only
   ever presented, so both gain the same legibility. Old: 9.4% × 9.0% of frame,
   119.9 × 64.6 stage px. Limit found while measuring: a held prop still draws the
   placeholder chip `Actor.tsx` puts at the right hand (`HeldProp`, a 60×24 design
   chip carrying the prop id), and at the 3.3 insert that chip sits over the
   register — a renderer behaviour that applies to every episode, not a scale.
4. **Missing capability: a prop held at scene start.** The prose opens with the
   elder drawing the register from his sleeve; the DSL has no held-at-start
   placement, so a 1.6 s pickup beat is spent buying back a hand state.
5. **Authoring trap:** `{...prop.handover(...), sound.paper_snap()}` fails with
   `Unexpected token '.'` — the spread-override form is an object literal and
   cannot be mixed with a comma-separated call list.

## Only-because-of-the-canteen/lin case

The declared support surface, the layered set look and the readable prop scale all
came from `canteen_counter_m3` and the thermos declarations rather than from the
engine. `lin_b_draft` is also the only figure whose face reads distinct at viewing
size, and the M6 two-shot stayed readable because no one walked into the other
body — the case `prop.handover` finally exercised, which is why the transfer
clearance is now a rule instead of a lucky composition.

## Verdict

M7's claim is **partially supported**: the pipeline, camera, cues, expressions and
single-actor contact all transfer unchanged, and the two-actor handover now
stages by rule (declared transfer clearance) with a readable register; the world
declarations and the readable cast still do not. The remaining defects above are
the work that stands between this engine and a second production situation.
