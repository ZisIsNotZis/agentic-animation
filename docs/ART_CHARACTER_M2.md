# M2 — B-direction character production
## Outcome and authority
**Milestone judgment met; production path opened for `figure/lin_b_draft` (2026-10-16).** The user accepted the current candidate — “我感觉没啥问题，自动推进” — after being shown the trusted entry `m2-facial-object-20261014T0010/index.html` and its AV checklist; facts and accepted-revision binding: [tickets/M2-MILESTONE-ACCEPTANCE.md](tickets/M2-MILESTONE-ACCEPTANCE.md). On 2026-10-16 the user approved `lin_b_draft` as the top-choice production character (“old characters shall still be there, just not the top choice”), opening the production-path gate for that figure only; old library figures stay installed and selectable, with the preference recorded by the figure category manifest `use` recommendation ([WORLD_PLUGIN_CONTRACT](WORLD_PLUGIN_CONTRACT.md)).
The user did not itemize listening/lip-sync; this is not production asset
approval. Deliver one reusable B-direction lin character whose better identity,
silhouette and face survive canonical speech, orientation, articulation and
real object contact. Draft sheets, clips and archives are process outputs,
not an approved production library.

Direction selection is owned by [M1](ART_DIRECTION_M1.md); milestone scope and
comparison budget by [roadmap](ART_PRODUCTION_UPGRADE.md). The user accepted the
refined identity (“seems much better, go on”) for deriving parts and explicitly
requested continuation to M2 acceptance without progress pauses. Internal
render/review iterations are not user gates. Stop only for authority/safety
blockers; preserve explicit production-asset approval and milestone judgment.
Do not reopen direction selection or identity approval absent a material conflict.

Retain lin's narrow face, tied dark hair, teal wrap tunic, cream collar, warm sash and dark trousers. Preserve old library assets and every archive. No alternate
DSL/Puppet production path, publication, paid/external generation, new service or
broad engine rewrite is authorized. Licensing boundaries remain in
[DECISIONS](DECISIONS.md). History/provenance is in the
[readiness ticket](tickets/M2-DOC-READINESS.md).
## Deliverable and acceptance contract

- Original editable native views and complete overlapping layered parts, pivots,
  sockets, palm/grip geometry, eyes, expressions and nine speech mouth shapes;
  provenance/license and regeneration recipe. Five drawn views cover eight
  orientations; true profile occlusion must not be a compressed front rig.
- A separately named reusable draft figure with shared artwork/physical geometry,
  carried through registry → compiler manifest → evaluator → canonical ArtFigure.
  Owning contracts: [SCHEMAS](SCHEMAS.md), [motor](WORLD_PUPPET_MOTOR.md).
- View/expression/viseme sheets plus canonical speech, reach/pickup, carry,
  handover, release/rest and authored-arm motion previews, compared at matching
  beats with M0 and chosen B. Reusing lin on both actors proves reuse only, not
  two-character identity production approval.
- **Art:** B identity retained across views, connected shoulder/elbow/hip contours,
  expressive readable eyes/mouths, convincing grip wrap and object depth; better
  appearance at wide/close scale, not only a neutral sheet.
- **Function:** shared palm/contact geometry, planted support, continuous limbs and
  props, contact-controlled transfer/release, orientation/occlusion, speech timing,
  camera/subtitle containment, explicit authored arms and old-asset regressions.
- **Production:** additive editable data, portable reconstruction, YAML usability,
  measured render effort/cost and special-case burden, no original asset overwrite.
- Run typecheck, test:all, Python study/parts tests, canonical smoke and diff-check
  on final source. Bind commands, inputs, media and reviews to hashes, not HEAD alone.
- Fresh independent artifact review covers final code/docs/config/assets and
  integration, not only prior fixes. Separately inspect actual rendered media at
  delivery resolution, start/peak/recovery/contact frames and real-time motion;
  listen to speech/audio and check lips/subtitles and balance. Record modalities,
  scenarios and unavailable coverage honestly. Self-review/stream metadata is not
  independent acceptance or listening. Fix blocking defects before presentation.
