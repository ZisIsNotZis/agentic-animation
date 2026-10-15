# Performance-manifest rendering

- [x] Renderer exposes `renderManifest({manifestPath, outPath, fps, crf, threads, duration, scale, force})`.
- [x] Adapter reads `performance.json`, renders Remotion composition `performance` with `inputProps.manifest`.
- [x] Duration/frame range and progress denominator match the rendered frame count.
- [x] Remotion concurrency is exactly `threads`; existing browser/cache/GPU/multiprocess settings remain active.
- [x] Silent video is muxed with manifest/preparation audio and exact voice subtitles when available.
- [x] Report returns actually rendered frames; still-manifest support stays minimal.
- [x] Focused unit tests and typecheck pass; no costly render.
