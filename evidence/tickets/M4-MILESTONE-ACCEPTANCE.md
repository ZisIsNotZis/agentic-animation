# M4 milestone acceptance record

Records the user's M4 judgment as facts with coordinates. Owning contract:
[ART_MATERIALS_M4](../art/ART_MATERIALS_M4.md); roadmap
[ART_PRODUCTION_UPGRADE](../../docs/0_ROADMAP.md).

## Facts

- **user-judgment** — from: none (primary). author: user. origin: after the M4
  gate material (ablation stills, the fifth perceptual review's ART PASS, the
  measured +65% render cost and the disclosed limits) was presented, the user
  replied: "Seems good to me. Auto advance". scope: specific. status: current.
  evidence: bundle `m4-20261017T110548+0800/` (`VISION-REVIEW-5-PASS.md`,
  `analysis-v5*.json`, `gates/render-timing.md`, `stills/review-7/`).
- **milestone-met** — from: user-judgment. author: agent. origin: same
  occasion. scope: general. status: current. producer: this ticket.
  Conclusion: the M4 judgment is met for the revision bound by merge
  `decf0dd` and documented at `a5404bd`; production replacement is covered by
  the same "new is top choice, old stays installed" pattern the user set for
  figures and sets — `set/canteen_counter_m3` already backs the canteen scene
  and no other set changed.
- **method-fact** — from: milestone evidence. author: agent. origin: rounds
  1–7. scope: general. status: current. Conclusion: the treatment works only
  because the passes composite in non-luminance blend modes (`color` for
  pigment, `soft-light` for both light passes); ordinary opacity, `multiply`
  or `screen` destroy the drawn ink, and every matte or raised layer used to
  protect it presents its own visible boundary. Measured blend retention:
  `color` 1.004, `hue` 0.996, `saturation` 0.981, `soft-light` 0.964 vs
  `normal` 0.00, `multiply` 0.49, `screen` 0.51, `luminosity` 0.00.

## Open items routed onward (not M4 failures)

- Counter/floor staging depth ambiguity and vector-puppet joint stiffness at
  the handover → M5 acting.
- Putdown visibility (M3's honest failing criterion) →
  [BACKLOG-M5-PUTDOWN-VISIBILITY](./BACKLOG-M5-PUTDOWN-VISIBILITY.md).
- Cross-session render non-determinism breaks hash-bound evidence →
  [BACKLOG-RENDER-NONDETERMINISM](./BACKLOG-RENDER-NONDETERMINISM.md).
