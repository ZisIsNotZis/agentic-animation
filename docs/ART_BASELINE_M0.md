# M0 — frozen art/performance baseline

## Outcome and scope

Completed 2026-10-08 as a **baseline capture**, not artistic or functional
production approval. No engine, library asset, episode source or checked-in
video was changed. The roadmap is [ART_PRODUCTION_UPGRADE.md](ART_PRODUCTION_UPGRADE.md).
Current drawing weaknesses are accepted facts; this capture provides stable
comparisons for improvements, not an experiment to rediscover that deficit.

Reused three existing episodes rather than inventing a simpler demonstration:

| Role | Episode | Why selected | Compiled duration / decoded frames |
| --- | --- | --- | --- |
| Primary art/interaction scene | `episodes/showcase-props/episode.yml` | Two characters, thermos, pickup, handover, putdown, speech/visemes, shop counter | 6.727 s / 161 |
| Acting and orientation check | `episodes/showcase-actions/episode.yml` | Different palettes, two slam timings, push/reaction, quarter and back views | 9.964 s / 239 |
| Camera/movement check | `episodes/showcase-camera/episode.yml` | Approach, fearful expression, punch-in and return to wide | 8.234 s / 198 |

Total compiled footage is 24.925 s, within the 30-second iteration budget.
These are deliberately short existing demonstrations, not commercial reference
films. Primary scope for M1 is the thermos scene; the other two remain regression
probes. Do not replace difficult beats with prettier but easier static scenes.

## Frozen evidence and provenance

Local durable bundle (outside Git):
`/home/z/.local/share/agentic-animation/art-baselines/m0-20261008-4213bc4/`

Working capture: `/tmp/agentic-animation-art-m0-20261008/`.
The durable bundle, not the disposable working directory, is the baseline.

- Engine revision: `4213bc40b64241b500b0d6097cccc585a0dc3eb3`, branch `main`.
- Pre-existing changes: staged `.gitmodules` and two vendor submodules;
  untracked `.agents/skills/huashu-design` and `huashu-art-motion` links.
  Preserved untouched. New roadmap/docs do not affect rendered code.
- Frozen source: `source/` contains tracked packages/tools/scripts/config and
  the actual library resources, including locally available audio cues.
- Source fingerprint (777 files):
  `2fe05ba019fba92fe16c7b9fc3422143c5e36428b0acf4b23426e7f0a66c04a1`.
  `source/SHA256SUMS.json` records per-file hashes; `receipt.json` records
  episode hashes, exact sampled frames and speech/call timings.
- `ARTIFACT_SHA256SUMS.json` fingerprints the final bundle files. Keep frozen
  audio, measured timing, manifests, videos and stills for later comparisons.
- `episodes/<name>/dist/<name>.mp4`: fresh baseline videos, not repository goldens.
- `stills/<name>/frame-NNNN.png`: exact decoded zero-based frame at 24 fps.
- `stills/<name>-sheet.jpg`: labeled contact sheets; `frames.json` maps samples.
- `logs/`: check, make, render, ffprobe and validation evidence.

This is a local evidence archive, not a published or replicated backup. If it
is missing, explicitly recapture and version the replacement; do not claim a
new renderer output is the original baseline.

## Capture commands and environment

Commands ran from the repository with copied unchanged YAML in
`$B/episodes/<name>/episode.yml`, where `$B` is the working capture directory.
`$B/library` resolved to the repository library during capture, and now points
at the frozen `source/library`. The renderer resolves sets relative to the
manifest's `../../library`; preserving this directory structure is essential.

```sh
npm run anim -- doctor
npm run anim -- check episodes/<name>/episode.yml
# Each make bounded by timeout 180–240s; initial cache misses need this flag.
npm run anim -- make "$B/episodes/<name>/episode.yml" --synthesize-unmatched
# Each render bounded by timeout 300s, foreground result collected in logs.
/usr/bin/time -v npm run anim -- render-yaml \
  "$B/episodes/<name>/episode.yml" --threads 4 --fps 24 --force
python3 "$B/extract-stills.py"
```

Node 24.18.1, ffmpeg 6.1.1, Linux; output 1280×720, 24 fps, four workers.
Edge TTS speed 1.2, Rhubarb analysis; AV1 CRF 33 preset 8, AAC, mov_text.
Reproduction requires compatible installed dependencies and the source
fingerprint above. Frozen cached WAVs preserve narration; regenerate manifests
at the new bundle path before rerendering because generated paths are absolute.
Future art comparisons reuse this audio/timing instead of silently resynthesizing.

