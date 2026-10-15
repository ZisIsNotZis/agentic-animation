# DSL hard-cutover

- [x] Canonical docs rewritten and internally consistent
- [x] New YAML parser/schema and registry contract implemented
- [x] Audio-authoritative scheduler supports blocking/nonblock/span/state
- [x] Automatic staging and complete renderer projection implemented
- [x] AI 打工奇遇记 migrated to English IDs/new syntax
- [x] Typecheck and all tests pass
- [x] Representative visual/audio QA inspected
- [x] 3-minute 720p/24fps threaded benchmark does not regress materially

Evidence and exceptions are recorded below as work completes.

- Docs: `docs/INDEX.md` now routes to compact canonical DSL, schema,
  architecture, pipeline, decision, and handoff documents (all under 120 lines).
- Canonical check: 10 scenes and 269 spoken takes.
- Audio: 269/269 exact prepared takes, 269 cache reuses on repeat make;
  compiled runtime 2442.534 seconds. Fixed empty brace-boundary chunk IDs.
- Validation: `npm run typecheck`; `npm run test:all` = 88 passed, 7 skipped,
  0 failed; exported 13 schemas.
- Visual QA: inspected 3-minute contact sheet and action frame. Semantic staging
  now reaches the renderer; both actors remain in-frame at scale 0.58, with
  visible expression/VFX and voice-only subtitles.
- Audio QA: 180-second MP4 contains AAC; mean -18.3 dB, max -1.8 dB.
- Benchmark: 180 seconds, 1280x720, 24fps, four Remotion workers, 4320 frames;
  wall 467.87s, peak RSS 681264 KB. Previous baseline was 452.01s / 743716 KB:
  +3.5% wall, -8.4% memory, within the non-regression tolerance.
- Render scaling now snaps to an integer output height, avoiding fractional
  `stitchFramesToVideo()` dimensions from decimal two-thirds CLI input.
