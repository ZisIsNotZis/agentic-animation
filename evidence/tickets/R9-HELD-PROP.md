# R9 · the held prop in the hand — working record

Record for package R9 (`docs/0_ROADMAP.md` §Slice A packages §R9). It holds the pre-fix truth
as numbers, the two causes with their lines, the mechanism as implemented, the rejected
branches, the bake hashes and the commands run. The contract lives in
[8_MOTOR](../../docs/8_MOTOR.md) "Prop placement (one authority)"; the authored surface did not
change, so [7_DSL](../../docs/7_DSL.md) and [7_SCHEMAS](../../docs/7_SCHEMAS.md) are untouched.

Why: two blind reviews of `episodes/a-rally`'s r4 rendition
([r3](S-A2-REVIEW.md), [r4](S-A2-REVIEW-R4.md)) said the racket is never drawn in a hand. The
bake was right; the drawing was wrong twice.

## 1 · The offset before any change, per shot

Method: `evaluatePerformance(manifest, frame)` on the accepted bake, then, in the RENDERED
frame's coordinates (the 1920×1080 stage the camera transform scales to 1280×720; the camera at
these frames is `z = 0.6667` in the wide and `1.3` in the medium two-shot):

- **drawn handle** = the evaluated prop (x, y, rotation, scale) run through `Prop.tsx`'s own
  placement of the declared art: the element anchors art `(100, base)` at `(x, y)`, lays art
  unit `u` out at `size/200` and `size/160` px, then rotates and scales about that origin; the
  declared socket is `placement.grip.at`;
- **drawn palm** = the artwork's `data-kind="hand"` layer composed through the drawn arm and
  torso (elbow, shoulder, waist, crouch drop) and the div's stage scale and mirror;
- **hand joint** = the same composition at `skeleton.joints.hand_l` — the point the motor
  carries a prop by.

| shot | frames held | drawn handle → drawn palm | drawn handle → hand joint | of which: scale mismatch |
| --- | --- | --- | --- | --- |
| a-rally (racket, `held-by(server, left)`) | 108 / 108 | **53.7 px** (35.8 px in the 1280-wide frame) | 11.2 px | 11.2 px |
| a-badminton (racket, same) | 132 / 132 | **53.7 px** | 11.2 px | 11.2 px |

The two causes are additive and both were real:

1. **11.2 px — the prop drew at `scale: 1`.** `evaluatePerformance`'s motor path
   (`packages/studio/src/performance/evaluate.ts`) wrote `scale: 1` for every prop the bake
   owns, while the *motor* sizes the body box and converts the declared socket at the declared
   stage scale (`stagedGrip`, `packages/core/src/motor/propGeometry.ts`; `prop/racket`'s
   340/200 = 1.7). The drawing and the physics were two declarations.
2. **49.6 px — the artwork paints its palms off its declared joints.** `athlete_a`'s `side`
   view draws its hand layers at `(184.34, 356)` and `(203.76, 356)` while the declared joints
   are `(128, 356)` and `(272, 356)`: the profile drawing puts both hands near the body's
   centre. The motor carries the socket on the joint, so the drawn handle landed on a palm that
   is nowhere in the picture. (`front`/`back`: 2 px; `quarter`: 4 px — the offset is a view's
   business, not a constant.)

A hand width, for every tolerance here and in the tests: the declared palm contact circle's
diameter at stage scale, `2 × 9.5 × 0.88 = 16.7` px for this figure. The drawn palm's own ink
is ~31 art px across (× the layer's 1.2 × the actor's 0.88 ≈ 28 px), so 16.7 px is the tighter
claim.

## 2 · The rule now in force

[8_MOTOR](../../docs/8_MOTOR.md) "Prop placement (one authority)":

