# World Puppet Motor
Physical motion SSOT; [WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md) owns authoring.
Status: motor slices 1–2 are rendered/verified (showcase-actions push, showcase-camera walk); vocabulary migration (3) is in progress — seven actions are motor intents with their regex pose paths deleted (bow, nod, point, shiver, raise_hand, dismiss, think); falls (4) are pending. Eight-view orientation/fabric is shipped separately.
## Why
The previous renderer *imagined* motion: bone tracks carried English prose,
the renderer regex-matched it into poses, and positions were eased lerps. A
"push" could drag a target with no contact — remote force was representable,
so it happened. This motor makes remote force **unrepresentable**.
## Model
Planar 2D, stage space (1920×1080, y-down). An actor is a pelvis point-mass
with procedural limbs (two-segment arms/legs drawn by the
renderer), not a full Verlet skeleton — slices 1–2. A ragdoll mode (cut
balance springs, full particle skeleton) is slice 4.
State: actor pelvis/velocity, facing, support, walk phase and lean; props have position/velocity and ground friction.
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
   frames; native contact scenes sample at their indexed presentation timestamp,
   legacy-only scenes retain historical frame-end sampling), all randomness seeded
   from the world seed. Same seed and inputs → byte-identical trajectories.
## Bake format
The compiler bakes scene trajectories; the renderer looks up frames:
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
Figures declare `skeleton.json`; generic FK is in `motor/skeleton.ts`.
The motor derives body/arm/contact geometry from those joints and shapes;
renderer reach IK must place the visible palm on the baked world reach point.
Legacy built-in view art still has procedural paths; see M0 for observed gaps
between attractive source assumptions and actual rendered contact.
M2's optional `artwork.json` carries native view geometry and vector layers.
Its body state selects the same view skeleton in motor baking and rendering;
hand-center reach excludes the contact radius (radius belongs to the separate
contact circle). Shared FK supports body drop and articulated leg angles so
crouches can lower hips while preserving foot support. Root anchors stay fixed
across views. These additions are under implementation, not production QA;
verify actual pose/viseme/contact frames before approving a new asset.
## Orientation extension — eight views, five drawings, fabric (shipped)
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
  shapes, arm lengths, waist pivot and pitch limit). The engine has NO figure
  numbers: generic FK lives in `packages/core/src/motor/skeleton.ts`
  (`solveSkeleton`, `solveArmIK`, `circleOverlapsBox`); the registry validates
  and carries the data; the compiler threads it into motor + renderer. The
  drawn joints ARE the physics joints by construction.
- **Support surfaces**: furniture/set manifests declare
  `supports: [{name, x, y}]`; `on(X)` places the object's base on the surface
  (compile error if undeclared).
