# Project status

Last reconciled: 2026-08-31. Status: **active development**.

## Verified now

- Canonical narrow YAML DSL and strict registry/compiler path are implemented;
  deprecated authoring forms are rejected.
- The demo episode validates as 10 scenes with 269 spoken takes.
- Audio-authoritative preparation recorded 269/269 exact takes and 269 cache
  reuses on repeat make; one compiled runtime was 2442.534 seconds.
- `npm run typecheck` passed. `npm run test:all` recorded 112 passed, 7 skipped,
  and 0 failed in the latest visual-polish pass.
- Visual QA inspected Chromium-rendered backgrounds and pose/expression atlases;
  earlier compiled-performance QA also inspected a three-minute contact sheet
  and action frame.
- Audio QA for the 180-second MP4 found AAC audio, mean `-18.3 dB`, and max
  `-1.8 dB`. Voice mapping distinguishes the two demo actors.
- Benchmark: 180 seconds at 1280x720, 24fps, four Remotion workers, 4320
  frames, 467.87 seconds wall time, and 681264 KB peak RSS. The recorded
  comparison was 452.01 seconds and 743716 KB; wall time rose 3.5% while memory
  fell 8.4%.

## Limits

- The complete film render and final whole-film QA are not complete.
- ComfyUI and Kokoro remain optional environment-dependent production services;
  the smoke path does not prove their availability or output quality.
- Episode content and APIs may change while the package remains `0.0.0`.
- `.scratch/` records working evidence; it is not a substitute for a fresh run.

## Next work

1. Render the complete demo from the inspected performance manifest.
2. Inspect final duration, streams, captions, loudness, contact sheets, and
   continuity; record commands and artifacts.
3. Prepare a versioned release artifact only after those gates pass.

## Evidence policy

Evidence names the command, scope, result, and limitation. A passing test is
not visual or audio approval. A benchmark that cannot establish a legal input,
working process, and produced artifact is not performance data. Refresh this
file when later verification supersedes the recorded results.