> A motor-driven prop draws at the DECLARED stage scale the motor sizes its body box and socket
> with — one declaration for drawn size, physical body and socket — and while the bake reports a
> hold the drawn prop is carried by the palm the ARTWORK PAINTS: the hand layer's own anchor
> (`figureHandAnchor`), composed through the drawn arm and torso (`drawnArmPoint`), never the
> `hand_*` joint the bake carries. The bake is untouched by that drawing rule — only the drawing
> moves, and only while a hold is reported; a free prop draws at its baked point.
>
> The off-hand carry HANGS the prop it carries: the prop turns to the arm's carry line (head down,
> 9.7° off vertical, behind the hand) and its carry hand never drops below the prop's own drop
> above the ground line, so a correctly-sized prop hangs beside the hip instead of standing out of
> the palm at head height or drawing through the floor when the body folds. The striking hand
> keeps its authored orientation, and the drawn palm offset is released over the drop window when
> a hold ends.

## 3 · The mechanism

- `packages/core/src/schemas/figureArtwork.ts`: `figureHandAnchor(layer)` composes the
  `translate`/`scale`/`rotate`/`matrix` chain from a hand layer's root down to the group carrying
  `data-kind="hand"` and returns that group's origin (and its linear scale). The drawing declares
  its own palm; a chain the accepted grammar does not cover returns `undefined` and the caller
  keeps the declared joint. Cached per layer string.
- `packages/core/src/motor/reach.ts`: `drawnArmPoint(actor, arm, point, side, flipped, torso)`
  is the renderer's composition for any design-frame point of one arm chain — forearm about the
  elbow, upper arm about the shoulder, then the torso group (vertical scale about the waist,
  waist rotation, crouch drop) and the div's stage scale and mirror. `renderedHandWorld` is now
  that function at the hand joint with no torso channel (behaviour unchanged; the bake hashes
  below cover it).
- `packages/studio/src/performance/evaluate.ts`: a motor prop draws at
  `stagedPropPosition(prop, frame).scale` (its declared stage scale) and, while an actor frame
  reports `holds`/`holdsL` for it, is translated by `paintedPalmOffset(actor, side)` — the drawn
  palm minus the drawn joint, both composed from the bake's own `skeletonPose`. No artwork or no
  baked pose ⇒ offset 0, i.e. the previous drawing.

## 4 · Bake hashes — nothing else moved

Same method as [R8](R8-INTERCEPTION.md) §5: sha256 of
`JSON.stringify(sceneTrack.map(scene => scene.motor))`, first 16 hex chars, `npm run anim -- make
<episode.yml>` with each episode's own audio takes present, on HEAD `09efac5` (worktree
`/tmp/r9base`) and on this tree.

| episode | baseline | after |
| --- | --- | --- |
| a-badminton | `b21579a81cb606e6` | `b21579a81cb606e6` |
| b-bar-swing | `423ebdc6e65023c8` | `423ebdc6e65023c8` |
| m5-acting | `a0676b2a60a79c60` | `a0676b2a60a79c60` |
| m6-film | `059227c09a248a77` | `059227c09a248a77` |
| m7-transfer | `511fdc7c7fddf060` | `511fdc7c7fddf060` |
| showcase-props | `9db979c47f1fa2de` | `9db979c47f1fa2de` |

Identical, and identical to R8's own table, so the `renderedHandWorld` refactor did not touch the
motor's whole-body proposal either. Re-measured after the follow-up's off-hand carry change
(§5b): the same five rows are still identical; only `a-rally` and `a-badminton` moved, as the
package intends (`a-rally` `00699626e4c482f5`, `a-badminton` `21eb5c92b71803a4`), and their
events did not: `a-badminton` `struck 2.207 [-533,-447]`, `settled 3.717 [476.56,691]`;
`a-rally` `struck 2.307 / 2.680`, `settled 4.167`. `episodes/a-badminton`'s events are the accepted ones:
`projectile.struck 2.207 [-533,-447]`, `projectile.settled 3.717 [476.56,691]`.

## 5 · What moved when the two shots were re-rendered

`npm run anim -- render-yaml episodes/a-rally/episode.yml` (108 frames) and the same for
`a-badminton` (132). Stills cut to `/tmp/r9/` (not committed); the kept r4/r7 renditions are
untouched.