- Root cause of every historic "hand never touches" defect was ground
  misalignment (figures standing below their physics ground) — see the
  invariant below.
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
Native pickup uses the selected view's signed shoulder and checks posture reach;
if standing alignment cannot reach, align the crouched bent shoulder. Native crouch
capacity is half the shorter declared hip-knee-foot chain, shared with renderer
planted-leg IK; recovery decelerates near straight knees. Native leg IK preserves
its declared rest bend branch; stopping lands the outgoing foot at a half-cycle boundary, then suppresses the next swing only when both world anchors are at rest. Landing/support labels/gait-reserve removal share whole-body acceptance.
Persistent native stance anchors and reachable gait posture are validated by renderer FK, not clamped IK targets. Shared legDropInterval supplies nonnegative hip-drop feasibility on the hip-above-ankle annulus branch (null = infeasible).
`motor/wholeBodyProposal.ts` has a live native caller: cloned complete controllers/queues, final roots, persistent support anchors, canonical core pose arbitration, actual FK, indexed samples and deferred ownership form one acceptance boundary. Studio consumes accepted authored SkeletonPose and world feet. Finite whole-progress proposals include geometric cadence and terminal landing; exhaustion retains original controllers/ownership with bounded diagnostics. Unpublished candidate: tickets/M2-LIVE-INTEGRATION.md owns final all16/full-suite and real11 FK/contact proof, renewed manifests, frozen-audio binding and representative media. Fresh integrated review, full art/AV and M2 acceptance remain open; no production readiness is claimed.
Orientation-only view claims do not inject temporary torso acting tilt. Legacy depth is unchanged.
Grab semantics: the grab controller bends the waist and crouches the MINIMUM
amount whose fully-extended hand physically overlaps the object's declared
body box (either lean direction searched), then binds on live contact — never
by script, never by radius. Honest miss after 2.5s if no posture reaches.
Handover: the RECEIVER walks (live pursuit of the mover's current position,
stop at the adjacency clamp) and binds on contact; the bind physically takes
the weight — the giver's holding clears the moment the receiver grips.
Grab hand travel ramps smoothly over its first 0.25s and is capped at
480 stage px/s including native shoulder/root/posture motion in the whole-state proposal;
binding tests the actual moving hand, not the hypothetical fully extended hand. Transfer/release preserve
the outgoing hand target and retract to rest at that rate. During unloaded withdrawal,
a geometry-sized baked reach influence decays continuously; native visible target
arbitration is Cartesian before IK, not an angular blend. Explicit authored arm
poses and torso acting regain control during unloaded recovery, not when reach clears.
Native timed presentation recovers within its interval; legacy semantics are unchanged.
Semantic bone actions use token-bound verbs and their objects, never namespace/substring aliases; exact recipe phases remain fallbacks only for non-facial operations. Facial predicates cannot claim arms or crouch just because arm parts are declared; hand-to-face contact and mixed genuine body predicates retain their own operations. Expression-channel metadata cannot drive arms. Native timed acting plans onset and recovery inside authored intervals, with actual-pose takeover for owned chains. Expression state remains separate; loaded contact and baked shared poses win.
Native proposals advance root/support, posture, settling and rotated socket together under shared Cartesian/angular FK budgets; no independent prop clamp breaks grip.
Irreducible view changes roll back complete body/contact/controllers; ownership events publish only with accepted state. Upright/terminal recovery has current self-proof, not independent acceptance.
This is not a universal rate guarantee. Loaded contact remains authoritative. Native grab posture onset eases together with the hand approach to avoid near-extension elbow acceleration. Native separation includes declared head extent and a hand-sized contact corridor, not only torso width. Optional point claims recover within their authored interval; unloaded reach influence remains continuous when that claim ends. Reach IK uses the elbow bend branch declared by the rest joints, avoiding a reflected-elbow snap when the target returns to rest. This correction does not yet prove full M2 visual acceptance. Optional prop-local grip sockets replace
center/body-box grabs with handle contact; the captured socket offset rotates
continuously with the wrist, with no orientation reset on transfer/release.
Socket depth selects the foreground finger plane. Baking redirected handover
moves schedules recipient walking/reaching and the giver's finite-speed offer
before the authored contact cue, after their earlier motor intents. A contact-time gate prevents early ownership transfer;
24fps presentation uses the first sample at/after the cue (ceil sampling, not
exact subframe timing); late or unreachable cues produce motor diagnostics in `make`, never a snap.
Scene boundaries/prior intents bound pre-roll; authors need no bilateral sync.
Free `prop.release`: immediately detach at the live position/carry velocity,
withdraw naturally, and fall under gravity; no receiver contact means no transfer.
Internal `releaseMode: free` distinguishes this from legacy raw/binding release
and `prop.putdown` (`releaseMode: place`), which retain placement behavior.
Shared procedural prop solids use `motor/propGeometry.ts`: renderer paths and
support contours have one authority (thermos body, cap and handle, including ink;
shadow/binding cue excluded). Generic analytic rotation-aware contour projection
supplies the lowest solid point and its support witness, transformed by rendered
size/base/scale. Gravity lands that point on an eligible finite world surface;
free release below a shelf does not lift or teleport onto it. Other legacy art
without a shared solid retains declared-base support, not full-shape collision.
Putdown lifts the rotated solid clear of support before opening; gravity settles
it without resetting orientation. Detach/socket/velocity semantics are unchanged.
Angular rigidbody response, tipping and bounce are not implemented. The motor's baked prop frames
(`scene.motor.props`) are the position authority — `propState` in evaluate.ts
consumes them directly and its legacy binding interpolation never runs for
motor-driven props. `make` runs `detectPropDiscontinuities` on roots, props and renderer-solved
skeletal joints every frame (default >30 stage px or >35 degrees). Flips are
not exemptions: a mirrored contact snap is still visible. Diagnostics expose
motion defects, not visual acceptance or complete grip validation.
`scripts/keypoints.mts` dumps raw per-frame positions.
**Ground alignment invariant**: an actor's drawn feet stand exactly on
`actor.y` — Actor.tsx positions the figure div at `actor.y - space.height`
(the transform's bottom-edge origin already absorbs the scale). Getting this
wrong sinks every figure below its physics ground and hands never meet bodies.
## 45-degree facing (orientation)
Requirement: two people should look at each other diagonally instead of both
staring into the camera; the camera view is "front".
- A separate `figure45` category was rejected: one figure stays one resource.
- Use the existing `pose.orient(subject, "front-left")` factory; body state supports
  front/back, left/right and all four diagonals. Left-directed views mirror the
  corresponding native drawing; front/back use the existing actor mirror.
- Built-in `views45.tsx` remains the renderer for assets without declared art.
  M2 adds per-figure vectors at the same canonical figure/IR seam, so these
  resources are consumed rather than dead files. No second source pipeline or
  puppet runtime is introduced. Approval still requires rendered view/contact QA.
## Slices
1. **Core + walk** and 2. **Push** (force chain + stagger) — shipped, above.
3. **Vocabulary migration** — in progress: actions become motor intents, deleting
   the regex pose layer per action. Migrated (prose can no longer claim the
   pose): `bow`, `nod`, `shiver` (torso envelopes: waist hinge, two dips, lean
   oscillation), `point`, `raise_hand`, `dismiss`, `think` (reach gestures:
   face-target raise/wave, overhead, chin) — the gesture family in
   `motor/index.ts`; planted support, no contact, shared retract recovery.
   `push`/`move`/`grab`/`release` were already motor (slices 1–2). Still
   legacy: hand-to-face/contact gestures (check_watch, cover_mouth,
   scratch_head, tap_head, touch_hair, sip, pat — need a self/prop contact
   chain), prop-effect actions (slam, discard, scatter, unroll, present,
   close, type, write, count_* — need prop-force semantics), posture/
   lifecycle actions (stand, collapse, enter, exit, manifest, illuminate);
   expression/audio-only actions (blink, laugh) have no regex pose path.
   Repaired pre-existing defect: `action.push` referenced the never-shipped
   "push-thump" cue, failing every push render at the renderer's cue gate;
   the dead reference is removed — push renders without impact audio until
   a real cue asset is produced.
4. **Falls** — pending: failed recovery cuts balance for physical collapse; later full Verlet ragdoll if needed.
