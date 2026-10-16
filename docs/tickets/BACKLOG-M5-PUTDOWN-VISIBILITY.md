# BACKLOG (M5): putdown rest visibility — occluded by clustered receiver

From the M3 independent review (P1-1, 2026-10-17) and the WP4 repair round.

The M3 putdown beat satisfies the physics: evaluator rest y≈396–400 against
the declared counter y=400, x within the surface extent. It fails the visual
criterion: the rest point (handover geometry pins it beside the receiver's
carry-hand) sits between the clustered actors, so every sampled frame shows
the thermos occluded by the receiver's body — M0's "putdown not visibly
established" defect class survives inside the M3 set.

Repair attempts (WP4 round, all probe-verified): pure episode staging is
blocked by motor behavior — self-walk was a no-op (fixed in the slice-4/repair
round, `a9588dc`), staged walks from post-bind crouch refuse on the
segment-angle-rate limit, and carry-walk facing flips teleport the held prop.
The remaining routes are M5-domain motor work: post-bind posture recovery
before walk (walk-initiation ease), smooth carry facing flips, or handover
separation stepping.

M3 gate status: the Function putdown-visibility criterion is honestly marked
FAILING in the bundle MANIFEST with this routing; all other criteria pass.
