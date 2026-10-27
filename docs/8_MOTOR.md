# INFERRED

## World Puppet Motor
Physical motion SSOT; [6_WORLD_PLUGIN_CONTRACT](6_WORLD_PLUGIN_CONTRACT.md) owns authoring.
Status: motor slices 1–2 shipped, slice 3 (vocabulary migration) reviewed, slice 4 (falls) shipped; see [Slices](#slices). Eight-view orientation/fabric is shipped separately.
### Why
The previous renderer *imagined* motion: bone tracks carried English prose,
the renderer regex-matched it into poses, and positions were eased lerps. A
"push" could drag a target with no contact — remote force was representable,
so it happened. This motor makes remote force **unrepresentable**.
### Model
Planar 2D, stage space (1920×1080, y-down). An actor is a pelvis point-mass
with procedural limbs (two-segment arms/legs drawn by the
renderer), not a full Verlet skeleton — slices 1–2. A fall (slice 4) cuts
balance and collapses the shared FK; a Verlet particle skeleton stays future work, admitted only if this provably cannot render a believable fall.
State: actor pelvis/velocity, facing, support, walk phase and lean; props have position/velocity and ground friction.
### Invariants (enforced by the simulation, not by convention)
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
### Bake format
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
### Motor intents (authoring)
Plugins emit intent tracks instead of placement tracks:
```js
track(world, "motor", subject.id, [{ at: 0, duration: 1.4, intent: "move", to: target.id }]);
track(world, "motor", subject.id, [{ at: 0, duration: 0.85, intent: "push", target: target.id, reach: 0.35, forceSec: 0.25 }]);
```
`action.push` and `movement.to` are thin wrappers over these. Force magnitude
is stylized (a nudge), not newtons — the invariants are what matter.
### Acting shapes — anticipation, accent, settle (M5)
Performance shape is data on the motor intent (`packages/core/src/motor/acting.ts`), never a second motion path: every shape defaults to 0 and 0 reproduces the pre-M5 trajectory exactly. Params are authored per call ([7_DSL](7_DSL.md)) and bake into the existing `lean`, `x` and `reach` channels — no new frame field, because the renderer already draws those.
**`anticipation` (seconds, clamped 0..0.4)** holds the beat for a pre-roll while the torso shifts weight opposite the intended motion, then starts the unchanged beat. The actor first faces the beat's direction, so the lean is drawn backward; the full 10° ramp is clamped to what the waist rate reaches inside the pre-roll and a clamped pre-roll is reported in `diagnostics` (`make` prints it as a motor warning). The pre-roll is SHAPED, not a single ramp (a linear ramp reads as a rigid planar hinge): the weight first eases the other way for 20% of the peak (a counter-dip over the first 30% of the pre-roll), then rises with a slow start and a fast release into the held shift. A pre-roll inside the reach posture's envelope (`skeleton.waist.pitchMax`) is acting; `test/actingShapes.test.ts` pins the profile and `actingInvariants.test.ts` pins the envelope on the acted episode. Applies to every intent except `fall` and planned handover offers (`offerTo`), whose cue timing is bilateral. A re-queued intent starts with its preparation spent, so every existing beat path runs unmodified.
**`accent` (0..1)** is a timing contrast on the acting hand: 55% of the 480 px/s travel cap away from the key pose, the full cap through the final 35% of the span, measured on the reach gestures and the grab approach. It is a redistribution, not a new speed — the cap is unchanged, so the beat arrives later than its unshaped timing (the handover lead does not account for it; a late bind is reported by the contact-cue diagnostic).
**`settle` (0..1)** carries the acting hand a decaying 6% of the beat's span (≤14 px) past its aim after it arrives, returning exactly to the aim within 0.4 s: one overshoot, then convergence, never an oscillation. On a move+grab it instead shapes the hold it starts: once the grip settles, the hand (and the carried prop with it) carries a slow breathing weight shift, so the elbow and forearm keep moving instead of locking. On a placing release it shapes the placement: the hand travels outward before it opens, so the prop comes to rest clear of the holder's silhouette.
**Shaped locomotion and holding (M5).** A holder sent to a mark behind its facing steps back without turning, at half walk speed after a 0.3 s foot replant, because a carrying turn would mirror the held prop and the whole-body proposal rejects that prop-rate jump. A shaped walk arrival settles its planted feet within the last step's sub-pixel remainder. The approach of a `push` follows the target's **live** mark, not its staged mark, so a target moved by an earlier beat is still reached.
Where a shape does not apply the reason is ownership of that motion's timing: a `move` walk is paced by planted support, a `push` drive by the force chain and its contact window, a torso gesture by its own envelope (which already carries a hold and a return), and a `fall` has no balance to settle into. These beats take anticipation only. No shape bypasses a limit: the hand keeps its 480 px/s cap, the torso its waist rate, contact still binds only at physical touch, and the whole-body proposal still rejects an unreachable pose with its own diagnostic.
**Reach gestures are shaped and complete.** A `point`/`wave`/`raise`/`think` hand aims along the arm's BONE reach (upper+fore), never the hand-radius-inclusive cap: a target beyond the bones is unreachable (the IK clamps and the drawn palm misses its own reach point), and at the cap a point's elbow is a nearly straight rod. A point aims at 94% of the bone reach, leaving a ~36° elbow bend. The authored interval is a floor, not a ceiling: if the accent-shaped travel (55% of the cap away from the key pose) cannot arrive and hold the pose inside it, the interval is extended to arrive plus a 0.2 s hold, so a beat always draws its key pose. The settle overshoot stays inside the bone reach (a hand cannot leave its arm), and a new reach clears any in-flight retract — otherwise the withdrawal influence stays 0 and the gesture is never drawn on the arm.
**Drawn separation, not upright widths.** Two actors are kept apart by the body the artwork DRAWS: the torso and head boxes rotated by the pose's waist pitch, per direction, plus a small corridor. The upright `halfWidth` alone let a bowed torso and head enter the neighbour (WP3 review: 7292 px² of overlap at the handover). Arms are excluded — a handover is a hand meeting a hand across the gap on purpose. The same extent bounds walk steps, walk arrivals, the taut push arm and the hard projection.
**A low reach squats before it folds.** The grab posture search takes the least waist pitch that touches, then the least crouch (was: least crouch first, which folded a floor pickup to 73.5° with the crouch at half capacity). Acting stays inside `skeleton.waist.pitchMax`; a reach posture may pitch as far as the engine limit because it is a physical necessity, and the least-pitch rule keeps a floor pickup a squat (measured 45° with the crouch spent on `figure/lin_b_draft`).
### Body geometry SSOT (drawn = collider)
Figures declare `skeleton.json`; generic FK is in `motor/skeleton.ts`.
The motor derives body/arm/contact geometry from those joints and shapes;
renderer reach IK must place the visible palm on the baked world reach point.
Legacy built-in view art still has procedural paths; see M0 for observed gaps
between attractive source assumptions and actual rendered contact.
M2's optional `artwork.json` carries native view geometry and vector layers.
Its body state selects the same view skeleton in motor baking and rendering;
the registry serves the artwork's front skeleton as the runtime skeleton.
Collider provenance follows the format: legacy figures (no `artwork.json`)
share the one procedural Actor.tsx drawing, so `scripts/part-bounds.ts`
derives their colliders from it and `partBounds.test.ts` pins them to the
drawing; native figures own their per-view geometry in `artwork.json`, whose
front skeleton must equal the declared `skeleton.json` (same test).
hand-center reach excludes the contact radius (radius belongs to the separate
contact circle). Shared FK supports body drop and articulated leg angles so
crouches can lower hips while preserving foot support. Root anchors stay fixed
across views. These additions are under implementation, not production QA;
verify actual pose/viseme/contact frames before approving a new asset.
### Shipped slices 1–2 (walk; contact push + balance stepping)
Historical detail is owned by the code and tests
(`packages/core/src/motor/`, `packages/core/test/motor.test.ts`); the contract
above is the law. Essentials: `push` applies force to the pusher's hand —
approach walks him into range, arm IK extends, and a taut arm drags his body
(only while the hand circle overlaps the torso box, every substep); the
pushee's own foot friction and capture-point stepping
(`balance: {stepLength, catchFraction, maxSteps}`) decide stepping vs
staggering; step plants bake as `step: 1` markers. Every figure declares
`skeleton.json` — the drawn joints ARE the physics joints; `on(X)` support
placement requires the declared surface; body separation is a hard projection.
`action.push(subject, target, force)` takes shove strength as data (clamp
0.1..2).
**Returns in flight (R8).** A `push` that names a prop declaring `projectile` and already in flight is an INTERCEPTION, solved at the cue: walk the prop's own integrator forward and take the earliest substep where the hand's reach disc (arm + hand radius) touches the prop's drawn body box, the root mark is inside what the walk can cover by then, and the hand can travel there at its honest 480 px/s ramp. The drive then travels to that fixed world point and waits; the prop arrives on its own arc, so overlap is a closing speed over several substeps instead of the one lucky frame (measured: the hand circle overlapped the shuttle ~0.07 s and the arm envelope ~0.39 s; slice A's return only landed from the cue that hit the former). It guarantees the return is an ordinary struck contact (40°, declared restitution), the serve is untouched (the beat begins when the prop is already airborne), and a cue whose remaining flight satisfies none of the three conditions is an authored miss named `strike missed` at the cue, with no drive staged at a pose no body can hold — so the beat cannot freeze the whole-body proposal. It does not model bounces (the solve stops at the first floor contact) and cannot buy a band wider than the arm reaches: on the EP fixture cues 1.90–2.16 s land and 2.20 s+ miss. The walk mark is the reachable mark the rest hand reaches soonest, and the striker faces the meeting side before its hand is seeded (a legacy rest hand mirrors with facing). Rejected: chasing the prop with the hand alone (the hand is slower than the flight, so contact stays a lucky frame); aiming the walk at the prop's current x (it goes where the prop WAS); relaxing a joint-rate limit, hiding the exhaustion or widening a tolerance (the refusal is the evidence); a new authored field (the cue already carries the timing — [7_DSL](7_DSL.md) is unchanged).
### Prop placement (one authority)
Props have exactly TWO position sources — nothing else moves them:
1. **Carried**: the prop rides the holding hand's FK position with the GRIP
   OFFSET captured at bind time (the hand grips where it touched — the prop
   never teleports to the hand). Rising from a crouch, walking, staggering,
   handing over: the offset stays fixed.