| Clip | Fresh render wall time, including cached make | GNU time max RSS | Decoded video duration |
| --- | --- | --- | --- |
| props | 16.87 s | 1,146,304 KiB | 6.708333 s |
| actions | 21.50 s | 1,159,764 KiB | 9.958333 s |
| camera | 17.52 s | 1,162,152 KiB | 8.250000 s |

Total accepted-render wall time: 55.89 s. Max RSS is GNU time's process-tree
statistic, not a simultaneous system-wide memory sum. Duration rounding relative
to compilation is below one 24-fps frame. ffprobe confirms video/audio/subtitle
streams, dimensions, frame rate and exact frame counts for all three files.

Rejected capture attempts are excluded from the durable baseline; provenance
and process history are in the [ticket](tickets/M2-DOC-READINESS.md) and archive
logs. No fallback voice/provider was substituted.

## Inspected visual findings

Self-review: all 37 sampled frames inspected on three contact sheets; eight
key frames additionally inspected at native 1280×720 resolution. No independent
review, continuous video playback, listening, loudness analysis, or exhaustive
per-frame contact proof was performed. Streams/viseme metadata do not prove
natural voice or perfect lip synchronization. This is not a final-production
QA pass. Defects below were intentionally not repaired during M0.

| Finding / evidence | Interpretation and owner | Future milestone |
| --- | --- | --- |
| props f0: lin/awei nearly identical hair, face, purple outfit and proportions | Weak identity differentiation; figure design, not just palette | M1/M2 |
| all three sheets: thick uniform outlines, rod-like limbs, limited hand shapes and planar faces | Puppet readability exists, but lacks deliberate silhouette and expressive anatomy | M2/M5 |
| props f0/f16: counter is broad rectangles; actions f44: window/table are schematic shapes; camera wide: polygon mountains | Scene space/detail/light are underdeveloped; set and composition | M1/M3/M4 |
| props f0/f16: flat background versus hatched clothing and generic oval ground shadows | Texture is not coherent art direction or scene lighting | M3/M4 |
| props f104/f112: faces and bodies heavily overlap during transfer, arms spread; cup obscured | Handover staging/grip visibility unresolved; not a passed physical interaction | M2/M3/M5 |
| props f160: cup remains between bodies, not visibly placed on counter | Intended putdown is not established by sampled output; inspect timing/state/support before claiming success | M3/M5 |
| actions f36/f44: hand gesture distant from tiny declared desk | Slam is not visually legible as desk contact; action/prop scale/staging | M3/M5 |
| actions f168/f184: approach and reaction lean are visible | Useful motion exists; sampled reaction alone does not prove every contact substep | Retain in M5 |
| actions f208/f224: back-view change visible | Existing orientation capability worth preserving | M2/M5 |
| camera f96: enlarged left actor's hand crosses left edge; f112–144: subjects clustered left | Focus/containment/composition defect despite visible zoom | M3/M6 |
| props and camera: same-role faces/emotions differ mainly through eyes/mouth | Need expressive pose and silhouette, not facial substitution alone | M2/M5 |
| native samples: small actor/object labels remain; large subtitles compete with art | Presentation/readability work; remove debug-like clutter intentionally, do not hide it in baseline | M3/M6 |

No numeric beauty score was invented. Future acceptance compares actual images
and clips against these exact narrative beats, with separate art/function/cost
verdicts. Fixing a defect alone does not count as an artistic breakthrough.

## Checks and continuation

Observed at the unchanged engine/source revision above:

- `npm run typecheck`: passed.
- `npm run test:all`: 166 passed, 7 skipped, 0 failed (173 total).
- `npm run smoke`: passed canonical check → make, 0.55-second fixture.
- `anim check` on all three original sources: passed.
- Fresh canonical makes/renders: passed; ffprobe verified all final files.
- `git diff --check`: passed after documentation edits.
- Global `doctor`: **not green** (missing optional corpus; unavailable image
  generation and several unused adapters). Edge/Rhubarb/render worked; no claim
  that image generation or the entire environment is ready.

M0 is complete as a frozen, known-defective baseline. Learning coverage and
milestone scope live only in [ART_PRODUCTION_UPGRADE](ART_PRODUCTION_UPGRADE.md).
Current progress and continuation are in [STATUS](STATUS.md) and
[ART_CHARACTER_M2](ART_CHARACTER_M2.md); this frozen evidence does not authorize
later production changes or certify the current modified engine.
