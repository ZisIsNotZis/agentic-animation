# M2 independent execution verification

## Scoped contract

Fresh independent verifier, not implementation author. Own only this ticket;
no source, owner-document, asset, staging or history modifications. Independently
recompute scoped source/bundle hashes and renderer-input/media equivalence for
final validation-only repair. Separate ticket evolution from render/code drift.
Concurrent reviewer owns code/contract inspection; no duplication of that task.
AV listening/real-time viewing, user judgment and production authorization remain
UNVERIFIED. Cohesive leaf, no delegation, 20-minute finite budget with bounded
commands. Recommendation: inspect actual inventory/scripts, independently hash
bytes, reproduce bindings and exact-source gates without rerendering unchanged
renderer inputs. Acceptance is scoped mechanical verification, never full M2 PASS.

## Verdict

**VERIFIED: scoped independent execution proof.** Combined with the fresh
reviewer's no-issues source/static inspection below, the identified technical/
static subset now has both artifact inspection and independent execution proof;
its execution-proof blocker is discharged. This is not an assertion that every
M2 experiential criterion is covered: **full M2 remains UNVERIFIED**. Actual AV,
user milestone judgment and separately named production-path approval are open.
No new render, subjective media acceptance or authorization inferred.

## Revision and byte verification

HEAD: `4213bc40b64241b500b0d6097cccc585a0dc3eb3` plus dirty working tree.
Bundles under `/home/z/.local/share/agentic-animation/art-baselines/`:

| Bundle | Independently hashed inventory entries | Mismatches |
| --- | ---: | ---: |
| `m2-recovery-static-20261010T082032Z` | 2521 | 0 |
| `m2-current-video-20261010T083743Z` | 1017 | 0 |
| `m2-svg-validation-20261010T084349Z` | 24 | 0 |

Both original `source-hashes.json` inventories have 877 paths and SHA-256
`da9cca4b4740c5cac79d075a71df30475518ac759293476c6fca42d91a4d3718`.
Only three current byte deltas exist against either original source baseline:

- `packages/core/src/schemas/figureArtwork.ts`:
  `0faaeac0d80ecd6dae417f370fbb7de931be74a9e218ee7598f3ea78082b3c98`
- `packages/core/test/figureArtwork.test.ts`:
  `8e0d7768199d7af054729d6913bed750856e2e886731373dc6c190db42c47acf`
- `docs/SCHEMAS.md`:
  `5d43799fe15fa4d204f19c57340a949fa49ea9ddf46e154a4eb267afe0a3e39c`

All four supplemental source hashes match current bytes, including repair ticket
`96da614404fd0a407fe904312b1a339f71a04a7a6d24ae3b657a25243dd58d1f`.
Full tracked-plus-untracked regular-file enumeration (`git ls-files --cached
--others --exclude-standard -z`) finds only three files outside the original
877-path inventory: current-video ticket, repair ticket and this new ticket.
There is no uncovered runtime/code/config addition. These are ticket-only
additions, not renderer drift. Current-video ticket hash:
`74958613aa0eace010157e1ec6eeeb2e6f376c6916b581beb5257acb1877ee7f`.

Current 877-path map hash is
`0302a6bba0983c843feb09c9fe7b4f38457947e0db8e0fcedaadf0c09baca052`;
computed as SHA-256 of UTF-8 `json.dumps(current,sort_keys=True,separators=(',',':'))`,
where current maps inventory paths to independently computed current file hashes.
Final recheck after gates yielded the same deltas and hashes.

Bundle `SHA256SUMS.json` file hashes respectively:
`8588f9964c08172ac3927996ff90db5f6577bccd266682aed281e64e0cf528d4`,
`1150dff9b9cd229c6d4971a10a12759e5aa8749bac878f322a4b0218e3e40176`,
`572812b8eac098de2cb08ce7f79dd50543924e7c415a04cfe98df17434403da8`.
Inventory checks bind listed bytes, not arbitrary unlisted archive contents or
all historical archives. Existing staged binary diff SHA-256 remains
`b4a79915138d3105bf70bf9fb184f8c8d6b025fcc08e170d17bd963da666865e`,
matching archived before/after receipts. `.gitmodules` and two vendor gitlinks
remain pre-staged; repository-wide no-staged-files is false. Verifier staged none.

## Independently executed commands and results

- Python SHA-256 recomputation over every path/value in the three actual
  `SHA256SUMS.json` and `source-hashes.json` inventories: exit0, results above.
  Per invocation deadline 90 seconds; final source recheck deadline 30 seconds.
