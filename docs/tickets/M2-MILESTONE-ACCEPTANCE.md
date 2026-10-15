# M2 milestone acceptance record

Records the user's M2 milestone judgment as facts with coordinates. Owning
contract: [ART_CHARACTER_M2](../ART_CHARACTER_M2.md); gates: roadmap
[ART_PRODUCTION_UPGRADE](../ART_PRODUCTION_UPGRADE.md). Recording this changed
docs only — no code, media, audio, history, staging or production path.

## Facts

- **user-judgment** — from: none (primary). author: user. origin: after the
  trusted entry
  `/home/z/.local/share/agentic-animation/art-baselines/m2-facial-object-20261014T0010/index.html`
  and its AV checklist were shown, the user replied: “我感觉没啥问题，自动推进”.
  scope: specific. status: current. evidence: acceptance archive
  `m2-acceptance-20261014T2133+0800/` (same root) and this ticket.
- **milestone-met** — from: user-judgment. author: agent. origin: same occasion.
  scope: general. status: current. producer: this ticket. evidence: acceptance
  archive `manifest.json` binds the exact accepted revision. Conclusion: the M2
  user milestone judgment is met for the exact source/media revision bound by
  `m2-facial-object-20261014T0010` (independent
  [review](M2-FACIAL-OBJECT-FINAL-INDEPENDENT-REVIEW.md): scoped technical PASS).
  The user did not itemize listening or lip-sync; actual listening therefore
  remains unitemized, not verified.
- **production-open** — from: user-judgment. author: agent. origin: same
  occasion. scope: general. status: current. producer: this ticket. Conclusion:
  the judgment is not production asset approval. No production-path/default
  replacement, publication, re-render or new spending was approved; the
  production asset-path approval gate stays open, and this record must never be
  upgraded into production asset approval.

## Roll-up and exact-revision binding

- Accepted revision: HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3` plus the
  preserved dirty tree; exact file identity is the acceptance archive's
  `source-hashes.json` (929 entries: the reviewed 928 plus this ticket), not HEAD.
- Pre-record drift check: all 928 entries of the reviewed revision's
  `m2-facial-object-20261014T0010/source-hashes.json` matched the tree before
  this recording; only the three docs edited for this record plus this new
  ticket differ from it afterwards, as declared in the archive `manifest.json`.
- Trusted entry (user-facing artifact):
  `m2-facial-object-20261014T0010/index.html` —
  `4573b6cba39b13a42f7b66f57914509f2d6725183f92d24a34786ee44a8586e5`.
- Independent review ticket:
  [M2-FACIAL-OBJECT-FINAL-INDEPENDENT-REVIEW.md](M2-FACIAL-OBJECT-FINAL-INDEPENDENT-REVIEW.md)
  — hash bound in the archive `manifest.json`.
- Media/audio provenance: reused by reference, byte-bound in the archive
  `manifest.json`, from `m2-facial-object-20261014T0010` `actual-media-proof.json`,
  `media-equivalence.json`, `artifact-hashes.json` and its 292 reused plus 23
  workspace audio hashes per the review. Speech-bearing clips are the reused
  contact/support takes; acting/overlap clips are intentionally silent.
- Related evidence owners: [M2-EXPRESSION-CONTINUITY](M2-EXPRESSION-CONTINUITY.md)
  (repair/proof), [M2-SUPPORT-MEDIA-CLOSURE](M2-SUPPORT-MEDIA-CLOSURE.md)
  (support provenance), [M2-DOC-READINESS](M2-DOC-READINESS.md) (task history).

## Remaining M2 gaps (explicit)

- Actual listening, lip-sync/subtitle/balance judgment: not itemized by the
  user; unverified, not blocking the recorded judgment.
- Production asset-path/default replacement approval: open user gate.
- Full-speed real-time perceptual re-walk by the user was not itemized; static
  and sampled-media coverage stands as reviewed.
