# R8 · the rally's return — interception evidence

Working record for package R8 (`docs/0_ROADMAP.md` §Slice A packages §R8). It holds the
pre-fix truth, the post-fix cue table, the mechanism as implemented, the rejected
branches, the bake hashes and the commands run. The contract lives in
[8_MOTOR](../../docs/8_MOTOR.md) ("Returns in flight (R8)"); the authored surface did
not change, so [7_DSL](../../docs/7_DSL.md) is untouched.

Fixture: `pairScene` in `packages/core/test/nativePair.test.ts` — native server at 640,
native receiver at 1500, shuttle in the server's palm at (700,310), serve `push` at
1.4 s force 1.2 over 0.25 s, floor 691, 5 s. Return beat cue = the receiver's `push`
`at`. A "land" is a second `projectile.struck` with empty `diagnostics`.

## 1 · Baseline, reproduced before any change (HEAD `a9b6976`)

Exactly one cue landed. Two cues froze the whole-body proposal.

| cue (s) | second struck | diagnostics |
| --- | --- | --- |
| 1.90 | — | `strike missed: receiver never touched shuttle; …` |
| 1.96 | — | `strike missed: …` |
| 2.00 | — | `strike missed: …` |
| 2.04 | — | `strike missed: …` |
| 2.08 | — | `whole-body proposal exhausted: receiver at 2.125s; segment-angle-rate/hand_r 8.419 > 7.000` |
| 2.12 | **2.227** | `[]` |
| 2.16 | — | `strike missed: …` |
| 2.20 | — | `strike missed: …` |
| 2.26 | — | `strike missed: …` |
| 2.32 | — | `whole-body proposal exhausted: receiver at 2.375s; segment-angle-rate/hand_r 8.419 > 7.000` |
| 2.40 | — | `strike missed: …` |

The serve is `projectile.struck` at 1.407 s, velocity `[1000, -839]` (40.00°).

## 2 · After the mechanism

Same fixture, same eleven cues, re-measured with the eleven-cue probe on the final tree.

| cue (s) | second struck (s) | return velocity | elevation | diagnostics |
| --- | --- | --- | --- | --- |
| 1.90 | 2.133 | `[-1000,-839]` | 40.00° | `[]` |
| 1.96 | 2.142 | `[-1000,-839]` | 40.00° | `[]` |
| 2.00 | 2.149 | `[-1000,-839]` | 40.00° | `[]` |
| 2.04 | 2.148 | `[-1000,-839]` | 40.00° | `[]` |
| 2.08 | 2.145 | `[-1000,-839]` | 40.00° | `[]` |
| 2.12 | 2.144 | `[-1000,-839]` | 40.00° | `[]` |
| 2.16 | 2.167 | `[-1000,-839]` | 40.00° | `[]` |
| 2.20 | — | — | — | `strike missed: receiver never touched shuttle; its remaining flight never enters the 137 px arm envelope at a mark the walk and the hand can reach — cue the beat earlier` |
| 2.26 | — | — | — | same `strike missed` |
| 2.32 | — | — | — | same `strike missed` |
| 2.40 | — | — | — | same `strike missed` |

- **AC (a): 7 of 11 land with empty diagnostics; the band is 1.90–2.16 s = 0.26 s**, one
  cue wider than the six the AC requires.
- **AC (b): every remaining failure is one plain `strike missed: …`** naming the class.
  No `NaN`, no `Infinity`, no `whole-body proposal exhausted`, no frozen trajectory; the
  miss is decided at the cue, so no drive is ever staged at a pose no body can hold.
- **AC (c): the serve does not move** — first `projectile.struck` at 1.407 s, velocity
  `[1000,-839]`, identical for cues inside and outside the window (pinned by test).
- The return leaves on the same 40° arc, speed 1305 px/s, `vx` opposite the serve: it
  travels back toward the server's side.

## 3 · The mechanism

At the `push` intent, if the target prop declares `projectile` and is **already
falling** (in flight, not held), the motor solves an interception instead of walking to
the prop's current x:

