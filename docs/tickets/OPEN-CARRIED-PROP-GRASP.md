# OPEN: carried-prop grasp — handle socket, live orientation, grasp hand art

Status: open, user-raised 2026-10-17, confirmed by inspection. **Not a
regression**: these were recorded as open M2 acceptance criteria, routed as
"the next cohesive engine package", and then overtaken by the M3→M4→M5
sequence. The register below is the durable fix for that failure mode.

## THE FIX EXISTS — in the M2 draft workspace, never merged (found 2026-10-17)

The user was right that this was fixed once. It was, in the disposable draft
workspace, and the result never reached the repository:

- the repo's `library/prop/thermos/manifest.json` has **no `grip`**;
- the archived workspaces (`workspace/library/prop/thermos/manifest.json` in
  `m2-contact-media-20261013T041200Z`, `m2-final-media…`, `m2-support-media…`,
  `m2-residual-20261013`, and others) all declare
  `"grip": {"at": [148, 76], "radius": 2, "depth": "front"}`.
- The eight-direction grip stills the user remembers
  (`contact-{front,back,left,right,front-left,front-right,back-left,back-right}-grip.jpg`
  in `m2-contact-media-20261013T041200Z`) were rendered from that workspace
  library.

Both behaviours are **gated on that one declaration**: the motor's handle
socket (`packages/core/src/motor/index.ts:855`, `p.grip?.at ?? offset`) and the
wrist-driven prop rotation (`:1551-1558`, `if (prop.grip) { … }`). With the data
missing, neither runs, so the hand carries the prop at its centre and the
thermos never tilts. Restoring the block re-enables both — and invalidates the
M5 bake, because the attachment point moves (measured: 7 M5 tests go red,
including the render-truth keys), which is why it is a package, not an edit.

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
3. **The holding hand reads as a fist, not a grasp. The obvious art is a
   dead end (measured 2026-10-17).** The `*/grips/{l,r}.svg` files are
   **byte-identical copies of the `fist` shape** — the same `<path d>` in 10/10
   view/side pairs and 0 of 346 800 raster bytes different — so M2 never drew
   grasp art, it relabelled a fist. The shape is one closed filled silhouette
   with four crease strokes and a thumb stub *beside* the fingers, so a handle
   cannot read as entering a wrap. An agent-drawn replacement was attempted and
   **rejected on vision review**: it read as an angular mitten, the handle
   stayed visibly detached, front/back/quarter were copies of one construction,
   side was a different construction, and the thumb jutted backward. That
   attempt is not committed. The lesson worth keeping: a grasp needs a cavity at
   the grip anchor and a registered anchor, and the hand art's own origin must
   coincide with that anchor or the fingers land beside the handle however the
   socket is declared.
   Historic note on the engine side:
   `FIGURE_HANDS = ["rest","open","point","fist","splayed"]`
   (`packages/core/src/schemas/figureArtwork.ts:8`) has no grasp shape, so
   there is nothing to render a wrapping hand with. M2 did produce
   `library/figure/lin_b_draft/front/grips/{l,r}.svg`; nothing references them
   (`artwork.json` has zero occurrences of `grips`, no code path reads them) —
   orphan art.
4. **Crouch — this item was wrong and is withdrawn as stated.** Measured on the
   native figure in the m5-acting bake at full crouch: `plantedLegAngles`
   already solves the two-bone chain, giving 127.72° and 130.16° of knee
   flexion with the feet exactly planted (`dx 0.0000`). The hip does not drop
   onto straight legs. What is actually broken is narrower and was found while
   checking: the rig **declares no leg-flexion envelope**, the ±42° gesture
   clamp is applied in `deriveActorPose` and then overwritten so it never
   binds, and at full crouch the drawn right knee sits at design y 724.5 with
   the ground at 720, its ink ~20 stage px through the floor. The half-chain
   capacity also folds both knees to screen-left because the declared legs are
   not mirror-symmetric. Those are the R5 defects now.

## Measured blocker (2026-10-17): no hand art can fix this yet

Working back from the rejected art attempt gave the real chain, and it is not
art. Three defects stack, and any one of them keeps the handle outside the hand:

1. **The declared socket is not on the handle.** `placement.grip.at` is
   `(148,76)` while the handle bar's ink runs x 153.5..162.5 with its centreline
   at x 158. The socket sits 10 art units from the bar, inside the strap's
   hollow, so the hand is placed beside the bar rather than on it.
2. **The motor's socket bookkeeping is frozen at bind.** The declared socket
   lands 18.2–19.7 px from the drawn hand point on every held frame (bind 18.2,
   carried key 18.4) because `state.grip` holds the bind-time offset instead of
   re-solving each substep.
3. **The wrist tilt swings the handle 68°.** The prop rotates 3.1° at bind and
   70.9° at the carried key while the hand sprite only turns with the forearm, so
   even a perfect wrap cannot stay aligned through the carry.

Also measured: the figure's hands are drawn at roughly half human scale for the
720-design figure (34–40 px across) against a prop whose handle loop is 44 px
and whose bar is 9 px, so a grasp has very little room to read at all.

**A failed check class to remember.** R3's "hand→handle 0.00 px" was measured
from the motor's hand point to the motor's socket, so it verified the motor
against itself: it necessarily reads 0.00 whatever the socket declares. A contact
claim has to consume the renderer's DRAWn geometry — the handle's ink against the
hand's ink — or it proves nothing.

## What landed, and what is blocked on the tilt (2026-10-17)

Landed: the socket now sits on the handle bar's centreline (`at [158,76]` against
bar ink x 153.5..162.5) and the motor re-solves the declared socket against the
prop's current rotation every substep instead of carrying a bind-time offset, so
the drawn hand point and the socket coincide to 0.00 px on all 147 held frames.
The contact check now measures the drawn handle's ink against the drawn hand,
which fails on the old value and would have caught the 10-unit error that the
old hand-point-against-own-socket check could not. Measured on the shipped art:
`THERMOS_ART` in `packages/studio/src/components/performance/Prop.tsx` paints the
thermos, not `library/prop/thermos/art.svg`, which is a coarser placeholder.

Blocked: **grasp hand art cannot be judged while the prop rotates against a hand
that does not.** Two agent-drawn attempts were rejected on vision review, and the
second review named the structural reason: at the carried key the prop is rotated
70.9° while the hand sprite only turns with the forearm, so *the handle escapes
the hand's aperture whatever the drawing is* — the reviewer saw the hand drift
onto the bottle body with the handle empty beside it. The same review rejected the
sheet on its own terms too: front and quarter were near-identical clones, back and
quarter_back were another pair of clones, and `side` closed the aperture entirely,
so no threaded handle is possible there.

Therefore the tilt policy is a prerequisite for the grasp, not a cosmetic matter:
a point socket cannot keep a handle inside a drawn wrap while the prop rotates
independently of the hand. Decide the tilt (give the rig a wrist so the hand turns
with the prop, or hold a carried object at its authored orientation) before
commissioning the art.

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
