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
2. **`prop.handover` breaks with two non-peer figures.** It binds and cues
   correctly, but the receiver walks hip-to-hip and never separates, both actors'
   arms splay laterally at the bind, and `make` itself reports a teleport at frame
   193 (8.04 s). Every shot after 8 s shows the pair merged into one body. This is
   the defect M7 exists to find: M6 never exercised a handover, so the two-actor
   case was never proven.
3. **Prop staging cannot be read.** At the authored scales the drawn register
   matches neither `prop/scroll`'s art nor `prop/desk`'s.
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
body — which is exactly what `prop.handover` does.

## Verdict

M7's claim is **partially supported**: the pipeline, camera, cues, expressions and
single-actor contact all transfer unchanged; the world declarations, the two-actor
handover and the readable cast do not. The four defects above are the work that
stands between this engine and a second production situation.
