# World Puppet Motor

Design SSOT for physical puppet motion (docs/WORLD_PLUGIN_CONTRACT.md is the
authoring-layer contract; this file defines what motion *is* underneath it).
Status: slices 1–2 implemented and verified in rendered episodes
(showcase-actions push, showcase-camera walk); slices 3–4 pending.

## Why

The previous renderer *imagined* motion: bone tracks carried English prose,
the renderer regex-matched it into poses, and positions were eased lerps. A
"push" could drag a target with no contact — remote force was representable,
so it happened. This motor makes remote force **unrepresentable**.

## Model

Planar 2D, stage space (1920×1080, y-down). Stylized rigidity: an actor is a
pelvis point-mass with procedural limbs (two-segment arms/legs drawn by the
renderer), not a full Verlet skeleton — slices 1–2. A ragdoll mode (cut
balance springs, full particle skeleton) is slice 4.

State per actor: pelvis position/velocity, facing, two foot contact points,
walk phase, lean. State per prop: position/velocity + ground friction.

## Invariants (enforced by the simulation, not by convention)

1. **Support** — feet plant on the ground line; the pelvis accelerates only
   within what planted feet allow. If a force would carry the center of mass
   outside the support, the actor *steps* (recovery step) or falls.
2. **Contact** — a body only accelerates while touched. A push applies force
   only while the actor's hand is within contact range of the target's body;
   the hand must travel there first (reach phase). No contact, no motion.
3. **Reaction** — exerting force shifts the actor's own weight backward
   (lean against the push); bracing precedes exertion.
4. **Determinism** — fixed timestep (1/120 s substeps integrated to 24 fps
   frames), all randomness seeded from the world seed. Same seed and inputs →
   byte-identical trajectories.

## Bake format

The compiler runs the simulation once per scene and bakes trajectories into
the manifest; the renderer is a pure lookup plus the existing skeletal draw:

```json
"motor": {
  "fps": 24,
  "actors": { "awei": [{ "x": 1248, "lean": 0.1, "facing": -1, "walk": 0.62, "reach": [1103, 640] }, "..."] },
  "props":  { "thermos": [{ "x": 960, "y": 691 }] }
}
```

Actors without motor tracks (unmigrated actions) render through the legacy
semantic path; per the clean-cut doctrine the legacy path dies as actions
migrate (slice 3).

## Motor intents (authoring)

Plugins emit intent tracks instead of placement tracks:

```js
track(world, "motor", subject.id, [{ at: 0, duration: 1.4, intent: "move", to: target.id }]);
track(world, "motor", subject.id, [{ at: 0, duration: 0.85, intent: "push", target: target.id, reach: 0.35, forceSec: 0.25 }]);
```

`action.push` and `movement.to` are thin wrappers over these. Force magnitude
is stylized (a nudge), not newtons — the invariants are what matter.

## Body geometry SSOT (drawn = collider)

`packages/core/src/motor/figureGeometry.ts` is the single source of truth for
the puppet body: shoulder joint, arm segment vectors, hand radius, torso
half-width, and pose angles (e.g. `PUSH_ARM`). The renderer's SVG rotates its
arm segments by exactly those angles, so the drawn hand lands where the
forward-kinematics `handOffset()` says; the motor's contact test uses the
same numbers, so force cannot conduct without the drawn hand touching the
drawn body. Changing a drawing dimension changes the physics with it.
Actor bind anchors (`hand_r`/`hand_l`) derive from `HAND_REST` too.

## Slice 3 — eight views, five drawings, fabric (shipped)

- Orientation is one of eight: front, back, left, right, front-left,
  front-right, back-left, back-right — five drawings per figure (front,
  back, side, quarter-front, quarter-back in
  `packages/studio/src/components/performance/views45.tsx`), left/right and
  the mirrored quarters are renderer mirrors.
- Validation gate: `episodes/showcase-orientations` renders all eight side
  by side; adjacent-view pixel differences are measured (all > 0.068 mean
  abs vs the 0.01 gate — views cannot silently collapse into near-duplicates).
  Sheet: `.scratch/orientation-sheet-8way.png`.
- Algorithmic fabric: a seeded crosshatch weave clipped to the robe
  (`Fabric` in Actor.tsx) — deterministic per figure id, anchored in
  figure-local coordinates, subtle against the ink-outline style.

## Slice 2 — contact push + balance stepping (shipped, force-chain rework)

