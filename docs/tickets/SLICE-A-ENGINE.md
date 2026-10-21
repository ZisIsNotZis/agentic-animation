# Slice A engine — the three packages that made the episode possible

Working record for milestone S-A1 (`ART_ASSET_PROGRAM.md` §Roadmap). It holds the
hooks, the falsifications, the measured numbers and the limits of E2, E4 and EP, so
the episode and the next session do not re-derive them. The packages' own mail files
were landed here and deleted from `mail/` on 2026-10-21; their verbatim text is in
git history at `f92ed55` (and earlier).

## E2 · the serve and the return (`idle-compute`, 704 s, run `2d29eb2e/task-1`)

Commits `35b8ffd` (the serve), `a1f848a` (the return), `d281f62` (the narrowed
declaration). Scoped evidence: `tsc --noEmit` 0, 50/50 core.

**The serve needed two hooks, and the failure was earlier than the launch.** With the
striker holding `prop/shuttle` and an `action.push` beat targeting it, the bake
produced **no events at all** and one diagnostic: `whole-body proposal exhausted:
athlete at 1.575s; prop-rate/ 58.169 > 26.667`. The push's drive hand was seeded from
`restHandAt(state)`, 54 px below the carry hand, so the first drive substep snapped
the carried prop to the palm's rest point.

- `motor/index.ts`, push intent start: `const held = state.holding === intent.target
  ? carryHandAt(state) : undefined;` → `moveTarget: null`, `phase: "drive"`, `hand:
  held`. A prop already in the hand has nothing to walk to.
- the contact branch that calls `strikeProjectile`: `clearHandHold(holder)` for every
  actor whose `holding === targetProp.id` (`propOpenHand`'s state-clearing split out,
  because the release path writes a carry velocity that would overwrite the launch).
  Without it the prop is struck and re-gripped: falsification gives
  `["projectile.struck"]` and no `projectile.settled`.

Test: the striker carries it (>20 held frames), the last carried frame precedes the
strike, exactly one `projectile.struck`, the first airborne frame is within one frame
of its own launch travel (no teleport off the palm), no frame carries it again,
velocity `(1000, −839)` → **40.00°**, apex ≈140 px above the release.

**The return resolves the prop's live x**, and nothing else about it is authorable:
`const aimX = target?.x ?? props.get(intent.target!)?.x ?? tx;` — reverting it makes
the receiver walk at the staged mark (x 700, where the serve began) instead of the
shuttle, and the second contact never happens. **Measured window: 2.00–2.08 s**
(0.01 s granularity; the serve strikes at 1.407 s); misses at 1.98 s and 2.10 s. The
window is **0.09 s ≈ 2 frames at 24 fps**, so a hand-authored cue has one frame of
slack — a cue cannot hit it reliably. Fixture: receiver x 1400, scale 0.88, floor 691,
serve `force 1.2, forceSec 0.25`.

**`swing.grip` / `swing.release` are undeclared** (`DECLARED_CAPABILITIES.swing.events`
is `[]`), with the guard that makes the class impossible: *a declared event of an
implemented capability has an emitter in `packages/**`* (reads every
`packages/*/src/**/*.ts` outside `compiler/`; `pour` is skipped because the gate
refuses it by name). Falsified by re-declaring `swing.grip`: `hanging declares
swing.grip, which no file in packages/** emits`. Slice B restores both names with
their emission. Nothing validates cue names against declarations today.

## E4 · the tracking camera (`idle-compute`, 410 s, run `2d29eb2e/task-2`, `d40ceec`)

New `library/camera/follow/index.js` (enumerated automatically — the category plugin
takes every child directory with an `index.js`), plus +103/−4 in
`packages/studio/src/performance/evaluate.ts` (`FollowProbe`, `followCameraKey`,
`followWindowKeys`, the `follow` branch in `cameraKeysFromTracks`/`shotSubjectAt`, the
probe built once per frame, and the head rule no longer evicting a tracking subject).
Three tests in `packages/studio/test/cameraFollow.test.ts`; 112/112 studio, both
tsconfigs 0.

Authored form:

```
camera.follow(shuttle)                       // window 1.875 s, zoom cap 1.0
camera.follow(shuttle, {sec: 2.2, zoom: 1.15})
```