- **The racket is drawn at its declared 1.7** — 340 stage px of art width instead of 200 — and
  its grip is on the hand: at `a-rally` t1.900 the fist closes on the red grip (before: the grip
  hung 36 render px below and left of the hand, and the whole racket was 40% too small at his
  chest).
- **The shuttle is drawn at its declared 0.58** (R4's `stageWidth` 116), not 1: it reads as a
  shuttlecock instead of a lampshade-sized cone, and its drawn body now equals the body the
  motor strikes on. Witnessable in both shots' stills (a-rally t2.350 and t3.300).
- **The racket's hoop now reaches the server's face in the medium two-shot** (a-rally t2.350,
  t2.667), in the pull-back wide (t3.300) and, in a-badminton, in the opening wide (t0.600,
  t1.800). The size is the declared one and the art is unchanged: the carry pose holds the grip
  at the palm with the prop's baked rotation at 0°, so a correctly-sized racket at hip height
  stands its hoop at head height on a figure whose head is 22% of its design height. Removing it
  needs the carry rotation/wrist (a motor change ⇒ a bake change) or a smaller declared
  `stageWidth` (an asset change) — both outside this package. Not hidden, not fudged.
- **A prop in a hand the drawing paints behind the torso** (a-badminton's `side` view draws the
  right arm behind the body) is now drawn at that painted palm, i.e. near the body's centre,
  where the hand's ink is — the shuttle at the pickup (t1.800) sits on the chest rather than
  floating a hand's width in front of it. Correct position, and the accepted depth model still
  paints the object over the body; the plane of a prop held in a behind-torso hand is untouched.
- The camera, the figures, the stage and the bakes are identical; no frame count or size changed.

## 5b · The follow-up: the carry pose the correct size exposed

The declared size made the racket right and the shot wrong: the off-hand carry
stands a carried prop upright (baked rotation 0°), so at 1.7× the hoop reached
head height and its ink crossed the server's face — measured 33 ink samples
inside the drawn head box at the worst frame of each shot, and the manager
re-rendered both and confirmed it (`a-rally` 2.350 s, `a-badminton` 2.208 s).
Two further facts came out of the same measurement pass:

- the upright carry also **stands the hoop INTO the face during the crouch** —
  no hand height fixes it: at the lowest carry hand (126 px above the ground) the
  prop's 224 px from the socket cannot stand up and clear both the floor and the
  head. The only lever is the prop's own carry rotation;
- the striking hand's painted palm is 60.1 stage px (68.2 design px) inside the
  declared joint on this cast's `side` view, which is why a prop held there is
  drawn over the chest at the serve prep (see "the cast's limit" below).

**The change (bake, scoped to the off hand).** `offCarryHang` lays a carried
prop's own up-axis along the off arm's carry line (shoulder → carry hand): the
prop hangs head-down, 9.7° off vertical, behind the hand, at a constant
rotation for the whole carry. A prop picked up mid-shot turns to that hang at
80°/s, under the 90°/s the whole-body proposal allows an owned prop, so the turn
can never be refused; a prop that starts the scene in the hand is seeded at the
hang, so `held-by` frames have no turn at all.

**The floor.** Hanging a 224 px prop from a hand that drops to 126 px above the
ground while the server folds to pick up the shuttle put its ink 82 px THROUGH
the floor line on 14 frames. The carry hand now never drops below the prop's own
drop (`carriedDrop`, the farthest corner of the prop's declared body box from
its socket, 230.9 px) plus a 6 px margin, so the hand lifts while the body folds
instead of putting the prop through the ground.

**The drawn offset at a release.** R9's drawn palm offset is a drawing term; when
the bake stops reporting the hold it used to vanish on that frame — measured a
**62.4 px jump** at `a-badminton`'s 2.208 s strike against the prop's own 22 px
of motion per frame, and 67.2 px at `a-rally`'s 2.306 s. It is now released over
8 frames (the drop window the legacy held motion uses): 11.1 px and 0.6 px.

Measured after (both shots, every frame):

| check | before | after |
| --- | --- | --- |
| racket ink inside the drawn head box (worst frame) | 33 samples | 0 painted eye/mouth point on any frame |
| racket body box vs the ground line | 102 px through (f35) | 9.3 px clear (worst) |
| drawn shuttle jump on the release frame | 62.4 / 67.2 px | 11.1 / 0.6 px |
| drawn handle → drawn palm, held frames | 53.7 px | 0.01 px (unchanged) |

**The cast's limit (left alone, by instruction).** At `a-badminton` 2.167 s and
`a-rally` 2.100 s — the last held frames before each serve — the drawn shuttle's
ink is entirely over the drawn shirt (165 / 165 and 115 / 165 sampled points),
because the striking hand's PAINTED palm is 60.1 stage px inside the declared
`hand_r` joint: `athlete_a`'s `side` view paints its hands at design 184.34 and
203.76 against declared joints at 128 and 272. The shuttle is in the hand the
renderer draws (the gripping hand is redrawn on the foreground plane at the same
point), so the picture reads "the shuttle held at the chest", not "a shuttle
glued to a shirt" — but the hand is on the chest, and that is the asset. The
number is pinned by `heldPropHand.test.ts` (the 49.6 px check) and the prologue
of this file; moving the figure is the person's call, not this package's.

## 6 · Tests (both failing-first)

1. **`packages/core/test/paintedPalm.test.ts`** — *"the artwork paints its palm off its declared
   hand joint, and the bake carries the declared socket at that scale"*. Pins `figureHandAnchor`
   on the real `athlete_a` asset (184.34/203.76 against joints 128/272), composes it to 49.6
   stage px at the server's 0.88 (5.4 hand widths), and pins that on every held frame of a
   `held-by` fixture the bake's handle point (prop origin + the declared-scale socket at the
   live rotation) is the hand point it reports, plus the falsification that an art-unit socket
   drifts `(base − at)(scale − 1) = 11.2 px`. **Failing-first:** on `09efac5`
   `drawnArmPoint`/`figureHandAnchor` do not exist, and the measurement the test encodes reads
   49.6 px there (probe below).