- `timeout 90s node_modules/.bin/tsx -e "$(python3 ...)"`: executed actual
  supplemental `evidence/render-binding.ts` against current imports, replacing
  only its `/tmp/m2-svg-bundle` output-path read and final file write with stdout.
  Original archived script/bundles untouched. All assertions exit0: 25 archived
  artwork/performance JSON files, draft artwork, 45 artwork objects parse deep-
  equal under current schema. Renderer and all other inventoried render-producing
  code are unchanged. Validation tightening does not transform these render inputs.
- Independent Python reconstruction using **archived** static workspace and video
  `inputs`: nine old/new raw manifest hashes match binding receipt, and structures
  compare equal after workspace-root normalization plus removing only
  `/generatedBy/at`, `/generatedBy/inputHash`, `/audio/generatedBy/at`.
  Ninety actual WAV pairs match each other and their recorded hashes. Unaffected
  acting/orientation retained media match actual original workspace bytes and
  recorded manifest/media hashes. Exit0, total command deadline 180 seconds.
- Same independent command runs `ffprobe -v error -show_streams -of json` and
  `ffmpeg -v error -threads 2 -i MEDIA -map 0:v -map 0:a? -f null -` on all
  twelve bundled MP4s; four finite workers, per-probe 20 seconds/per-decode
  45 seconds. All full video/audio decodes exit0. Nine affected plus M0:
  161 frames, 1280×720, 24/1fps, video/audio/subtitle streams. Reused acting:
  337 frames; orientation: 67 frames; both silent, 1280×720, 24/1fps.
- `timeout 180s npm run typecheck`: exit0.
- `timeout 180s npm run test:all`: exit0, 198 tests, 191 pass, 7 skip, 0 fail.
  Pipeline exit checked separately from `tail`: both 0.
- `timeout 120s npm run smoke`: exit0; canonical check/make succeed, 0.55s
  manifest in isolated `/tmp/anim-canonical-smoke-iWVBzm`.
- `timeout 60s env PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover
  -s tools/art-direction-study -p 'test_*.py'`: exit0, 22 tests pass.
- `git diff --check`: exit0. No product/source repair or tests added here.

These are fresh executions, not acceptance based on worker completion claims.
Archived render command receipts remain provenance rather than independently
rerun render commands. Existing bound pixels/audio are mechanically applicable
under final validation-only change; decode/equality is not perceived AV proof.

## Fresh artifact review provenance

Current independent source/static reviewer artifact:
`/home/z/.pi/agent/sessions/--home-z-vibe-agentic-animation--/subagent-artifacts/e989042a-55f6-4fdc-998c-b2614ab4ca4e_reviewer_output.md`
SHA-256: `4f99e9f2691c31553c506db84503a35e44b6a55d5e63a9f3541724a0b09e0166`.
It reports no issues in its inspected source/static subset: CSS bypass closed,
valid-frame rejection/local-fragment tests meaningful, motor integration coverage
present, sampled front/right static pickup/recovery connected and identity retained.
Its sole technical/static acceptance blocker was missing independent execution.
It inspected archived tests but did not execute them or hashes; those observations
are not relabelled execution. This ticket supplies the separate execution proof.

Prior CSS-blocking reviewer artifact:
`/home/z/.pi/agent/sessions/--home-z-vibe-agentic-animation--/subagent-artifacts/fd41ab47-d04a-49f0-90b7-771b5edca62e_reviewer_output.md`.
Proposed `M2-INDEPENDENT-STATIC-REVIEW.md` and `M2-FINAL-TECHNICAL-REVIEW.md`
are not assumed written; current review facts are persisted here by instruction.

## Remaining exact gates

Actual AV entry:
`/home/z/.local/share/agentic-animation/art-baselines/m2-current-video-20261010T083743Z/index.html`
and adjacent `AV-CHECKLIST.md`. Neither listening nor real-time watching was
performed by this verifier; checklist completion remains UNVERIFIED.

Review staged props and all eight contact clips 0–6.727s; listen to three lines
0–3.476644, 3.476644–4.679977, 4.679977–6.726666s and assess lips/subtitles/
balance. Contact focus: 1.041667–1.666667, 3.5–4.666667, 4.708333–6.666667s.
Review reused acting 0–14.041667s, orientation 0–2.791667s and matched M0.
Angular knees, obscured profile palms, close diagonal spacing and temporal
contact/support/depth remain experiential judgment risks, not mechanical PASS.
Then user M2 milestone judgment and separately named production asset-path
approval are required; no production replacement/publication authorized here.
