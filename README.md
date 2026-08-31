# agentic-animation

An agent-operated toolkit that turns a written story into a finished, narrated
2D animated MP4 — deterministically, locally, with **zero generative video**.
Generated *still* images are allowed for asset creation only; all *motion* is
code-driven (a layered puppet rig + keyframes, rendered by Remotion).

The toolkit is project-agnostic: story source, image generation, TTS, lip-sync,
music, and renderer are all swappable adapters selected in `anim.config.json`.
An optional Hindu-mythology corpus can be enabled with `ANIM_CORPUS_ROOT`.

Status: **active development** (`0.0.0`). Episodes in this repository are demos,
not a stable product API or finished-film release. Interfaces may change.

## Quickstart

```sh
npm install                 # one install for the whole workspace
bash tools/setup.sh         # verify toolchain + install uv, fetch rhubarb, (optional) ComfyUI/Kokoro
npm run typecheck           # tsc --noEmit across packages
npm test                    # hermetic unit tests (core schemas + stage lock)
npm run anim -- doctor      # executable preflight: system + every adapter
npm run smoke               # canonical YAML check/make smoke in an isolated /tmp project
```

`npm run smoke` creates a minimal canonical YAML episode in `/tmp`, runs
`check` and `make`, and asserts the generated performance/audio manifests.
It does not modify or delete episode demos in the repository. For a real YAML episode:

```sh
npm run anim -- check episodes/ai-work-adventure/episode.yml
npm run anim -- make episodes/ai-work-adventure/episode.yml
```

`anim doctor` is green once the environment is sound; it reports ComfyUI and
Kokoro as **not ready** until you install them. The CLI runs on `tsx` (no
bundler). The formal episode pipeline is:

```
check <episode.yml> · make <episode.yml> · preview <episode.yml> · render-yaml <episode.yml>
```

Run `npm run anim -- --help` for the full command tree and flags.

### First real character (M1)

The smoke loop uses the checked-in `_placeholder` puppet. To make a real
character you need ComfyUI + the image model and (for shipping voices) Kokoro —
neither is installed by default:

```sh
bash tools/setup-comfyui.sh   # ComfyUI + Qwen-Image-Edit GGUF (~13 GB) + ComfyUI-GGUF node
bash tools/setup-kokoro.sh    # uv-managed Kokoro TTS sidecar (en + hi)
npm run anim -- char new krishna     # brief + house-style + gen-inputs
#   edit the brief from the corpus, then:
npm run anim -- char gen krishna     # add --dry-run to author the rig offline first
npm run anim -- char cut krishna
npm run anim -- char rig krishna
npm run anim -- char approve krishna --approver "you"
```

See `docs/PIPELINE.md` for the full flow.

## Canonical YAML pipeline

`episode.yml` is the only agent-authored executable script. It binds friendly
episode-local IDs to versioned assets, declares semantic staging, and places
typed inline calls at dialogue boundaries:

```text
episode.yml -> validated source -> registry + audio timing -> performance IR
  -> Remotion frames -> QA -> MP4
```

The renderer consumes only the compiled performance IR. Coordinates, rig
mechanics, procedure recipes, and timing defaults belong to assets and compiler
contracts. Deprecated authoring forms are not accepted. See [docs/INDEX.md](docs/INDEX.md)
for document ownership and conflict precedence.

## Layout

- `packages/core` — schemas (zod + exported JSON Schema), adapter interfaces,
  config loader, artifact store, seeded PRNG, logger. **The contract.**
- `packages/cli` — the `anim` CLI, single entry point for every stage.
- `packages/adapters/*` — one capability each (tts, lipsync, imagegen, music,
  corpus, renderer).
- `packages/studio` — the Remotion project: puppet runtime + placeholder cast.
- `library/` — versioned asset library (characters, backgrounds, motions, style).
- `episodes/<slug>/` — per-episode workspaces.
- `py/` — uv-managed Python sidecars. `vendor/` — pinned binaries. `tools/` — setup + doctor.

## Docs

- [docs/INDEX.md](docs/INDEX.md) — canonical design navigation and precedence.
- [docs/STATUS.md](docs/STATUS.md) — current verified state, limits, and next work.
- [docs/REPOSITORY_MAINTENANCE.md](docs/REPOSITORY_MAINTENANCE.md) — upkeep and contribution rules.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — the master design (read before structural changes).
- [docs/DECISIONS.md](docs/DECISIONS.md) — tool + licensing decisions (binding).
- [CLAUDE.md](CLAUDE.md) — agent operating guide.

## Evidence, versioning, and contribution

The latest recorded checks are summarized in [docs/STATUS.md](docs/STATUS.md):
typecheck, 112 passing tests with 7 skips, visual asset inspection, audio QA,
and a 180-second benchmark. The full film render remains future work. The
package is `0.0.0`; breaking DSL, schema, and IR changes are expected. Use
Issues for reproducible bugs and design questions; PRs should update the owning
document when public behavior changes and include focused tests or evidence.
Maintainers review and merge PRs; do not commit generated outputs or secrets.
