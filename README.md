# agentic-animation

**English** | [简体中文](README.zh-CN.md)

![agentic-animation](assets/logo.svg)

An agent-operated toolkit that turns a written story into a narrated, deterministic 2D animated MP4.

**Every moving image is code — a layered puppet rig, typed performance calls and keyframes rendered by Remotion — so the same inputs and seed give the same frames on every run, and no generative video is involved.** Generated stills are allowed for creating assets; motion never is. Story source, image generation, TTS, lip-sync, music and renderer are swappable adapters chosen in `anim.config.json`, and an optional Hindu-mythology corpus can be enabled with `ANIM_CORPUS_ROOT`.

## Showcase

Real episode renders, checked into the repository and playable on GitHub:

<video controls preload="metadata" width="640" src="https://media.githubusercontent.com/media/ZisIsNotZis/agentic-animation/main/episodes/ai-work-adventure/dist/ai-work-adventure.mp4"></video>
[Watch AI Work Adventure](https://media.githubusercontent.com/media/ZisIsNotZis/agentic-animation/main/episodes/ai-work-adventure/dist/ai-work-adventure.mp4)

<video controls preload="metadata" width="640" src="https://media.githubusercontent.com/media/ZisIsNotZis/agentic-animation/main/episodes/bailan-system/dist/bailan-system.mp4"></video>
[Watch Bailan System](https://media.githubusercontent.com/media/ZisIsNotZis/agentic-animation/main/episodes/bailan-system/dist/bailan-system.mp4)

<video controls preload="metadata" width="640" src="https://media.githubusercontent.com/media/ZisIsNotZis/agentic-animation/main/episodes/liu-secret/dist/liu-secret.mp4"></video>
[Watch Liu Secret](https://media.githubusercontent.com/media/ZisIsNotZis/agentic-animation/main/episodes/liu-secret/dist/liu-secret.mp4)

The figures and set the engine draws, from the provisional cast review
([`evidence/media/`](evidence/media/README.md)):

![athlete_a and gymnast_b figures and the badminton hall set, at render scale](evidence/media/cast-review-2026-10-23/cast-sheet.png)

## Quick start

Needs Node 20+, npm, `ffmpeg` and a POSIX shell. ComfyUI, Kokoro and Rhubarb are
optional and are reported by `anim doctor`, not required for the smoke path —
that path uses the checked-in `_placeholder` puppet.

```sh
npm install                 # one install for the whole workspace
bash tools/setup.sh         # verify toolchain + install uv, fetch rhubarb, list optional services
npm run typecheck           # tsc --noEmit across packages
npm test                    # hermetic unit tests (core + studio + stage lock)
npm run anim -- doctor      # executable preflight: system + every adapter
npm run smoke               # canonical YAML check + make, in an isolated /tmp project
```

`npm run smoke` builds a minimal canonical `episode.yml` under `/tmp`, runs
`check` and `make`, and asserts the generated performance and audio manifests; it
never touches the checked-in episodes. For a real episode:

```sh
npm run anim -- check episodes/ai-work-adventure/episode.yml
npm run anim -- make  episodes/ai-work-adventure/episode.yml
npm run anim -- preview episodes/ai-work-adventure/episode.yml   # Remotion preview
npm run anim -- render-yaml episodes/ai-work-adventure/episode.yml
```

`npm run anim -- --help` prints the full command tree. `anim doctor` is green
once the environment is sound; it keeps reporting ComfyUI and Kokoro as **not
ready** until you install them (`tools/setup-comfyui.sh`, `tools/setup-kokoro.sh`).

## What it can do now

- **`episode.yml` end to end.** One agent-authored script per episode; `check`,
  `make`, `preview`, `render-yaml` are the whole public surface.
- **Typed inline calls.** A procedure call sits at its synchronization point in
  the spoken text — it is cut out of the speech audio and the subtitles, so
  performance and dialogue cannot drift apart.
- **A physical motor.** Skeleton, reach, prop geometry, support surfaces and
  whole-body proposals under explicit invariants; a prop is carried, struck or
  dropped only where the geometry allows it.
- **Two-hand prop ownership.** A main hand that places, offers and strikes, and
  an off hand that binds, carries, sockets and retracts.
- **Camera as a cue.** `camera.follow(target, {sec, zoom})` emits per-frame keys,
  clamped to the stage.
- **Determinism as a contract.** Seeded PRNG, content hashes on every accepted
  artifact, and a 180-second benchmark as the regression check.
- **Swappable adapters.** `tts-edge`, `tts-kokoro`, `tts-espeak`, `tts-say`,
  `tts-dir`, `lipsync-rhubarb`, `imagegen-comfyui`, `music-raga`,
  `corpus-hindu-timeline`, `renderer-remotion`.
- **A category-plugin asset library.** `library/<category>/plugin.js` owns the
  category's semantics, `library/<category>/<name>/` holds each immutable asset;
  identity is the path (`action.slam`, `figure/athlete_a`).
- **Skills for the agents that operate it.** `.agents/skills/` carries the
  local procedures (make an episode, make a character, QA stills, audio QA,
  camera staging, the production pipeline); `tools/skill-audit.mjs` audits them.

## Architecture

One authored input, one compiled artifact, one renderer. Nothing downstream
re-reads the story.

```text
episode.yml -> validated source -> plugin discovery + measured audio timing
  -> performance IR -> Remotion frames -> QA -> MP4
```

```text
packages/
  core/        schemas (zod + exported JSON Schema), adapter interfaces, config
               loader, artifact store, seeded PRNG, motor, invocation, plugins
  cli/         the `anim` CLI: check, make, preview, render-yaml, doctor, char
  adapters/    one capability each: tts, lipsync, imagegen, music, corpus, renderer
  studio/      the Remotion project: puppet runtime, staging, placeholder cast
library/       category plugins and immutable assets (figure, set, prop, voice, ...)
episodes/      per-episode workspaces: episode.yml, sources, delivery MP4
py/            uv-managed Python sidecars (Kokoro TTS, part cutting)
tools/         setup, doctor, the heavy-stage lock, QA and measurement scripts
docs/          the source of truth: problem, goal, requirements, contracts, pipeline
```

`packages/core` is the contract; `packages/cli` is the only entry point;
`packages/studio` consumes only the compiled performance IR. Coordinates, rig
mechanics, procedure recipes and timing defaults belong to assets and compiler
contracts, never to the episode script. Deprecated authoring forms are rejected
rather than translated.

[`docs/INDEX.md`](docs/INDEX.md) owns document precedence: lower index is closer
to purpose and wins on conflict; [`docs/6_ARCHITECTURE.md`](docs/6_ARCHITECTURE.md)
is the master design and [`docs/9_PIPELINE.md`](docs/9_PIPELINE.md) the operating
order.

## Develop

```sh
npm run typecheck           # tsc --noEmit
npm test                    # docs lint + core, studio and stage-lock unit tests
npm run test:all            # adds tests under packages/adapters/*
npm run docs:lint           # documentation structure and source zones
npm run schemas             # regenerate docs/schemas/*.json from the zod schemas
npm run validate:episode-yaml -- episodes/<slug>/episode.yml
node tools/prop-track.mjs episodes/a-badminton/performance.json shuttle 2.8 3.7
```

There is no CI: the gate is `npm run typecheck && npm test && npm run smoke`, run
locally on the machine that changed the tree. Editing an asset or a contract means
updating its owning document in the same change.

## Contribute

Issues for reproducible bugs and design questions; pull requests that change
public behaviour update the owning document in `docs/` and carry a focused test
or measured evidence. See [CONTRIBUTING.md](CONTRIBUTING.md) and
[`docs/9_REPOSITORY_MAINTENANCE.md`](docs/9_REPOSITORY_MAINTENANCE.md).

## Roadmap

Implemented — the engine is closed as a milestone (`0.0.0`): the plugin-host
engine compiles and renders the canonical `episode.yml` path end to end, three
demo episodes (plus fourteen showcase and slice episodes) validate, compile
and render, and the art-quality milestones M0–M7 have delivered their verdicts.

- M6 film language and M7 transfer — delivered, independent review PASS.
- M4 materials and M5 acting — delivered, awaiting the person's judgment.
- M2 character and M3 world — judged met; `figure/lin_b_draft` is the
  recommended production figure.

Planned — the next package is **R8, the rally's own package**: place a receiver's
hand or racket where a descending shuttle *will* be, so a return lands from a cue
a person could author (at least six of eleven sampled cues striking a second
time). Behind it: **M8 default production**, slice B (the high-bar swing does not
bake yet) and slice C (the tea-room `intent pour`). The longer vision is a
written story that becomes a watchable short without a human touching a keyframe,
with every accepted frame reproducible from a hash.

Honest limits: the checked-in episodes are demonstrations, not a product or a
finished film; the DSL, schemas and IR are expected to break; render
non-determinism across sessions is an open ticket. The full record is
[`docs/0_ROADMAP.md`](docs/0_ROADMAP.md).

## License

GNU Affero General Public License v3.0 only — see [LICENSE](LICENSE).