`target` must be a live prop or actor handle (it throws otherwise). `sec` is both the
declared window and the block's `durationSec`, so the shot and the timeline cannot
disagree. `zoom` is a cap, not a value: every key is floored at the stage fit (0.6667
on 1280×720) and widened if the target's band needs it. One camera event,
`{operation:"follow", target, z}`, and no sampling — a recipe cannot see frames that
are not its own.

What the tests prove, against E1's arc driven through the motor-prop bake with
`locationScenes` present (the route an episode actually renders): frames 6→51 keep
the prop's drawn box and the camera viewport inside the painted 1920×1080, `z ≥
0.6667`, and the prop's centre inside the viewport (a follow, not a wide); the camera
pans 640 px with the shuttle and never steps more than 40 px between frames; frames
51→59 are byte-identical to frame 51 (a legal hold, not a cut or a black band); an
unresolvable target holds the shot where it was.

**Limits taken as they are, not repaired:**

1. **Cost is quadratic in window length** — `cameraKeysFromTracks` re-resolves the
   whole window on every `performanceFrame`, so a 46-frame window costs ~46 prop
   evaluations per rendered frame and a 30 s follow would cost ~720. **Decision
   (2026-10-21): no caching.** A follow window longer than ~3 s, or two follows in one
   episode, opens a package with a manifest-keyed memo; a 1.9 s window on a ≤10 s
   shot does not.
2. **The head rule is deliberately off for a following shot** — a follow that stepped
   aside for every drawn head lost its own subject. A follow can therefore cut a drawn
   head. Unreviewed by eye; ER is where it is judged.
3. **Bindings read the holder from the drawn frame** — a follow on a carried prop in a
   moving hand is approximate; motor-driven and transform-driven props are exact.
4. **Vertical framing is stage-limited, not subject-centred** — in the air the frame
   pins to y 0, near the ground it travels to y 323, so the prop drifts vertically at
   the extremes. The test asserts its centre stays inside the viewport, not centred.
5. **The compiler path was emulated** — no episode names the recipe yet, so the tests
   drive the generator against a stub world. `check`/`make` had not been run on an
   episode when E4 finished; EA is where that is proven.
6. `packages/studio/test/*.test.ts` is typechecked by neither tsconfig.
7. A very long `sec` writes one key per frame with no cap.

## EP · two native figures could not bake together (`idle-compute`, run `5b22b313`)

Commits `ead4ac0` (both refusals pinned), `135ee7d` (the fix), `54cbe01` (the proof).
`tsc --noEmit` 0; 55/55 across `wholeBodyProposal`, `projectile`, `motor`,
`capabilityContract`, `nativePair`; `git diff --check` clean.

**Landed: a native serve and a native return bake clean together** — native server
`athlete_a` at x 640, native receiver `athlete_a` at x 1500 facing left, beat at
2.12 s. Two `projectile.struck` (1.407 s, 2.226 s), both 40.00°, both upward, the
return back the way the serve came, `diagnostics: []`, the receiver walked at the
shuttle's live x (`packages/core/test/nativePair.test.ts`).

**The seam was one line, and not where the report guessed.** The measured refusals
reproduce exactly in EP's fixture (native receiver at x 1400, beat 2.04 →
`palm-contact/hand_r NaN`; two native actors → the same receiver refusal first, with
E2's `foot-reach/foot_r Infinity` as the same cascade on the other actor). Chain,
verified by instrumenting `validateState` and `advanceSupport`:

1. the **taut push arm** pulled its root with `nextX = state.x + dir*excess`, then
   clamped `nextX` against every other body **regardless of which side it was on**.
   With the server at x 640 behind the receiver at x 1448.9 the clamp produced
   `nextX = 564.03` — an 885 px backward teleport in one substep (`root-rate`
   884.894 > 6.000). The walk path already keeps a direction-of-travel rule ("a body
   behind the walker must not clamp"); the taut-arm drag did not.
2. the proposal refused the substep, so the stance feet never replanted while the
   untaken step demands moved the aim 890 px off the body;
3. `legDropInterval` returned `null` for that aim and `advanceSupport` wrote
   `supportMinimum = Infinity` into a numeric posture; `crouch` followed it to
   Infinity, `pose.waistY` became Infinity, `solveSkeleton` returned Infinity at every
   joint, and `solveReach`'s `rot(0, [-Infinity])` produced `0*Infinity = NaN` in the
   arm angles — which is why it surfaced as a tolerance miss on a substep nobody could
   have solved.

**The fix, at the smallest seams.** `motor/index.ts`: the root step is clamped only
against a body in the direction of travel. `motor/wholeBodyProposal.ts`: `foot-reach`
compares the drawn foot against the foot `plantedLegAngles` solves *lands* for that aim
(same solver, same FK), never against a point on the reachable annulus boundary —
`leg-annulus` keeps owning reachability; and a non-finite foot target, palm target or
hip drop is refused by name (`foot-target-non-finite`, `palm-target-non-finite`,
`waist-drop-non-finite`) instead of becoming a NaN ratio. **No tolerance widened**
(`.02`, `.5`, `720`, `840` untouched), no rate gate relaxed, no exemption list.

**Limits:**

1. **The beat is staged, not mechanism-guaranteed.** At 2.08 and 2.16 s the same
   staging gives real rate violations (`joint-rate/elbow_r`,
   `segment-angle-rate/hand_r`) — a native arm the receiver's own `solveReach` swings
   faster than the 6 px / 7° per-substep gates when the approach starts at a bad
   moment. E2's 0.09 s window stands unchanged in character: two frames.
2. **`supportMinimum = Infinity` is still written** when a support aim leaves its
   annulus. It no longer arises in a bake, and it now names `waist-drop-non-finite`
   rather than a NaN ratio, but `advanceSupport` still poisons `crouch` rather than
   leaving the posture finite. Reported, not touched — the follow-on seam.
3. `swing.events` is still `[]`; slice B owes the restore with emission.
4. No episode was touched: the proof is engine-level (`simulateScene`).

## What the episode may and may not rely on

- **May rely on:** a serve from the server's own hand at 40.00° with no teleport; the
  live-x approach; `camera.follow(target, {sec, zoom})` clamped inside the painted
  stage; a native serve **and** a native return at EP's exact fixture.
- **May not rely on:** a return at any beat other than EP's 2.12 s; a second hit without
  reproducing that fixture; an authored toss or a second strike elevation; a follow
  window longer than a few seconds.

## E1 · the projectile and the gate (`idle-compute`, `2836478`)

Landed before this record began, kept here because the episode's numbers come from it.
The gate now selects on the field the episode asked through (`intent`, `support` kind,
`prop` kind) and refuses a declaration nothing implements, by name and with the asset:
`object mug (prop/x/mug) needs the "projectile" prop capability…`. `prop/shuttle`
declares `kind: "projectile"`, `mass 0.05`, `restitution 0.5`, `struck: "instant"`.

Launch speed = `force × 2900 × forceSec × (0.05/mass) × (1+restitution)`, capped at
2600 px/s; restitution is also the bounce the surface returns; below 220 px/s of bounce
the prop settles. Measured on the library's default action, stage 1920×1080, ground 691:

| quantity | measured |
|---|---|
| strike velocity | `(1166, −979)` px/s, i.e. 1522 px/s at 40° |
| apex above the strike line | 184 px |
| first floor contact | ~1066 px downrange |
| settle | ~1440–1560 px downrange, 1.6–1.9 s after the strike |
| bounce apex / first apex | 0.239 at `restitution 0.5`, 0.035 at `0.2` |
| mass 0.10 vs 0.05 | velocity exactly halved, apex quartered |
| sustained rule | never leaves the strike line; slides ~727 px, settles 1.37 s later |

Two facts that decide the episode's staging: a strike only lands inside the 137 px arm
envelope, so a floor-staged shuttle is refused by name (`strike missed: athlete never
touched shuttle…`); and `force 1.4` settles ~1440–1560 px downrange, off a painted 1920
stage, so the episode authors 1.0–1.2. A `PROJECTILE_PROP_RATE = 3200` cap in
`motor/wholeBodyProposal.ts` is the only exemption from the 720 px/s prop-rate gate, and
it applies only to props a manifest declares as projectiles.
