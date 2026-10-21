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
  shuttle. **Narrowed 2026-10-21 at `assumed`:** a serve, its 40° arc, its bounce and a
  following camera — not a rally. Root recommended the narrowing and no answer has come
  back; it is an agent fact and is never quoted as the person's (see §Roadmap). One 40°
  elevation, a settle 1440–1560 px downrange, no authored toss and a 0.09 s contact
  window narrowed it.
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
to the person the same day, and **no answer has come back**. The question is not filed in
this tree and this document carries no pointer to it. The sentence is an agent fact of the assumed kind and must never be quoted as
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
4. **EA · the episode** (`episodes/a-badminton/`) — **landed** `154166c`, `6a8d967`,
   `3dfdf9e` (`idle-compute`, 20 min, run `25e80bfb`): the serve from the hand,
   `camera.follow(shuttle, {sec: 2.0, zoom: 0.75})`, `force 1.0` over `forceSec 0.16`, the
   40° arc, the bounce resting at world x 509, the hold from 3.633 s, five bake-identified
   stills. `check`, `make`, `render-yaml`, `tsc --noEmit` exit 0; zero motor warnings in
   both channels the bake has (no `motor warning:` line, and the key the compiler omits when
   empty), and seven expected `sudden-move` lines on the descent — recorded, with why they
   are the physics of the bounce, in the episode README.
   Its measured reach, force table and the five limits it could not land are in
   `episodes/a-badminton/README.md` — that file is the package's home, not this one. The
   return is optional, by EP's exact fixture, and S-A1 does not depend on it.
5. **ER · the independent review** — **returned `NOT SATISFIED`** 2026-10-21, run
   `b9628190`, filed verbatim at `tickets/S-A1-ER-REVIEW.md`. It was a fresh **builtin
   `reviewer`** with a deliberately blind contract — the still paths and one question, and
   **nothing else** (not this document, not EA's report, not the motor's numbers), because
   the producer's reasoning is what an independent verdict must not inherit — and it went
   out only after the integrating node re-ran the combined check at EA's commit
   (`npm test`, `npm run smoke`, `check`/`make` on the episode): the episode is compilation
   the compiler had not seen, so a green HEAD is not a green bake.

**S-A1 is not reached, and the reason is the shot, not the pipeline.** The arc and the
court read; the bounce, the rest, the follow and the shuttle's scale do not. Four of the
five findings are reading failures of the render and are measured in
`episodes/a-badminton/REVIEWS.md` §"S-A1 review (ER)" — two thirds of ER's own shortfall
is a defect (`avoidActorCollisions` writes the actor y-clamp into the projectile's ground,
so the shuttle bounces and rests 41–56 px above the line it started on), and ER's "no
bounce" is its 6 fps sample stepping over two hops of 62 px and 16 px.

## The repair workset (dispatched 2026-10-21; R1 and R4 are in the tree)

Each row is a package with its own acceptance. R1 is a defect; R2 and R3 are design and
need root's word; R4 and R5 are asset and animation work.

| pkg | what | accept |
| --- | --- | --- |
| **R1** | the projectile's ground is the set's floor, not the actor clamp | a prop struck or released from the floor line makes both contacts and rests **on that line** (±1 px); `node tools/prop-track.mjs` prints the set's floor and each prop's gap to it; no other test's numbers move |
| **R2** | the bounce must read: 62 px then 16 px over ~0.2 s is physical but not visible | root decides whether elevation/restitution becomes authorable, or the shot states a smaller bounce and says so |
| **R3** | the follow must read as a follow: at `zoom 0.75` the pan is ~120 px | root picks: narrower framing with cut heads and a real pan, or a follow that holds a subject band and the floor |
| **R4** | the shuttle is ~3× a real shuttlecock (stageWidth 130 at scale 0.65) and passes in front of the receiver's legs | **landed only in part:** `stageWidth` 130 → 116, i.e. 2.6×/2.8× → 2.4×/2.5× a real shuttlecock. Real size (≈64) is refused by the engine: at 115 the native pair's receiver fails `segment-angle-rate/hand_r 8.419 > 7.000`, and below 72 even a legacy strike stops touching the shrunken contact body — the drawn size and the physical body the palm must touch are one declaration. The occlusion clause did not land: the first contact lands at the receiver's own x, so it is staging (R5) or framing (R3) |
| **R5** | the players are statues | the receiver reacts to the serve; the server's follow-through holds past 2.5 s |