- Present current actual artifact and comparisons for user milestone judgment;
  production asset-path approval is a per-character user gate. Do not proceed
  into dependent default-production replacement for a figure whose gate is not
  approved (`figure/lin_b_draft` was approved 2026-10-16).
## Current implementation and evidence
`figure/lin_b_draft` is the preferred production figure: the user-approved svg-bone-parts draft now lives in `library/figure/lin_b_draft/`, the figure category manifest recommends it via `use`, and every showcase episode's default cast points at it. Canonical native artwork integration exists in the dirty working tree; old lin
remains unchanged. `tools/art-direction-study/lin_parts.py` generates the draft.
`figureArtwork` schema/registry, native geometry in compiler/motor/evaluator and
`ArtFigure.tsx` consume it through PerformanceActor. Native handover stops at
live-object arm reach while retaining generic body separation/contact-controlled
binding. The draft `counter_contact_draft` set aligns support to visible top y390;
original canteen support/assets and frozen M0 are not rewritten.

Archive root: `/home/z/.local/share/agentic-animation/art-baselines/`.

| Bundle | Inspectable contents and limits |
| --- | --- |
| `m2-anchor-20261008/` | Initial four-view/facial identity, source and fingerprints; not rig parts |
| `m2-polish-20261008/` | Accepted refined identity, hand details, separate shortened-shirt B scene; static only |
| `m2-native-checkpoint-20261008/` | 520 hashed files, source/diff, draft library, 160 sprites, sheets, logs and props/orientation media; source predates final edits |
| `m2-native-acting-20261008/` | Supplemental 3.2s/77-frame acting episode, stills, receipt/test log; not complete source snapshot |

Checkpoint canonical clips: props 6.727s with AAC/subtitles; orientation compiled
2.8s (container 2.791667s), video only. Both are AV1 1280×720/24fps.
Archived props audio report measured -18.54 LUFS,
-1.99dBTP. Sampled pickup, crouch, mouth changes, separated handover, release and
counter rest frames were inspected by the implementing worker. Browser CTM
palm regression recorded 12 cases, maximum error 0.0000472px.

Documentation audit reran typecheck, test:all (184 passing / 7 skipped),
canonical smoke and 20 Python tests on the current tree; logs and hash binding
are in the readiness report/ticket. Checkpoint receipt reports earlier 183/7.
Passing gates are not full visual acceptance or proof that old media covers newer
source. Comparison found newer `Actor.tsx` and `nativeFigureMotor.test.ts`;
archived `lin_parts.py` and evaluator source match current files. Global doctor is not green (optional corpus/imagegen/
unused adapters); original SVG workflow needs none. No service switch is needed.

`independent-review.md` in checkpoint/workspace accepts only CSS placement,
crouch projection and native reach-stop challenge. It inspected prior test/browser
results without independently rerunning gates. It does not certify M2, full art,
historical-crouch regression or subsequent edits.
Current coverage/comparison bundle: `m2-coverage-readiness-20261010T073047Z/`
under the archive root. It binds current source and regenerated canonical acting,
eight orientations, props video/stills, eight orientation/contact challenges,
all nine renderer-consumed diagnostic mouths, call receipt and M0/B/candidate
comparisons. B is a static reference; matched B motion does not exist. Acting has
explicit calm resets and separately authored one-/two-hand claims. Coincident
reset calls are not separately perceptible; receipt flags nearest-frame sampling.
Current technical/static handoff is in
[tickets/M2-RECOVERY-STATIC-READINESS.md](tickets/M2-RECOVERY-STATIC-READINESS.md).
Native signed-shoulder/posture alignment fixes the missed pickups; all eight
canonical challenges bind, release upright and rest the object on support.
Regression covers every orientation in both travel directions. Final affected
stills and matched M0 comparison are regenerated; unaffected coverage is reused
with manifest hash binding. Superseded contact/props videos are NOT final proof.
Static inspection retains B identity and connected limbs, but angular bent
knees, profile grip occlusion and close handover spacing need fresh art judgment.
Whole-M2 review, real-time viewing and listening remain UNVERIFIED. Parent routes capable whole-M2 artifact/media review, not a user gate or production replacement.
Shoulder overlap, grip-depth layers, independent arm-chain claims and crouch regressions remain; production lin/default paths are unchanged.
## User-observed contact defects and acceptance
User visual feedback: overall appearance has no major issue, but M2 is **not
accepted**. At cup transfer the giver's arm drops and receiver's arm extends
abruptly. Visible limb/prop transitions must be continuous; warnings alone are
not acceptance. User also reports a fixed cup orientation/handle direction and
hand-over-cup penetration. These observations require frame-bound reproduction;
no actual audio acceptance was supplied.