1. Walk the prop's own integrator forward (`x += vx·dt`, `vy += g·dt`, `y += vy·dt`;
   summed as `y = y0 + vy·τ + ½g·τ(τ+dt)`), stopping at the first floor contact.
2. At each substep compute the drawn body box and the hand's reach disc around the
   shoulder (arm bone reach + hand radius — the hand circle is what touches the box).
3. Requirement 1, reach: the shoulder must be within that envelope of the box; in x that
   is the interval whose half-width is `√(envelope² − dyGap²)`.
4. Requirement 2, walk: the root mark must be inside `x ± WALK_SPEED·τ`.
5. Requirement 3, hand rate: among the walkable marks, take the one whose meeting point
   the rest hand reaches soonest (the point of the box nearest the hand's own rest
   position, clamped into the reach disc), and admit it only if the hand can cover that
   travel at the same acceleration/480 px/s ramp every other hand beat uses (a palm
   touches with its radius, so the last hand-radius is contact, not a missed approach).
6. The earliest substep satisfying all three is the intercept: the walk target is its
   root mark, the drive hand travels to the fixed world aim and **waits**, and the drive
   keeps the facing it was solved for so a prop crossing the body cannot flip the strike
   direction mid-beat. The prop arrives on its own arc; hand and box overlap over several
   substeps.

If no substep satisfies all three, the beat is an authored miss: the motor pushes the
`strike missed: …` diagnostic at the cue and stages no drive. That is why the two
baseline freezes are gone — the old path walked to the prop's stale x and then extended
the arm at a target it could never hold, and the proposal refused every substep.

A legacy figure's rest hand mirrors with `facing`; the striker's facing is set to the
meeting side before the drive hand is seeded, otherwise the hand starts on the wrong side
and spends a whole arm's travel turning around (this was measured: the legacy
`returnScene` at 2.04 missed before that ordering was fixed).

## 4 · Branches rejected

| branch | why rejected |
| --- | --- |
| widen the joint-rate / segment-angle-rate limits | forbidden by the package; the limit is the evidence that a pose is not holdable |
| suppress `whole-body proposal exhausted` | same — it hides the refusal instead of removing its cause |
| chase the prop's live position with the hand only (keep the old drive, fix only the walk) | the hand tops out at 480 px/s against a 1000/1200 px/s projectile, so contact remains a lucky frame; measured baseline: one cue in eleven |
| aim the walk at the prop's current x (`aimX − dir·stopGap`) | the walk arrives where the prop WAS; this is exactly the baseline failure for early and late cues |
| predict only the prop's y and keep the old x aim | same defect in x |
| model bounces in the solve | a beat aimed at a bounce is aimed at the floor; the solve stops at the first floor contact and later cues are misses |
| pick the earliest reach moment with the prop's CENTRE as the aim | wastes the box height and the hand radius (~46 px of reach on this fixture) and left 2.08 s a few px short |
| return a miss elsewhere (silent no-op / generic warning) | AC (b) requires a plain `strike missed` naming the class where `check`/`make` show it |
| add a DSL field (e.g. `intercept: true`) | not needed: the cue already carries the timing, and the mechanism is the engine's job for any in-flight projectile |

## 5 · Bake hashes — no other episode's motor output moved

Method: a clean `a9b6976` worktree at `/tmp/r8base`, `npm run anim -- make <episode.yml>`
with the episode's own audio takes copied in, then the same six episodes baked on the
final tree with the identical audio directories. Hash = sha256 of
`JSON.stringify(sceneTrack.map(scene => scene.motor))` (the deterministic motor output),
first 16 hex chars. The full-file hash is also shown; its only differences are
`audio.takes[].generatedBy.at` and `generatedBy.at/inputHash`, i.e. run timestamps and
the input hash, not motion.

