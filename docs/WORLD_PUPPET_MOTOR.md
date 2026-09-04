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

## Slices

1. **Core + walk** — balance, foot planting, locomotion. Feet never glide.
2. **Push** — brace → reach → contact → force ramp → target momentum +
   reaction; stagger with recovery stepping. Contact-before-motion is
   asserted by test.
3. **Vocabulary migration** — re-express the ~30 procedural actions as motor
   intents; delete the regex pose layer per migrated action.
4. **Falls** — cut the balance controller on failed recovery: physical
   collapse replaces the canned pose; later, full Verlet ragdoll if needed.
