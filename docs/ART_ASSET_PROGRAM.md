# Asset programme: three new situations

The user's decision (2026-10-18) is that proving the method generalises requires
**genuinely new assets, not recolours**, in two or three fully functional sets that
span as large and complex a space as the engine can carry, exercised by motion
families other than "pick up a thermos". Scope: three independent vertical slices,
each with its own new assets, each accepted on its own — no combined film, because
a cross-slice montage would only demonstrate transitions, which M6 already owns and
which is not a goal here.

## The three slices

- **A · badminton rally.** Two new native figures rally across a full court; the
  shuttle is a real projectile with gravity and a bounce; the camera tracks it;
  contact is instantaneous at the hit.
- **B · giant swing on a high bar.** A different body type rotates a full circle
  about a fixed bar while a second figure reacts; the support is the bar, not the
  ground.
- **C · pouring tea.** A host tilts a pot into a cup; the tilt is authored intent,
  and the stream, the cup level and the steam are derived from it.

## Cast (four new native figures)

`lin_b_draft` is the only native artwork figure today, and a legacy puppet cannot
act at all (`ART_TRANSFER_M7`). So each slice needs native artwork — five views, a
skeleton per view, hands, expressions, wardrobe — produced by the M2 character
pipeline, not by recolouring.

| figure | body | slices |
|---|---|---|
| athlete 甲 | tall, lean, sportswear | A |
| gymnast 乙 | compact, heavy build, chalk-white hands | B |
| host 丙 | older, robe, and the same figure as the tea guest | C |
| spectator 丁 | small build, loud silhouette | A and B (deliberate reuse, measured as such) |

## Capability contract (Wave 0, decided before any slice)

Declared once so three slices cannot invent three vocabularies. Behaviour belongs
to the slice that needs it; the declaration lands in Wave 0.

- `support.kind: "hanging"` — a support a body attaches to and rotates about, with
  a declared grip line and a rotation limit.
- `prop.kind: "projectile"` — a prop with mass, gravity, restitution and a contact
  rule for being struck.
- intent `swing` — attach to a hanging support, rotate about it, release.
- intent `pour` — tilt a held vessel about its grip and emit a derived stream.
- the event names each capability emits, so a cue can be attached to it.

A declaration that no implementation satisfies must fail loud rather than be
ignored: an episode that uses `swing` before Wave 2 lands is a compile error.

## Ownership and the conflict rule

The engine's hot files are single-writer and take a token; assets are owned per
directory and never conflict.

| area | owner | rule |
|---|---|---|
| `packages/core/src/motor/index.ts`, `evaluate.ts`, `libraryMeta.ts`, `compiler/index.ts` | one token holder at a time | a capability adds a NEW file plus the smallest hook; no two worktrees hold the token |
| `packages/studio/src/components/performance/Prop.tsx` | the prop-art batch, once | afterwards read-only |
| `library/figure/<name>/`, `library/set/<name>/`, `library/prop/<name>/` | the package that creates it | never edit another package's asset directory |
| `episodes/<slice>/` | that slice's author | — |
| `docs/` | the main agent | no worker edits docs |

## Waves

```
Wave 0  capability contract + schema declarations + fail-loud stub        [1 package]
Wave 1  athlete 甲, badminton hall, prop-art batch                        [parallel, disjoint]
Wave 2  spike: swing feasibility (timeboxed, half a day)                  [1 package]
        E1 projectile + struck contact   → E4 tracking camera
        → E2 hanging swing → E3 pour + stream                             [serial, token]
Wave 1b gymnast 乙, bar set, tea room, host 丙, spectator 丁              [parallel, disjoint]
Wave 3  slice A, then B, then C — each authored once its capabilities land
Wave 4  evidence bundles, M4 material passes per set, independent review, docs
```

The long pole is character art, so figures start first and run while engine
capabilities land. The bar set waits for the Wave 0 schema, because it declares a
hanging support.

## Acceptance per slice

Each slice is accepted on its own evidence: the episode passes `check` and `make`,
the compiled `audio.cues` names the cues it authored, the render is cut into stills
that carry their bake identity, and an independent viewer review passes at normal
viewing size. A capability that only works in one slice is recorded as such rather
than generalised by assumption.

## Risks

- **Swing is the only capability that may not be expressible.** The spike decides
  it before wave 2 commits; the fallback is a pull-up-and-land beat, which needs
  no new support kind.
- **Four native figures is the schedule risk**; each needs five views, a skeleton,
  hands and expressions, and every one of them passes art review.
- **Projectile contact is instantaneous**, unlike every contact the motor has done
  so far, which are all sustained; the struck-contact rule is new work, not a
  parameter.