2. **Free**: the declared placement, moved only by push impulses (friction
   slide) or gravity after release.
The motor's solid is the DRAWN solid: the compiler transforms it at the prop's staged scale, the same scale the renderer draws with, so a placed prop's ink base lands exactly on the declared support line (an unscaled solid rested it 1 px high at scale 0.75). `actingInvariants.test.ts` measures the drawn base against the painted `data-support-top` line and checks the support's layer composites below the prop plane; a support painted by a foreground layer would draw over the prop that rests on it.
Native pickup uses the selected view's signed shoulder and checks posture reach;
if standing alignment cannot reach, align the crouched bent shoulder. Native crouch
capacity is half the shorter declared hip-knee-foot chain, shared with renderer
planted-leg IK; recovery decelerates near straight knees. Native leg IK preserves
its declared rest bend branch; stopping lands the outgoing foot at a half-cycle boundary, then suppresses the next swing only when both world anchors are at rest. Landing/support labels/gait-reserve removal share whole-body acceptance.
Persistent native stance anchors and reachable gait posture are validated by renderer FK, not clamped IK targets. Shared legDropInterval supplies nonnegative hip-drop feasibility on the hip-above-ankle annulus branch (null = infeasible).
`motor/wholeBodyProposal.ts` has a live native caller (its palm-contact check measures the DRAWN hand through `reach.ts`, not `solveSkeleton`'s arm chain, which mirrors its rest vectors by `facing` and is not the render truth — the two diverge at a raised aim and the proposal would freeze the beat): cloned complete controllers/queues, final roots, persistent support anchors, canonical core pose arbitration, actual FK, indexed samples and deferred ownership form one acceptance boundary. Studio consumes accepted authored SkeletonPose and world feet. Finite whole-progress proposals include geometric cadence and terminal landing; exhaustion retains original controllers/ownership with bounded diagnostics. Unpublished candidate: the live-integration ticket ([evidence](../evidence/tickets/M2-LIVE-INTEGRATION.md)) owns final all16/full-suite and real11 FK/contact proof, renewed manifests, frozen-audio binding and representative media. Fresh integrated review, full art/AV and M2 acceptance remain open; no production readiness is claimed.
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
### 45-degree facing (orientation)
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
### Slices
1. **Core + walk** and 2. **Push** (force chain + stagger) — shipped, above.
3. **Vocabulary migration** — shipped: actions become motor intents, deleting
   the regex pose layer per action. Migrated (prose can no longer claim the
   pose): `bow`, `nod`, `shiver` (torso envelopes: waist hinge, two dips, lean
   oscillation), `point`, `raise_hand`, `dismiss`, `think` (reach gestures:
   face-target raise/wave, overhead, chin) — the gesture family in
   `motor/index.ts`; planted support, no contact, shared retract recovery.
   `think` now reaches with the dominant (right) hand; the legacy regex recipe
   posed the left arm.
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
   a real cue asset is produced. The migrated `shiver` emits "shiver-rattle",
   which has the same never-shipped-cue status — see
   [BACKLOG-SHIVER-RATTLE-CUE](../evidence/tickets/BACKLOG-SHIVER-RATTLE-CUE.md).
4. **Falls** — shipped: failed recovery cuts balance for physical collapse. Trigger: the slide demand passes `stepLength` with the declared `maxSteps` recovery steps already spent, or an authored `fall` intent (gesture-intent pattern; `library/action/fall`). Balance cut ends stepping, posture recovery and in-flight hand drives/gestures; a failed final catch absorbs the momentum a step would have caught. The collapse uses the shared FK only — hip drops to the full crouch drop, waist hinges ~80° into the fall, the step cycle freezes (a mid-swing foot glides down at a bounded rate), planted feet stay planted, and the root slides only within what the folding legs still reach. The figure stays down (get-up is out of scope). `action.push` exposes the intent's `forceSec` so a sustained shove can honestly exceed capacity, and the push drive now obeys the same 480 px/s hand cap and waist-rate lean as every other motion (repaired pre-existing defect: native push drives froze the whole-body proposal at contact). Legacy figures keep planted feet under the hinge — the drop channels are native-art FK (the preferred figure is native).
