# Asset programme: three new situations

The user's decision (2026-10-18) is that proving the method generalises requires
**genuinely new assets, not recolours**, in two or three fully functional sets that
span as large and complex a space as the engine can carry, exercised by motion
families other than "pick up a thermos". Scope: three independent vertical slices,
each with its own new assets, each accepted on its own — no combined film, because a
cross-slice montage would only demonstrate transitions, which M6 already owns.

This document is the programme's roadmap: the milestone owed upward, the packages
that reach it, the measured facts each package starts from, and where the artefacts
are.

## The three slices

- **A · badminton rally.** Two new native figures play a serve and a return across
  the hall; the shuttle is a real projectile with gravity and a bounce; contact is
  instantaneous at the hit; the camera tracks the shuttle. **Measured correction
  (2026-10-21): "a full-court rally" is not authorable** — a strike leaves at one
  fixed 40° elevation and settles 1440–1560 px downrange, and no authored toss
  exists, so the readable first hit is a serve out of the server's own hand. See
  "Reach and elevation" below.
- **B · giant swing on a high bar.** A different body type rotates a full circle
  about a fixed bar while a second figure reacts; the support is the bar, not the
  ground.
- **C · pouring tea.** A host tilts a pot into a cup; the tilt is authored intent,
  and the stream, the cup level and the steam are derived from it.

## Cast (four new native figures)

`lin_b_draft` was the only native artwork figure before this programme, and a legacy
puppet cannot act at all (`ART_TRANSFER_M7`). Each slice needs native artwork — five
views, a skeleton per view, hands, expressions, wardrobe — from the M2 pipeline.

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

A declaration no implementation satisfies must fail loud rather than be ignored, and
the gate selects on the field the episode asked through — `intent`, `support` kind,
or `prop` kind. Since `2836478` it covers all three; before, a `prop.kind:
"projectile"` compiled and the motor ignored it.

## Ownership and the conflict rule

The engine's hot files are single-writer and take a token; assets never conflict.

| area | owner | rule |
|---|---|---|
| `motor/index.ts`, `evaluate.ts`, `libraryMeta.ts`, `compiler/index.ts` | one token holder at a time | a capability adds a NEW file plus the smallest hook |
| `Prop.tsx` | the prop-art batch, once | afterwards read-only |
| `library/<category>/<name>/` | the package that creates it | never edit another package's asset directory |
| `episodes/<slice>/` | that slice's author | — |
| `docs/` | the main agent | no worker edits docs |

A package runs its own scoped tests plus `npx tsc --noEmit`; the **combined** check
(`npm test`, `npm run smoke`, `git diff --check`) belongs to the integrating node,
because two concurrent runs race on the fixtures `pretest` rewrites.

## Waves

```
Wave 2  E1 [2836478] → E2 → E4 → EA → ER      Wave 1b  bar set, tea room, 丙, 丁 [partial]
Wave 3  slice B, then C                       Wave 4   evidence bundles, M4 passes, docs
```

## Acceptance per slice

Each slice is accepted on its own evidence: the episode passes `check` and `make`,
the compiled `audio.cues` names the cues it authored, the render is cut into stills
that carry their bake identity, and an independent viewer review passes at normal
viewing size. A capability that only works in one slice is recorded as such rather
than generalised by assumption. **The reviewer may not be the package that built
the shot**: a builder grading its own frames is the failure this rule exists for.

## Roadmap

**Milestone S-A1 — slice A is accepted on its own evidence:** `episodes/a-badminton/`
bakes and renders a serve and a return whose struck contact and following camera are
both visible, and a fresh sight-capable reviewer passes the cut stills at normal
viewing size. That verdict is the observation that decides it; `check`, `make`, the
named cues and the bake-identified stills are its preconditions.

Packages, in this order:

1. **E2 · the serve and the return** (`packages/core`) — spend `idle-compute`, 25 min.
   Prove, as tests, (a) a strike on a projectile the striker is *holding* releases it
   from the hand and launches it on the 40° arc, and (b) a second struck contact is
   authorable: `push`'s approach mark must resolve a prop target's **live** x
   (`aimX = target?.x ?? props.get(intent.target!)?.x ?? tx`), and a test must report
   the seconds-wide window in which the receiver's hand can meet the descending arc.
   Last, and cheapest, narrow `DECLARED_CAPABILITIES.swing.events` to `[]` — nothing
   in `packages/**` emits `swing.grip` / `swing.release`, and a declared event with
   no emitter is the same lie the gate closed. The names return, with their emission,
   in the package that bakes slice B's shot.
2. **E4 · the tracking camera** (`packages/studio/src/performance/evaluate.ts` +
   `library/camera/follow/`) — spend `idle-compute`, 25 min. A recipe that follows a
   prop across a declared window, clamped inside the painted stage, with the narrow
   episode able to name it. Stills into `/tmp`, paths in the report.