Confirmed requirement: grip the cup handle rather than its center, maintain
credible relative hand/prop orientation and depth, and avoid hand penetration.
User permits a simple handle-contact attachment or a reusable gripping-hand
asset instead of complex animated fingers. The candidate uses an optional local
grip socket with existing fist art, continuous approach/transfer/retract, wrist-
relative rotation and data-selected hand depth; canonical visual proof is pending.
Preserve all historical assets and separate production-path approval.

User-confirmed authoring requirement: ordinary pickup and handover need only
**two semantic calls**, with no explicit positioning or bilateral synchronization.
Pickup automatically approaches, reaches/bends, lifts and recovers to a natural
holding pose; handover automatically prepares both actors, transfers on contact,
withdraws the giver's hand and settles the receiver into natural holding.
Explicit raise/reposition instructions are optional overrides, never required
boilerplate. Holding persists until an explicit release or successful transfer;
no implicit timeout/drop. The dialogue transfer cue is the intended contact/
ownership-transfer beat, not the start of reaching. Engine/plugin planning owns
preparation and recovery; physically infeasible timing must be surfaced, not
repaired by snapping. Candidate bake planning prepares recipients before cues
and diagnoses misses. [Contact model](tickets/M2-CONTACT-MODEL.md) adds socket,
wrist-relative orientation/depth and authored-arm withdrawal arbitration to the
[continuity package](tickets/M2-CONTACT-CONTINUITY.md); real-draft socket pickup and
handover pass all16 view/travel self-checks. [Rendered seam repairs](tickets/M2-CONTACT-SEAM-REPAIR.md)
correct profile onset, point recovery and non-early ceil cues. [Residual repairs](tickets/M2-RESIDUAL-CONTINUITY.md)
preserve native rest-leg geometry and orientation exits and constrain coupled
recovery/Cartesian withdrawal. Fresh integrated review and AV remain open; no M2PASS.
[Support/limiter work](tickets/M2-WORLD-SUPPORT-REPAIR.md) owns limiter diagnosis without prop clamps.
Gait, hip drop and contact/retract solving now share substep whole-body acceptance.
[Live integration](tickets/M2-LIVE-INTEGRATION.md) is an unpublished review candidate: canonical authored pose, atomic motor proposals and world support propagate to the renderer. Current terminal landing/upright, all16/cue/default interaction tests and full gates are green. All11 real manifests have current FK/sole/contact/cue84 proof and frozen audio binding; representative stills and left-profile video are renewed. Fresh integrated review, full art and real-time AV remain open; no production-ready or M2PASS.
Explicit `prop.release` is one call: detach continuously, withdraw naturally,
and let physics automatically handle gravity, support and rebound without author
animation/synchronization calls. Without receiver contact, release cannot remotely
bind the prop. Rotated-solid support candidate: [repair evidence](tickets/M2-ROTATED-PROP-SUPPORT.md).
Free release already below counter falls to floor continuously; putdown lifts
rotated-solid clearance before opening. [Independent B1 review](tickets/M2-ROTATED-SUPPORT-INDEPENDENT-REVIEW.md) gives scoped technical PASS, not M2PASS.
Current720p plain/authored putdown and free-release candidate, inspected consecutive
lift/detach/withdrawal and authored terminal192–194, exact calls/support/audio/source
receipts and fresh-review checklist: `m2-support-media-20261013T1802+0800/index.html`
under the archive root. [Media closure](tickets/M2-SUPPORT-MEDIA-CLOSURE.md) owns
provenance. [Final static review](tickets/M2-FINAL-INTEGRATED-STATIC-MEDIA-REVIEW.md) gives scoped PASS, not M2PASS. Combined archive-root entry: `m2-blink-arm-coverage-20261013T1842+0800/index.html`.
[Coverage ticket](tickets/M2-BLINK-ARM-COVERAGE.md) binds canonical silent arms and reused contact/orientation/mouth evidence; its [review](tickets/M2-BLINK-ARM-INDEPENDENT-REVIEW.md) accepts scoped arms only. [Blink/calm repair](tickets/M2-BLINK-CALM-REPAIR.md) has [scoped technical review](tickets/M2-BLINK-CALM-FINAL-REVIEW.md), not integrated media acceptance.
[Expression/action continuity](tickets/M2-EXPRESSION-CONTINUITY.md) owns current source/media: `m2-expression-continuity-20261013T2254/index.html`. All157 prior warnings (83 boundary/74 rate) reproduce exactly; current original337-frame acting has zero unchanged indexed warnings in eight native orientations. Bone action/ownership and native onset/recovery are repaired; expression families/reset and explicit arms remain. Only acting74/337 and overlap2/53 changed; both clips renewed, other media output-equivalent. Prior [successive recovery](tickets/M2-SUCCESSIVE-CLAIM-CONTINUITY.md)/handoff are historical. H3 and its independent generic facial-object blocker report are historical ([packaging](tickets/M2-FINAL-HANDOFF-PACKAGING.md)). Current facial-object arbitration filters facial predicates rather than granting operations from declared arm parts; mixed body/contact and exact library phases retain ownership. Supplemental exact-source receipts include facial overlap countertests and unchanged-media comparison. Self-proof is not independent acceptance; fresh review, AV/listening/full art/user gates remain open; no M2PASS.
Gravity/drop behavior needs proof; no-breakage partial rebound is
deferred in [tickets/BACKLOG-PROP-DROP-BOUNCE.md](tickets/BACKLOG-PROP-DROP-BOUNCE.md),
not an additional M2 gate. Automatic rebound is the confirmed target behavior,
not a claim that the current motor implements it.
Current supplemental source-binding entry: `m2-facial-object-20261014T0010/index.html` under the archive root; [continuity ticket](tickets/M2-EXPRESSION-CONTINUITY.md) owns repair/proof. `m2-final-packaging-20261013T2348/index.html` is the historical blocked H3 combined presentation; supplemental receipts determine current-source equivalence and inventories. Speech-bearing reused contact/support clips contain audio; new acting/overlap clips are video-only silent, not speech evidence. The user's milestone judgment on this entry is recorded in [tickets/M2-MILESTONE-ACCEPTANCE.md](tickets/M2-MILESTONE-ACCEPTANCE.md) with the immutable acceptance archive `m2-acceptance-20261014T2133+0800/`; he did not itemize listening or lip-sync, and actual listening therefore remains unitemized rather than verified. Production-path replacement was not approved on that occasion; it was opened for `figure/lin_b_draft` on 2026-10-16 ([production-gate-linb](tickets/M2-MILESTONE-ACCEPTANCE.md)).
## Current state and recovery
1. `figure/lin_b_draft` is merged into `library/` as the preferred production
   figure (main at the integration commit; see [STATUS](STATUS.md)); the old
   figures remain installed and loadable. Reusable figure assets are in git.
2. The M2 evidence archives live at
   `~/.local/share/agentic-animation/art-baselines/` (restored 2026-10-16 from
   the remote harvest; binding hashes verified). The old `/tmp` workspace and
   draft-library reconstruction routes are obsolete — the figure is in git and
   the archives are in a durable local path. Do not resynthesize or replace
   the frozen M0 audio.
3. Gates and the user milestone judgment are recorded in
   [tickets/M2-MILESTONE-ACCEPTANCE.md](tickets/M2-MILESTONE-ACCEPTANCE.md),
   including [production-gate-linb](tickets/M2-MILESTONE-ACCEPTANCE.md). Any
   further production art replacement, publication or spending stays
   approval-gated per the roadmap.
4. Evidence archives are local, not replicated; the 4 GB full art-baselines
   set on the remote machine is not yet mirrored locally. Mirror it before any
   local cleanup of that remote.
Archives are local evidence, not replicated backups. The accepted M2 revision
is identified by the acceptance archive's hashes, not HEAD.