Order: R1 first (it changes where the bounce happens, so R2 and R3 are measured after it),
then R3 and R4 together, then one re-render, one set of stills, and ER again with a fresh
reviewer. R5 and R2 only if the second review still fails on them — the cheap three may
carry the reading, and buying them first is what "time is the scarce thing" asks for.

## D1 — the depth order (decided 2026-10-21, `assumed`: root, not the person)

**What is decided.** The renderer gains a depth order: a declared set layer may name a `depth` and is then composited at that plane instead of below every actor or above every actor, and an actor may be declared at the `background` entrance, which already stages it a court-depth further back at 0.82 scale. `set/badminton_hall` declares `net` at a depth between the two player planes, so the far player is drawn behind the mesh and the near player in front. Bound: depth ordering and what this shot needs; no other rendering change, and the whole thing is one reversible commit.

**The depth field is half the change; the wrapper is the other half.** Every actor then rendered inside one `z-40` wrapper, so the net at 45 composited above *both* players and laced the near one's legs as well. Root's contract of 2026-10-21 authorises the cure (one wrapper per actor at `actor.z`) as the same decision, not a new one, and says so: the defect is closed at the wrapper and never worked around in the set's declaration. It also confirms that withholding the review was right — a verdict on a shot known to be wrong buys nothing — so the fresh blind review follows the wrapper, not ER again on the same frame.

**Why it is not root's taste call.** An `assumed` decision, decided by root, not quoted from the person: under a convention where no serve can cross the net, the thing to be tasted is not in the frame, so the question cannot be put as a taste question at all. Accepting the flat 2D convention would have answered a composition question by removing its subject.

**What is not presumed.** R2 (does the bounce read), R3 (the follow locks) and R5 (the players are statues) still wait for the person.

## Current facts

**Where slice A stands (2026-10-21):** engine landed, episode landed, first review returned
`NOT SATISFIED`; the repair workset was then dispatched and **R1 landed** (`bfa837d`, a
projectile's ground is the set's floor) and **R4 landed in part** (`c38c782`, the shuttle at
116), and the episode was re-baked and re-rendered into
`episodes/a-badminton/artifacts/sa1-r1r4-2026-10-21/` for a second, blind review. That review
answered **FAIL** (`tickets/S-A1-REVIEW-2.md`), on a ground no earlier reading made: **every
actor draws above the set, so both players stand on the camera side of the net** and no serve
can cross it — a compositing fact that no staging value can move. It also measured the camera
locked for the last 3.0 s (R3), the shuttle's rest off court beside the bench, and no hand
contact at frame 0. **The milestone was not reachable by repairing the shot**: it needed a
decision between accepting the 2D convention and buying depth against a declared set layer.
That decision is made — §D1 — and R2, R3 and R5 still wait for the person. The integrating node re-ran the combined check
at this HEAD after EA and again while writing this note: **333/333 pass, `fail 0`, two
runs agreeing**, `npm run smoke` exit 0, `check` on the episode exit 0,
`git diff --check` clean. The previously recorded 328/328 at `c943d88` predated EP and is
dead. Re-running `make` at this HEAD reproduces EA's bake event for event (struck 2.207 s
at `[-533,-447]`, settled 3.633 s at `[509, 650.16]`); the `performance.json` file hash
cannot be used as an identity, because it embeds a generation timestamp — the episode and
video hashes in `episodes/a-badminton/artifacts/sa1-er-2026-10-21/bake-identity.json` can,
and that rendition's video now lives beside them in the tree, not in `/tmp`.

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

- **The artefact rested above its own floor.** R1 was a defect, not a preference; it landed
  at `bfa837d`, so no projectile shot inherits it any more — and a projectile now descends
  through a raised surface it would tunnel in one frame, so only the floor catches a fast
  one.
- **A follow can cut drawn heads.** The head rule is deliberately off for a following shot
  (a follow that dodged every head lost its own subject). At `zoom: 1` it cuts them; this
  episode's `zoom: 0.75` does not — measured and corrected in the episode README, so R3 is
  a question about the pan reading as a follow, not about heads.
- **Camera cost is quadratic in window length**; a follow longer than ~3 s, or two in one
  episode, opens a memo package. A 1.9 s window on a ≤10 s shot does not.

## Evidence pointers

- `tickets/S-A1-ER-REVIEW.md` — slice A's independent verdict, verbatim;
  `tools/prop-track.mjs` — the command that prints a prop's path and turning points.
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
