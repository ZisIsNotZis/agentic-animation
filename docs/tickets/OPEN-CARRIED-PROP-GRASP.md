# OPEN: carried-prop grasp — handle socket, live orientation, grasp hand art

Status: open, user-raised 2026-10-17, confirmed by inspection. **Not a
regression**: these were recorded as open M2 acceptance criteria, routed as
"the next cohesive engine package", and then overtaken by the M3→M4→M5
sequence. The register below is the durable fix for that failure mode.

## What the user sees, and the measured cause

1. **Hand grips the middle of the thermos instead of the handle.**
   The schema supports a declared handle socket —
   `PropPlacement.grip {at, radius, depth}` in
   `packages/core/src/schemas/libraryMeta.ts` — and the motor already honours
   it (`socket: p.grip?.at ?? offset`, `packages/core/src/motor/index.ts:855`;
   `props.get(state.holding)?.grip` drives `gripDepth` at :1737). But **no prop
   in `library/prop/*` declares `grip`**, so that path never runs and the
   documented fallback applies: "small objects are carried at their middle"
   (`packages/core/src/motor/index.ts:487-489`).
   The thermos does carry the handle point — `interaction.hold: [120, 84]` in
   `library/prop/thermos/manifest.json` — but **no code reads `interaction`**;
   it is dead data.
2. **The thermos never tilts with the hand.**
   The held prop's position is `hand + grip offset`, but its rotation is only
   sampled at bind time (`state.propAngleAtBind = liveProp.rotation`, :1419)
   and never updated while held. A held object therefore stays in its
   world-upright bind orientation.
3. **The holding hand reads as a fist, not a grasp.**
   `FIGURE_HANDS = ["rest","open","point","fist","splayed"]`
   (`packages/core/src/schemas/figureArtwork.ts:8`) has no grasp shape, so
   there is nothing to render a wrapping hand with. M2 did produce
   `library/figure/lin_b_draft/front/grips/{l,r}.svg`; nothing references them
   (`artwork.json` has zero occurrences of `grips`, no code path reads them) —
   orphan art.
4. **Crouch/bend drops the hip but keeps the legs straight.**
   `nativeCrouchDrop` returns half the shortest leg chain and its comment
   states it "keeps at least half of each declared leg chain extended"
   (`packages/core/src/motor/skeleton.ts:253-259`). Knee flexion exists in the
   skeleton (`pose.legR/legL`, upper/lower angles, ±42° clamp) but is driven
   only by the walk stride and the `collapsed` expression
   (`packages/core/src/motor/actorPose.ts:380-382,578`), never by crouch. So a
   low reach is a waist pivot on straight legs.

## Prior record (why this is not new)

`docs/tickets/M2-CONTACT-CONTINUITY.md` lists as **open higher-level AC**:
"handle grip socket (not center), live relative prop orientation/depth, exact
cue transfer with sufficient pre-roll diagnostic, automatic bilateral
preparation, regenerated affected media". Its continuation section names the
work: "prop-local handle grip sockets through schema, registry/staging, motor
bind/hold and renderer depth/orientation". `docs/ART_CHARACTER_M2.md:108` also
records that "knees, profile grip occlusion and close handover spacing need
fresh art judgment". The schema landed; the prop data, the live orientation and
the grasp hand art did not.

## Required work (one package)

1. Declare `grip.at` (handle point), `radius` and `depth` for every grabbable
   prop; retire the dead `interaction` block or make it the authoring alias.
2. Update the held prop's rotation each substep from the hand/wrist, so a held
   object tilts as a real one would; keep the bind-time angle only as the
   initial condition, and keep prop-rate limits authoritative.
3. Add a grasp hand shape to `FIGURE_HANDS`, wire `front/grips/*.svg` in, and
   select it while holding.
4. Drive knee flexion from crouch so a low reach is a squat, not a waist
   pivot — with the support/contact law and the reach re-solve it needs (the
   same blocker as the routed anticipation item: `palm-contact/hand_r 6.958 >
   0.020` when the crouch is applied under a fixed world aim).

## Process fix (this ticket's real purpose)

An accepted-but-unimplemented criterion must not disappear when the milestone
sequence moves on. Every such criterion is registered here with its evidence
and either stays open until closed or is explicitly retired with a reason.