3. **EA · the episode** (`episodes/a-badminton/`) — spend `idle-compute`, 25 min.
   Authored only after E2 and E4 report, because an episode naming a recipe that does
   not exist fails `check`. Serve from the hand, one return, `force` small enough to
   keep the landing on the painted 1920 (`1.0–1.2`, not the `1.4` default), cues, and
   a README carrying the framing arithmetic.
4. **ER · the independent review** (`/tmp` stills, a sight-capable reviewer) — spend
   `idle-compute`, 20 min. Reads the stills by eye at normal viewing size and answers
   one question: does the rally read? That verdict is S-A1's observation.

## Current facts

**E1 landed** (`2836478`, `mail/2026-10-21-e1-report.md`): mass, restitution and the
`instant`/`sustained` struck rule cross the compiler as manifest data; the bake carries
`projectile.struck` (velocity) and `projectile.settled` (position). Measured on the
library's default action, stage 1920×1080, ground 691:

| quantity | measured |
|---|---|
| strike velocity | `(1166, −979)` px/s, i.e. 1522 px/s at 40° |
| apex above the strike line | 184 px |
| first floor contact | ~1066 px downrange |
| settle | ~1440–1560 px downrange, 1.6–1.9 s after the strike |
| bounce apex / first apex | 0.239 at `restitution 0.5`, 0.035 at `0.2` |
| mass 0.10 vs 0.05 | velocity exactly halved, apex quartered |
| `sustained` rule | never leaves the strike line; slides ~727 px |

**Reach and elevation, the five facts that decide the episode:**

1. A strike lands only inside the 137 px arm envelope (staged scale 0.88), and a
   shuttle staged `center` or `on(support)` sits 200+ px below the hand. A floor
   shuttle is unreachable; the motor says so by name instead of dropping the beat.
2. Two actors keep their drawn bodies apart, so a striker cannot reach a shuttle in
   *the other* player's hand either. The reachable first hit is a **serve out of the
   server's own hand**.
3. No authored toss exists: `release` opens the hand with carry velocity and no upward
   impulse, so a released shuttle falls from hand height in ~0.5 s. A toss would be a
   new procedure, not a staging choice.
4. The strike elevation is one engine constant, `STRIKE_ELEVATION = 40`. A smash or a
   lob needs a `library/action` procedure that carries elevation — deferred until a
   review says one arc does not read.
5. The default `force 1.4` overshoots the painted stage from mid-stage.

**Slice A assets** are complete and independently reviewed: `set/badminton_hall`
(PASS — eleven declared layers, supports at 691/640), `prop/racket`, `prop/shuttle`
(PASS; it now declares `kind: "projectile"`, `mass 0.05`, `restitution 0.5`,
`struck: "instant"`), `figure/athlete_a` (SHIP — five genuine view constructions,
thigh/shin ratio 0.99, `leg.flexionMax 112`). The `silhouette-holes.mjs` gauge measures
enclosed background holes and limb-axis coverage, finding three crown pinholes.

**Slice B — capability proven, shot blocked on a framing decision that is not
ours.** The swing turns a full −360° with grip error 0.000000 px over 86 frames and
zero diagnostics (`8c66520`). The shot does not bake: the bar sat 195 px below the
shoulder (reach needs it ~153 px above, now at y 130–138); a straight-up mount is
singular; `setupY()` fixes the standing line at 0.64×1080 so the 1351.5 px orbit can
never fit a 1080 stage (that needs k ≤ 0.7991, outside the staging ladder); and four
sub-pixel invariants (`leg-annulus` 0.002 px, `support-anchor` 0.029 px, a constant
`grip-contact` 1.119 px, zero-slack rest legs on every figure) keep refusing the
mount. The figure-level fix owed is the `foot-reach` comparison: the drawn foot must
be compared with the target clamped into the leg's reachable annulus, never with a
point on the boundary. `episodes/b-bar-swing/` holds the authored episode and its
framing measurements; the direction question is with the person.

**Slice C — not started.** `intent pour` fails loud; `prop/teapot` and `prop/teacup`
exist; the tea room and two cast members do not.

## Risks

- **One arc is one shot shape.** If a reviewer says a single 40° float does not read
  as badminton, elevation becomes authorable work in `library/action` — a package.
- **The second hit is authoring-timed**, not mechanism-guaranteed: E2 measures the
  window, EA must author a cue inside it. A window too narrow to author makes slice
  A's episode a serve and a bounce, and the milestone report says so.
- **Four native figures is the schedule risk**; every one passes art review, and
  projectile contact is instantaneous where every earlier motor contact was sustained.

## Evidence pointers

- `packages/core/src/compiler/capabilities.ts` — the declaration table and the gate.
- `packages/core/src/motor/index.ts` — `STRIKE_ELEVATION`, `strikeProjectile`,
  `publishProjectileEvents`, the push hand drive and its `strike missed` diagnostic.
- `packages/core/test/projectile.test.ts`, `capabilityContract.test.ts`.
- `mail/2026-10-21-e1-report.md` — E1's numbers and its five findings.
- `episodes/b-bar-swing/` — slice B's authored episode and framing arithmetic.
- `tools/art-direction-study/silhouette-holes.mjs`, `limb-depth.mjs`.