- **Force chain, no cooperation**: `push` applies the force to the PUSHER'S
  HAND (phase "approach" walks him into arm's range first — his own legs);
  the hand accelerates, the arm IK extends, and once the arm is taut the
  hand's further motion DRAGS THE PUSHER'S BODY (clamped at other bodies'
  adjacency edges). The force window opens at FIRST CONTACT (the waist bend
  absorbs the reach — timing is physical, not scripted) and conducts only
  while the hand circle overlaps the pushee's torso box, every substep. The
  pushee gets nothing for free: his own foot friction and capture-point
  stepping decide stepping vs staggering. Body separation is a hard
  projection — two actors never share ground.
- **Two-way dynamics**: the impulse accelerates the pushee's stagger and
  leans the pusher back (reaction, held while the arm is loaded); the pushee
  moves by their own foot friction, never in sync.
- **Capture-point stepping** (thresholds from the figure's
  `balance: {stepLength, catchFraction, maxSteps}`): after ~stepLength of
  slide the feet take a recovery step that catches `catchFraction` of the
  remaining momentum; beyond `maxSteps` the imbalance exceeds capacity —
  fall territory (fall poses are future work; the dynamics already
  distinguish the regimes). Step plants are baked as frame markers
  (`step: 1`) and visible in the debug overlay.
- `action.push(subject, target, force)` takes the shove strength (data, not
  engine constants; clamp 0.1..2).

## Slice 1 — one body, real touch (shipped)

- **Skeleton data**: every figure declares `skeleton.json` (joints, part
  shapes — torso box, head circle, limb capsules, hand circles — arm lengths,
  waist pivot and pitch limit). The engine has NO figure numbers: the generic
  FK lives in `packages/core/src/motor/skeleton.ts` (`solveSkeleton`,
  `solveArmIK`, `circleOverlapsBox`), the registry validates and carries the
  data, and the compiler threads it into motor + renderer.
- **Ground alignment invariant**: an actor's drawn feet stand exactly on
  `actor.y`; props render bottom-center anchored at their declared base line
  (`placement.base`). Position math and transforms must agree with these two
  rules — this was the root cause of every "hand never touches" defect.
- **Reach as force**: the approach halts where the SHOULDER lands beside the
  object; the arm sweeps out over ~0.3s; the waist bends (baked per-frame
  `waist` pitch) just to the smallest pitch — either lean direction — at
  which the fully-extended hand touches the object's declared body box. No
  remote grab radius: grab = hand circle ∩ body box, and the body bounds are
  declared per prop (`placement.body`), not the art frame. The carried prop
  rides the hand inside the simulation, so a handover receiver's grab tracks
  it live (`intent.grab` on the receiver's move). If full bend still cannot
  touch, the grab honestly fails and the object stays put.
- **Support surfaces**: furniture/set manifests declare
  `supports: [{name, x, y}]`; `on(X)` places the object's base on the surface
  (compile error if undeclared). Releases drop back onto the surface.

## Debug overlay

`ANIM_DEBUG_PHYSICS=1 render-yaml …` draws the engine's beliefs onto the
video: figure box + ground line, collider torso/head, hand anchors, the
motor reach point, prop boxes with their grab radius, and a frame counter.
Use it to check contact and grips by eye — what the boxes say is what the
physics uses. The actor div border/ground line (debugDiv) shares the flag.

## Prop placement (one authority)

Props have exactly TWO position sources — nothing else moves them:

1. **Carried**: the prop rides the holding hand's FK position with the GRIP
   OFFSET captured at bind time (the hand grips where it touched — the prop
   never teleports to the hand). Rising from a crouch, walking, staggering,
   handing over: the offset stays fixed.
2. **Free**: the declared placement, moved only by push impulses (friction
   slide) or gravity after release.

Grab semantics: the grab controller bends the waist and crouches the MINIMUM
amount whose fully-extended hand physically overlaps the object's declared
body box (either lean direction searched), then binds on live contact — never
by script, never by radius. Honest miss after 2.5s if no posture reaches.
Handover: the RECEIVER walks (live pursuit of the mover's current position,
stop at the adjacency clamp) and binds on contact; the bind physically takes
the weight — the giver's holding clears the moment the receiver grips.
Putdown: if the prop base sits below a declared support surface, the holder
LIFTS the prop until the base clears the surface, then opens the hand; the
prop falls the last few px onto the support. The motor's baked prop frames
(`scene.motor.props`) are the position authority — `propState` in evaluate.ts
consumes them directly and its legacy binding interpolation never runs for
motor-driven props. `make` runs `detectPropDiscontinuities` and prints a
`[make] sudden-move warning` per per-frame jump > 60px; `scripts/keypoints.mts`
dumps raw per-frame positions. All showcases lint at 0 discontinuities.

**Ground alignment invariant**: an actor's drawn feet stand exactly on
`actor.y` — Actor.tsx positions the figure div at `actor.y - space.height`
(the transform's bottom-edge origin already absorbs the scale). Getting this
wrong sinks every figure below its physics ground and hands never meet bodies.

## 45-degree facing (orientation)

Requirement: two people should look at each other diagonally instead of both
staring into the camera; the camera view is "front".

- Considered a new library type (`figure45`): rejected — it duplicates the
  figure concept, and every consumer (poses, motor, labels) would need a
  second branch; one thing, one name.
- Considered per-figure view assets in `library/figure/*`: rejected for now —
  the performance renderer draws figures procedurally, so library view
  assets would be dead data for this renderer.
- **Chosen: orientation as a semantic on the actor state, rendered by
  procedural view variants.** `EvaluatedActor.orientation` is one of
  `front` (default), `front-left`, `front-right`, `back-left`,
  `back-right`; the diagonal values render `QuarterFrontView` /
  `BackView` (packages/studio/src/components/performance/views45.tsx,
  same 400x720 box and proportions), left/right selects the mirror.
  Authored via `pose.orient(subject, "front-left")` (library/pose/orient),
  which emits a bone event carrying `orientation`. A real puppet-figure
  with view assets can slot into the same semantic later.

## Slices

1. **Core + walk** — balance, foot planting, locomotion. Feet never glide.
2. **Push** — brace → reach → contact → force ramp → target momentum +
   reaction; stagger with recovery stepping. Contact-before-motion is
   asserted by test.
3. **Vocabulary migration** — re-express the ~30 procedural actions as motor
   intents; delete the regex pose layer per migrated action.
4. **Falls** — cut the balance controller on failed recovery: physical
   collapse replaces the canned pose; later, full Verlet ragdoll if needed.