| episode | motor sha256 (16) baseline | after | verdict |
| --- | --- | --- | --- |
| a-badminton | `b21579a81cb606e6` | `b21579a81cb606e6` | identical |
| b-bar-swing | `423ebdc6e65023c8` | `423ebdc6e65023c8` | identical |
| m5-acting | `a0676b2a60a79c60` | `a0676b2a60a79c60` | identical |
| m6-film | `059227c09a248a77` | `059227c09a248a77` | identical |
| m7-transfer | `511fdc7c7fddf060` | `511fdc7c7fddf060` | identical |
| showcase-props | `9db979c47f1fa2de` | `9db979c47f1fa2de` | identical |

The other episode files fail `make` before the motor runs, identically on both trees,
because they declare speech with no exact source audio (`ERROR make failed: … YAML
speech take(s) have no exact source audio; rerun with --synthesize-unmatched`); they were
not re-synthesized for this package.

`episodes/a-badminton`: the accepted numbers are unchanged and were re-measured from the
fresh bake — `projectile.struck at 2.207s [-533,-447]`, `projectile.settled at 3.717s
[476.56,691]` (`node tools/prop-track.mjs episodes/a-badminton/performance.json shuttle`).
That episode has no return `push`, so the in-flight gate never opens for it.

## 6 · Tests added / changed

Added in `packages/core/test/nativePair.test.ts`:

1. `the return is cueable across a 0.26 s window: seven of the eleven beats land a second struck contact`
   — pins the cue → return table above, the exact band `[1.90 … 2.16]`, the width ≥ 0.25 s,
   empty diagnostics on every landing, one strike per beat, the 40° return arc and its
   direction. **Failing-first:** on `a9b6976` it fails with one landing (`2.12`).
2. `a return cue outside the window is named a strike miss: never a freeze, never a non-finite frame`
   — pins 2.20/2.26/2.32/2.40 to exactly one serve strike, one diagnostic matching
   `/^strike missed: receiver never touched shuttle; /`, no `frozenOf` line, no
   `NaN|Infinity`, finite receiver and prop trajectories. **Failing-first:** on `a9b6976`
   2.08/2.32 report `whole-body proposal exhausted … hand_r 8.419` and the other cues do
   not match the `strike missed` class.
3. `the interception leaves the serve exactly where it was: 1.407 s on the 40° arc, whether the return lands or not`
   — pins the first strike at 1.407 s with velocity `[1000,-839]` for cues 1.90, 2.16 and
   2.40. Passes before and after by design: it is the AC (c) guard against the change.

Changed in `packages/core/test/projectile.test.ts`:

4. `a second struck contact lands on the shuttle in flight, and its window is hand-cueable`
   — was `… its window is not hand-cueable`; the old test pinned the defect (1.98/2.10
   miss, "one frame either side"). It now pins 1.98/2.04/2.10/2.16 landing, 2.30 missing
   with `strike missed`, and the real hand contact (at the frame before the strike the
   baked hand is within the declared hand radius of the shuttle's drawn box).
   **Failing-first:** on `a9b6976` it fails because 1.98/2.10 do not land.

Changed in `packages/core/test/nativePair.test.ts` (existing test): the old assertion
`receiverX < 1480` ("the receiver walked at the live x") is no longer the mechanism — the
receiver may stand and reach — so it now asserts the receiver never chases the **staged**
serve mark (`min x > 1300`). The return's own point is pinned by tests 1 and 4.

## 7 · Commands run (final tree)

| command | result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 347 tests, 347 pass, 0 fail (docs-lint clean inside the script) |
| `node tools/docs-lint.mjs` | `docs-lint: clean (136 authored Markdown files)` |
| `git diff --check` | clean (exit 0) |
| `grep -rn "PDBG\|DDBG\|INTDBG" packages/` | no matches (all debug hooks removed) |
| eleven-cue probe (`tsx` against `simulateScene(pairScene(…))`) | table in §2 |
| `npm run anim -- make episodes/a-badminton/episode.yml` | exit 0; struck 2.207 `[-533,-447]`, settled 3.717 `[476.56,691]` |
| six-episode baseline/after bake hash | table in §5 |