2. **`packages/studio/test/heldPropHand.test.ts`** — *"the drawn racket's declared handle sits
   in the drawn palm on every held frame of the rally and the served episode"* (a-rally + a-badminton,
   every held frame, tolerance one hand width, and the assertion that the socket is *not* within
   a hand of the joint, so the check cannot pass by measuring the joint) and *"a picked-up prop
   and a prop carried after a handover draw in their holder's painted palm"* (m5-acting: 75
   frames in lin's hand after the pickup, 72 in awei's after the handover). **Failing-first:** on
   `09efac5` the same measurement reads 53.7 px against a 16.7 px hand, and the module it needs
   does not exist; it prints `worst handle-to-palm 0.01 px` after the change.
   `packages/studio/test/renderTruth.test.ts`'s drawn-prop key was updated to the new rule (a
   held prop is the bake translated by the painted palm offset, and the key must carry a non-zero
   offset or it cannot tell the palm from the joint).
3. **`packages/studio/test/heldPropHand.test.ts`** — *"the off-hand carry hangs the racket clear
   of the painted face and of the ground"*. Every frame of both shots: the carry rotation hangs
   (|rotation| > 90°, 170.3°), no painted eye or mouth point of the artwork lies inside the
   racket's declared body box, and the box's lowest point is above the actor's ground line.
   **Failing-first:** with the upright carry this test measures 33 head-box samples, a 102 px
   floor breach and a 0° rotation.
4. **`packages/studio/test/heldPropHand.test.ts`** — *"the drawn prop does not jump on the frame
   its hold ends"* (`a-rally` 2.307 s, `a-badminton` 2.207 s): the drawn shuttle's step on the
   release frame is within 1.5× its own step after it. **Failing-first:** 62.4 px against 29.8 px.
   `packages/core/test/handHold.test.ts` also gained the hang: the carried prop's handle point is
   solved at the BAKED rotation, and the fixture must hang (|rotation| > 90°).

## 7 · Rejected branches

