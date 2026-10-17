# BACKLOG (M5): putdown rest visibility — occluded by clustered receiver

**Status: CLOSED by M5 WP3 (2026-10-18).** The rest now lands at x 797.6, y 396 (declared counter 400) on `episodes/m5-acting`, with the nearest body part 26.8 px away and the drawn contact shadow x 770.6–824.6 clear of both actors (frame 150). Owning fixes, all in `packages/core/src/motor/index.ts` and documented in [WORLD_PUPPET_MOTOR](../WORLD_PUPPET_MOTOR.md) and the WP3 round of [ART_ACTING_M5](../ART_ACTING_M5.md): (1) a holder sent to a mark behind its facing steps back without turning after a 0.3 s foot replant, at half walk speed, so the held prop is never mirrored and the prop-rate proposal no longer rejects the walk; (2) a shaped placing release (WP2's `settle` on the release) carries the hand outward before it opens, so the prop's rest clears the holder's silhouette; (3) the push approach follows the target's live mark (needed for the shared beat, not this ticket). What blocked the earlier probes stays recorded below; nothing in the earlier analysis was wrong, the routes simply needed motor work that M3 excluded.

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

M3 gate status at the time: the Function putdown-visibility criterion was
honestly marked FAILING in the bundle MANIFEST with this routing; all other
criteria passed. Superseded by the closure above.
