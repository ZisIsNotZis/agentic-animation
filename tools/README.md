# tools/ — setup, doctor, and the heavy-stage lock

Operational scripts and modules (workstream E). Nothing here is on the render
path or writes a manifest, so these may use the wall clock and the network.

## Quick start

```sh
tools/setup.sh --yes          # verify toolchain, install uv, list capability scripts
npm install                    # once, at the repo root
npx remotion browser ensure    # one-time headless Chromium for preview/render-yaml
npm run anim -- doctor         # verify the whole environment
```

`setup.sh` orchestrates; it does **not** download the big models. Pick what you
need from the table below and run that script.

## What each script does — and what it downloads

| Script | Owner | Downloads | Approx size | Needed for |
|---|---|---|---|---|
| `setup.sh` | E (here) | uv installer (~30 MB env) | tiny | Everything; run first |
| `fetch-rhubarb.sh` | A | Rhubarb 1.14.0 binary → `vendor/rhubarb/` | ~15 MB | optional lip-sync adapter |
| `setup-kokoro.sh` | A | Kokoro 82M weights + uv env (`py/`) | ~350 MB | optional TTS adapter |
| `setup-comfyui.sh` | B | ComfyUI + Qwen-Image-Edit GGUF Q4_K_M + text encoder + VAE | ~14 GB | `anim char gen` (image gen) |

Sizes are indicative; the owning script prints exact figures before downloading.
None run automatically — they are large and opt-in. `setup.sh` only warns that
they exist (or don't yet) and points you at them.

Smoke-testing the pipeline needs **none** of the models: use the macOS `say` TTS
provider (`adapters.tts: "say"` in `anim.config.local.json`) and the checked-in
`_placeholder` cast.

## Configuration

- `anim.config.json` (repo root) — the committed defaults: adapter selection,
  paths, video/render settings, `seed`, `allowFluxFamily: false`.
- `anim.config.local.json` — per-machine overrides, deep-merged on top and
  gitignored. Copy `anim.config.local.json.example` to start. Unknown keys are
  dropped by schema validation.
- `COMFYUI_URL` env var — overrides the ComfyUI base URL for the doctor check
  and the imagegen adapter (default `http://127.0.0.1:8188`).

## `doctor-checks/` — system preflight probes

`systemChecks(config, rootDir): Promise<Check[]>` is the superset of the probes
`anim doctor` runs before any adapter's own checks (ARCHITECTURE §12). It covers:

- **Hard** (fail → `doctor` exits non-zero): node ≥ 20, `ffmpeg` + `ffprobe`
  present, the four audio filters the audio graph needs (`sidechaincompress`,
  `loudnorm`, `adelay`, `amix`), free memory vs the ~18 GB image-gen / ~6 GB
  render budgets, free disk ≥ 20 GB, `uv` present, `vendor/rhubarb` present,
  corpus path exists.
- **Warn-only** (always `ok: true`, remedy folded into `detail`): ComfyUI
  reachable at the configured URL, headless Chromium for Remotion.

Run it standalone (no adapter registry) for a fast check:

```sh
npx tsx tools/doctor-checks/index.ts
```

**Wiring:** the CLI's `anim doctor` calls `systemChecks` from
`packages/cli/src/runtime/systemChecks.ts` (a minimal placeholder shipped by the
scaffold). To adopt this superset, replace that file's body with a re-export:

```ts
export { systemChecks } from "../../../../tools/doctor-checks/index";
```

(That file is outside workstream E's paths, so the integration agent makes this
one-line change — see the repo's OPEN ISSUES.)

## `stage-lock/` — the imagegen ⇆ render mutex

On 24 GB, image gen (~18 GB) and render (~6 GB) must never run at once
(ARCHITECTURE §11). `stage-lock` is a cross-process file lock keyed by a single
`heavy-gpu` class, stored at `.anim/locks/heavy-gpu.lock`:

```ts
import { withStageLock } from "../../tools/stage-lock/index";

await withStageLock(rootDir, "imagegen", async () => { /* run ComfyUI batch */ });
await withStageLock(rootDir, "render",   async () => { /* run Remotion render */ });
```

Acquiring for either stage blocks the other. A lock whose holder process is dead
is detected and reclaimed. `withStageLock` releases even on throw. The `char gen`
stage (workstream B) and the `render` stage (workstream C) should wrap their
heavy work in this — see OPEN ISSUES for that wiring.

Tests: `node --import tsx --test tools/stage-lock/lock.test.ts`.

## CI

`.github/workflows/smoke.yml` runs on push/PR: `npm ci`, typecheck, core unit
tests, then the canonical `npm run smoke` flow, which creates an isolated
episode.yml under `/tmp` and validates `check` plus `make`.
No models, no render — those are local-only (`npm run smoke`).