| branch | why not |
| --- | --- |
| fix only `scale: 1` (R7's recorded 11 px) | leaves 49.6 px: the handle still lands on a palm the drawing does not paint |
| fix only the painted palm, keep `scale: 1` | leaves the 11 px, and the drawn size still differs from the body the motor sizes |
| apply the declared scale only while held | a prop bound or released mid-shot would change size on one frame (the shuttle is picked up and struck in both shots) |
| draw the prop at the *joint*, and move the FIGURE's hand ink onto the joint | re-draws every side-view arm in every episode (a 48 px shift of painted arms), which the package forbids |
| solve the reach IK so the *painted* palm lands on the baked reach point | same blast radius plus it would break the render-truth tests' definition of the drawn hand; the offset belongs to the object in the hand, not to the arm |
| declare the palm per figure/view in the artwork schema | a second home for a number the drawing already carries; the derived anchor cannot go stale |
| ease the painted-palm offset out at release | the offset would become a second motion authority; a released prop draws its bake exactly (recorded as a residual instead) |
| widen the tolerance / suppress the check | forbidden; the numbers are the evidence |
| keep the upright carry and accept the hoop over the face | the shot's head is half-hidden behind it; that cannot ship |
| move the off hand lower instead of turning the prop | the prop is 224 px long and the hand cannot go low enough (checked: it also puts the hoop through the floor) |
| tilt the prop only while the body folds (a pose-driven hang) | the prop-angle gate is 90°/s owned; a hang that follows the fold is refused and freezes the beat |
| let the hanging prop's hoop pass through the floor | ink through the ground line is a defect, not a style |
| keep the drawn offset past the release (no easing) | a 62 px jump on the strike frame, the beat the reviews call decisive |
| draw a prop held in a rear-arm hand behind the body | the artwork paints that arm behind the torso, but then the shuttle vanishes for the whole pickup and reappears at the strike |

## 8 · Residuals

- A **release** while a prop is held ends the offset on that frame: the drawn prop returns to its
  baked point (≈10 px for `lin_b_draft`, whose painted palm sits 17.6 px above its joint). Not
  visible in a-rally/a-badminton (the racket is held to the last frame); m5/m6/showcase-props are
  not re-rendered here.
- The painted palm is the hand layer's own origin, i.e. its wrist; the palm's ink centre is a few
  design px lower (≈6 px for `athlete_a`, ≈18 px for `lin_b_draft`, both inside the hand's ink).
  The grip therefore reads at the top of the fist rather than its middle.
- The racket's hoop over the server's face (see §5) is a staging consequence of the declared
  size, not a drawing defect of the prop.
- The off-hand carry's hang is a constant angle for the whole carry: the off hand cannot re-aim
  the prop mid-carry without the prop-angle gate refusing it (90°/s owned).
- The striking hand's prop still draws at its painted palm, 60.1 px inside the declared joint on
  this cast's `side` view (the serve-prep "shuttle at the chest") — the asset, recorded above.
- The hand that grips a prop is drawn over it only for the right hand
  (`PerformanceEpisode`'s foreground hand layer is `handsOnly` with the right arm); a LEFT-hand
  hold draws the grip over the fingers even though `grip.depth` is `front`.

## 9 · Commands run (final tree)

| command | result |
| --- | --- |
| `npx tsc --noEmit` | exit 0 |
| `npm test` | 354 tests, 354 pass, 0 fail |
| `node tools/docs-lint.mjs` | `docs-lint: clean (142 authored Markdown files)` |
| `git diff --check` | clean (exit 0) |
| `npm run anim -- make` (six episodes) | hashes in §4; the five others identical after the follow-up too |
| `npm run anim -- render-yaml` (a-rally, a-badminton) | 108 / 132 frames, unchanged duration and size |
| `node tools/prop-track.mjs` (both shots) | `a-badminton` struck 2.207 `[-533,-447]`, settled 3.717 `[476.56,691]`; `a-rally` struck 2.307 / 2.680, settled 4.167 — unchanged |
| pre-fix offset probe (tsx, per held frame, both episodes) | 53.7 px (§1) |
| face / floor / release probes (tsx, per frame, both episodes) | §5b table |
