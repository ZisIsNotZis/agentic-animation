# M2 contact model — fresh independent review

2026-10-13T12:10:52+08:00 — Independent Reviewer; 20-minute maximum,
read-only implementation/owner documents. Only this report written. Product
sources frozen; concurrent media work is outside this review's write ownership.
HEAD `4213bc40b64241b500b0d6097cccc585a0dc3eb3` plus inherited dirty candidate.

## Verdict: scoped technical PASS; visual/whole-M2 acceptance UNVERIFIED

No blocking implementation defect found in the contact-model/profile repair
slice at the hash-bound revision below. This verdict covers generic native
profile reach repair, all16 pickup/handover renderer-FK challenges, preserved B1
withdrawal arbitration, socket mechanics, persistent holding, free release versus
putdown, and pre-cue preparation/diagnostics. It does **not** certify convincing
handle wrap/depth in canonical rendered media, real-time motion, audio, full M2,
user milestone judgment or production-path approval. Tests/contracts are not
visual PASS. The distinct media review must close those experiential criteria.
No repairs, source/owner-doc changes, asset changes, commits or staging performed.

## Contract and scoped inspection

Read current ART_CHARACTER_M2.md, SCHEMAS.md socket/artwork contracts,
WORLD_PUPPET_MOTOR.md contact/recovery/planning contracts, NARROW_EPISODE_DSL.md
ordinary two-call pickup/handover and one-call release, M2-CONTACT-MODEL.md and
M2-CONTACT-CONTINUITY-REVIEW.md B1. Inspected archived leaf motor/pose deltas and
current compiler, registry/schema, motor contact/hold/release/planner, evaluator,
shared actor pose/reach solver, interaction layers, prop renderer and detector.

- **Generic profile repair:** native crouch depth derives from half the shorter
  declared hip-knee-foot chain, not a view/actor/scene offset. Motor shoulder,
  rest hand and wrist conversion use the same depth as native renderer planted
  leg IK. Legacy 90px depth remains. Incoming hand speed ramps over 0.25s under
  unchanged 480px/s cap; native near-rest crouch recovery decelerates rather than
  disabling knee warnings. No socket radius, timeout or detector gate expansion
  appears in the leaf repair.
- **B1 closed technically:** unloaded reach influence fades into explicit bone
  arm poses; loaded contact retains authority. Independent overlap regression
  exercises meaningful authored/contact pose differences on actual native
  geometry for transfer and release, requires authored contribution before
  withdrawal ends and quiet endpoint joints/angles. Prior frame143 authored
  event-end behavior is not represented as repaired by this slice.
- **No global flip waiver:** detector samples shared visible FK and wrapped
  segment angles with 30px/35deg defaults. Flip-adjacent unrelated prop jumps
  remain detectable; the targeted negative challenge passes.
- **Socket geometry:** compiler scales intrinsic socket relative to x100/base;
  prop CSS rotates/scales around the same base anchor in its 200×160 art frame.
  Socket bind uses actual moving-hand distance, not prop body center. Motor
  preserves attachment orientation, rate-limits wrist-relative rotation and
  evaluator consumes baked rotation. `front` selects the extra gripping-hand
  foreground plane; `behind` does not. This is layer/mechanics verification,
  not independent proof of visually convincing fingers or nonpenetration.
- **Ownership/holding:** transfer removes giver ownership on recipient contact;
  outgoing hand remains for withdrawal. Held state persists past intent end,
  settles to carry, and has no timer drop. Free release opens immediately with
  carry momentum, without remotely binding an idle receiver. Legacy raw/binding
  release and explicit putdown remain support-aware placement.
- **Cue planning:** redirected handover motor intent schedules recipient and
  giver preparation before cue, bounded by earlier motor intents/scene start;
  actual contact is gated no earlier than cue. Missed cue diagnostics propagate
  to make. Existing pickup/handover/release factories remain semantic calls;
  no authored bilateral synchronization or new language is required. Conservative
  planning is not a promise every requested beat is feasible.

## Independent falsifiable checks

