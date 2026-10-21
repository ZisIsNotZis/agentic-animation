# Asset programme: three new situations

The user's decision (2026-10-18) is that proving the method generalises requires
**genuinely new assets, not recolours**, in two or three fully functional sets that
span as large and complex a space as the engine can carry, exercised by motion families
other than "pick up a thermos". Scope: three independent vertical slices, each with its
own new assets and accepted on its own — no combined film, because a cross-slice montage
would only demonstrate transitions, which M6 already owns. This document is the
programme's roadmap — milestone owed upward, packages that reach it, measured facts each
starts from, where the artefacts are; package detail (hooks, falsifications, limits, and
the landed packages' mail files) is in [tickets/SLICE-A-ENGINE](tickets/SLICE-A-ENGINE.md).

## The three slices

- **A · badminton.** Two native figures in the hall; the shuttle is a real projectile
  with gravity and a bounce; contact is instantaneous at the hit; the camera tracks the
  shuttle. **Narrowed 2026-10-21, and the person accepted the narrowing:** a serve, its
  40° arc, its bounce and a following camera — not a rally. One 40° elevation, a settle
  1440–1560 px downrange, no authored toss and a 0.09 s contact window narrowed it.
- **B · giant swing on a high bar.** A different body type rotates a full circle about a
  fixed bar while a second figure reacts; the support is the bar, not the ground.
- **C · pouring tea.** A host tilts a pot into a cup; the tilt is authored intent and the
  stream, cup level and steam are derived from it.

## Cast (four new native figures)

`lin_b_draft` was the only native artwork figure before this programme, and a legacy
puppet cannot act at all (`ART_TRANSFER_M7`). Each slice needs native artwork — five views,
a skeleton per view, hands, expressions, wardrobe — from the M2 pipeline.

| figure | body | slices |
|---|---|---|
| athlete 甲 | tall, lean, sportswear | A |
| gymnast 乙 | compact, heavy build, chalk-white hands | B |
| host 丙 | older, robe, and the same figure as the tea guest | C |
| spectator 丁 | small build, loud silhouette | A and B (deliberate reuse, measured as such) |

## Capability contract (Wave 0, decided before any slice)

Declared once so three slices cannot invent three vocabularies; behaviour belongs to the
slice that needs it, the declaration lands in Wave 0.

- `support.kind: "hanging"` — a support a body attaches to and rotates about, with a
  declared grip line and a rotation limit.
- `prop.kind: "projectile"` — a prop with mass, gravity, restitution and a contact rule
  for being struck.
- intent `swing` — attach to a hanging support, rotate about it, release.
- intent `pour` — tilt a held vessel about its grip and emit a derived stream.
- the event names each capability emits, so a cue can be attached to it.

A declaration no implementation satisfies must fail loud rather than be ignored, and the
gate selects on the field the episode asked through — `intent`, `support` kind, or `prop`
kind. Since `2836478` it covers all three; before, a `prop.kind: "projectile"` compiled
and the motor ignored it. Since `d281f62` the same rule covers *events*: a declared event
of an implemented capability must have an emitter in `packages/**`, which is why
`swing.events` is now `[]` until slice B restores `swing.grip`/`swing.release` with their
emission.

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

## Acceptance per slice

Each slice is accepted on its own evidence: the episode passes `check` and `make`, the
compiled `audio.cues` names the cues it authored, the render is cut into stills that
carry their bake identity, and an independent viewer review passes at normal viewing
size. **The reviewer may not be the package that built the shot** — a builder grading its
own frames is the failure this rule exists for.

## Roadmap

**Milestone S-A1 — slice A is accepted on its own evidence:** `episodes/a-badminton/`
bakes and renders a served shuttle, its 40° arc, its bounce and a camera that follows it,
and a fresh sight-capable reviewer passes the cut stills at normal viewing size. That
verdict is the observation that decides it; `check`, `make`, the named cues and the
bake-identified stills are its preconditions.

**The narrowing is an assumed decision, not a lost goal — and not the person's answer.**
Corrected by root on 2026-10-21, because this paragraph previously recorded the scope
question as answered. It is not: root recommended *ship the serve* and raised the question
to the person the same day (`mail/2026-10-21-animation-rally-scope.md`), and **no answer has
come back**. The sentence is an agent fact of the assumed kind and must never be quoted as
the person's word.

What is true instead: S-A1 proceeds on root's recommendation because it is reversible and
because a reviewer's verdict on one real moving shot is worth more than an argument about a
second hit. If the person says "it has to be a rally", one contact-mechanism package enters
ahead of the episode and the elevation question opens with it; nothing that has landed is
lost. The rally returns as its own package when a contact mechanism widens the two-frame
window, and nothing has been abandoned.

Packages, in this order:

1. **E2 · the serve and the return** — **landed** `35b8ffd`, `a1f848a`, `d281f62`
   (`idle-compute`, 704 s, run `2d29eb2e/task-1`).
2. **E4 · the tracking camera** — **landed** `d40ceec` (`idle-compute`, 410 s, run
   `2d29eb2e/task-2`): `camera.follow(target, {sec, zoom})`, per-frame keys, stage-clamped.
3. **EP · two native figures could not bake together** — **landed** `ead4ac0`,
   `135ee7d`, `54cbe01` (`idle-compute`, run `5b22b313`). The native pair bakes now.
4. **EA · the episode** (`episodes/a-badminton/`) — spend `idle-compute`, 20 min. The
   serve from the hand, `camera.follow(shuttle)`, `force` 1.0–1.2, the arc, the bounce,
   bake-identified stills. **Dispatched** 2026-10-21, run `25e80bfb`; it files
   `mail/2026-10-21-ea-report.md` itself. The return is optional, by EP's exact fixture,
   and S-A1 does not depend on it.
5. **ER · the independent review** — spend `idle-compute`, 10 min, dispatched once EA's
   stills exist and the integrating node has re-run the combined check at EA's commit
   (`npm test`, `npm run smoke`, and `check`/`make` on the episode): the episode is
   compilation the compiler has not seen yet, so a green HEAD is not a green bake. The reviewer is a fresh **builtin `reviewer`** subagent with a
   deliberately blind contract: the still paths and one question, and **nothing else** —
   not this document, not EA's report, not the motor's numbers — because the producer's
   reasoning is exactly what an independent verdict must not inherit. It sees the images
   at normal viewing size (file resolution, no crop, no zoom); if it cannot see image
   content it must answer `NOT SATISFIED: no sight`.

## Current facts

**Where the slice-A engine stands (2026-10-21, after E2, E4 and EP):** all four engine
packages are landed; the episode is the only thing missing. The combined check was 328/328
at `c943d88`, which **predates EP's source commits**, so the integrating node re-ran it at
HEAD (`f92ed55`): **333/333 pass, `fail 0`, 121 s, `EXIT:0`**, plus `npm run smoke` `EXIT:0`
and a clean `git diff --check`.

**What EP changed.** A native serve **and** a native return bake with `diagnostics: []` at
receiver x 1500, beat 2.12 s (strikes at 1.407 s and 2.226 s, both 40.00°), where a native
receiver or server used to refuse the substep with `palm-contact/hand_r NaN` /
`foot-reach/foot_r Infinity`. The cause was a taut push arm clamping its root against a
body *behind* it — an 885 px backward teleport in one substep — and the NaN cascade was
downstream of the stale anchor it left. `foot-reach` now compares against the foot the
motor's own solver lands for that aim; no tolerance widened, no rate gate relaxed.

E2's **0.09 s window is unchanged in character**: EP's staged return also fails at 2.08 s
and 2.16 s, with real rate violations rather than the clamping defect. Owed and not
touched: `advanceSupport` still writes `supportMinimum = Infinity` when an aim leaves its
annulus; it now surfaces by name rather than as a NaN ratio.

**E1 landed** (`2836478`): mass, restitution and the `instant`/`sustained` struck rule
cross the compiler as manifest data; the bake carries `projectile.struck` (velocity) and
`projectile.settled` (position). Its measured arc, bounce ratio and mass scaling are in
the ticket — the numbers the reach facts below constrain.

**Reach and elevation, the six facts that decide the episode:**

1. A strike lands only inside the 137 px arm envelope (staged scale 0.88); a floor or
   support-staged shuttle sits 200+ px below the hand and the motor says so by name.
2. Two actors keep their drawn bodies apart, so a striker cannot reach a shuttle in *the
   other* player's hand. Both the reachable hits are **from the holder's own hand**.
3. No authored toss exists: `release` opens the hand with carry velocity and no upward
   impulse, so a released shuttle falls in ~0.5 s. A toss is a new procedure.
4. The strike elevation is one engine constant, `STRIKE_ELEVATION = 40`. A smash or lob
   needs a `library/action` procedure carrying elevation — deferred until a review says
   one arc does not read.
5. The default `force 1.4` overshoots the painted stage, so the episode authors 1.0–1.2.
6. A return is *mechanism at one pinned staging value*, not a timing: 2 frames wide, and
   EP's fixture (receiver x 1500, beat 2.12 s) is the only one that bakes.

**Slice A assets** are complete and independently reviewed: `set/badminton_hall` (PASS —
eleven declared layers, supports at 691/640), `prop/racket`, `prop/shuttle` (PASS; it now
declares `kind: "projectile"`, `mass 0.05`, `restitution 0.5`, `struck: "instant"`),
`figure/athlete_a` (SHIP — five genuine view constructions, thigh/shin ratio 0.99,
`leg.flexionMax 112`). The `silhouette-holes.mjs` gauge measures enclosed background holes
and limb-axis coverage, finding three crown pinholes.

**Slice B — capability proven, shot blocked on a framing decision that is not ours.** The
swing turns a full −360° with grip error 0.000000 px over 86 frames and zero diagnostics
(`8c66520`), but 1351.5 design px of orbit cannot fit a 1080 stage at any bar or ground
position the YAML can reach, a straight-up mount is singular, and four sub-pixel
invariants keep refusing the mount. The arithmetic and the three ways out are in
`episodes/b-bar-swing/README.md`; the direction question is with the person.

**Slice C — not started.** `intent pour` fails loud; `prop/teapot`, `prop/teacup` exist;
the tea room and two cast members do not.

## Risks

- **One arc is one shot shape.** If ER says a single 40° float does not read as
  badminton, elevation becomes authorable work in `library/action` — a package.
- **A follow cuts drawn heads.** The head rule is deliberately off for a following shot
  (a follow that dodged every head lost its own subject). Unreviewed by eye until ER.
- **Camera cost is quadratic in window length**; a follow longer than ~3 s, or two in one
  episode, opens a memo package. A 1.9 s window on a ≤10 s shot does not.

## Evidence pointers

- `tickets/SLICE-A-ENGINE.md` — E1's measured arc and E2/E4/EP's hooks, numbers, limits.
- `packages/core/src/compiler/capabilities.ts` — the declaration table and the gate;
  `motor/index.ts` — `STRIKE_ELEVATION`, `strikeProjectile`, the push hand drive and its
  `strike missed` diagnostic; `motor/wholeBodyProposal.ts` — the clamps and the by-name
  non-finite refusals.
- `library/camera/follow/index.js` — the recipe;
  `packages/studio/test/cameraFollow.test.ts` and `packages/core/test/{projectile,
  capabilityContract,nativePair}.test.ts` — the proofs.
- `episodes/b-bar-swing/` — slice B's episode and framing arithmetic;
  `tools/art-direction-study/silhouette-holes.mjs`, `limb-depth.mjs`.