All commands executed against current source, with foreground deadlines ≤180s.

1. `node --import tsx --test` on contactContinuity, nativeFigureMotor, propGrip,
   nativeSkeletonPose and performanceEpisode: **36/36 PASS**. This includes all16
   actual-draft pickup and all16 handover/free-release tests, drawn palm/contact
   equality for pickups, arm/segment warnings, planted crouch recovery, persistent
   hold, B1 overlap, negative flip/joint jumps, free velocity and putdown contrast.
2. Independent stdin ES-module challenge strengthened the handover suite:
   same eight orientations × two directions, native fixture at scale0.8,
   giver x650±100 / receiver x650∓300, socket [26,-25], radius2, depth behind,
   initial rotation20, pickup0s/handover2s/free release6s. For every held frame
   before release, computed renderer FK palm in world coordinates and compared
   it with the rotated live socket; asserted ≤2.05px and no dual owners.
   **16/16 PASS**, maximum error **1.8861069863px**; maximum prop displacement
   around transfer **15.1731671051px**. Transfer frames ranged66–74 (the direct
   simulate challenge is not a pre-cue bake). This independently fills the
   handover suite's missing per-held-frame socket/FK assertion.
3. Bake pre-cue challenge independently rerun: ample pre-roll transfers frame72–73
   for cue3s, giver offer differs from no-offer by >10px; infeasible0.05s cue
   diagnoses a miss rather than snapping. No supplemental script sync involved.
4. `npm run typecheck`; `npx tsc --noEmit -p packages/studio/tsconfig.json`:
   **PASS**. `npm run test:all`: **216 total / 209 PASS / 7 skipped** (optional
   corpus coverage). `npm run smoke`: **PASS**, canonical check/make duration0.55s.
   `python3 -m unittest discover -s tools/art-direction-study -p 'test_*.py'`:
   **22 PASS**. `git diff --check`: **PASS**.

## Revision and archive binding

Bundle: `/home/z/.local/share/agentic-animation/art-baselines/m2-socket-repair-20261013T040550Z`.
Independently SHA256-verified **30/30 current scoped files** against
source-hashes.json and **66/66 archive entries** against SHA256SUMS.json;
zero mismatches, including all four owning product documents and contact ticket.
The inventory is the complete scoped revision reference, not HEAD alone.

```text
source-hashes.json 5f41df5a880920457d5528526aa27e0ab493ed4d629cdc6ad4cb652deb0a3bcc
motor/index.ts 9c76634f90f8df83cc6a8855c19de3b7f8ab10d0d9ecdcd15d22c4a480cb6033
actorPose.ts 08de9c6f2496effa4bd7055b699fe8b3dcaaebbf83ebab13fc7a54410270b330
contactContinuity.test.ts 63e12fc55465384a493e6e39918b59f09b56410eec2e8459fa99fd89270b06c7
profile-sheet.png 1a28760072b1c911dbc2154810a137bcf94950d3e94575314e8bae84c393b58d
```

Pre-existing staged .gitmodules/vendor entries remain; staged binary diff SHA256
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`
is unchanged. Reviewer staged nothing; repository is **not** unstaged-clean.

## Actual visual modality and residual limits

Independently viewed hashed profile-sheet.png (frames8/23/24/60/144/168): visible
native profile crouch, connected reaching arm, pickup, persistent upright carry,
release and returned resting arm. This small procedural thermos sheet supports
presence/connectedness only. The bent carry elbow is sharply angular; the small
prop/hand cannot establish close grip wrap/depth quality from this sheet. No
canonical eight-view close-contact frames, video playback or listening were
performed here. Existing walking-leg and free-gravity detector advisories are
not waived and not a whole-motion PASS. Bounce remains the expressly deferred
backlog behavior, not claimed implemented. Full M2/AV/user gates remain open.

Recommended next action: integrate the separately owned hash-bound canonical
media review, especially close socket/depth at transfer and real-time withdrawal,
then route remaining whole-M2 acceptance without treating this technical verdict
as production asset-path approval.
