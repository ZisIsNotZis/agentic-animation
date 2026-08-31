# Tool & Licensing Decisions

## 2026-08-31 — Episode DSL hard cutover

The repository has one source language: English instance IDs, semantic staging,
direct dialogue, and registry-generated typed terminal calls inside braces.
Legacy `say/run/#cue/at/layout` authoring is removed without compatibility mode.
All timed procedures block by default; generic scheduling supports nonblocking,
explicit duration, and normalized begin/end spans. Domain behavior belongs to
versioned procedure assets rather than compiler action-name switches.

> Verified by web research on 2026-07-08. Every choice here must stay clean for
> a monetized YouTube channel. Re-verify a row before relying on it in a new
> way; append changes, don't rewrite history.

## Chosen stack

| Capability | Choice | License / cost | Why | Runner-up |
|---|---|---|---|---|
| Render engine | **Remotion 4.0.x** | Free ≤ 3-person for-profit; re-verify if team grows. Don't jump to 5.0 blindly (telemetry changes) | React → deterministic MP4, official agent skills (`npx skills add remotion-dev/skills`), audio + Rive/Lottie support | Revideo (MIT) — Motion Canvas itself is stale/abandoned |
| Character image gen | **ComfyUI + Qwen-Image-Edit (GGUF Q4_K_M ≈ 13 GB)** | ComfyUI GPL-3 (tool, fine); Qwen-Image-Edit **Apache 2.0** — unambiguous commercial | Best license-clean identity-locked editing; fits 24 GB MPS | FLUX.1 Kontext dev — quality-competitive but model license is non-commercial (outputs arguably fine; **gray zone** — use only with a BFL paid license) |
| Consistency helpers | SDXL + IPAdapter FaceID v2 + ControlNet | Permissive | No-training identity lock at 80–95%; pose control for part sheets | — |
| Part separation | **Generate parts as separate images + `rembg` + manual pivot editor** | rembg MIT | Primary reason is architectural, not hardware: segmentation yields visible-region masks, but puppet parts need *complete* art that overlaps at joints (shoulder must exist under the arm). Hardware note: SAM3 is CUDA-bound and SAM2 has open MPS issues (verified 2026-07), but **SAM1/MobileSAM run fine on MPS, and SAM2 works CPU-only** — viable for batch use | **Planned M1 assist adapter**: SAM1/MobileSAM mask-guided cutting + inpaint of occluded regions, for when only a single hero image exists |
| Rig format | **Native layered-puppet (`puppet.json`) rendered by our Remotion runtime** | Ours | Fully scriptable, agent-authorable, no GUI dependency, no per-seat cost | Rive (needs $9/mo Cadet to export `.riv`; GUI-authored — revisit at M2 if deformation quality demands it). DragonBones is dead. Blender Grease Pencil v3 = escalation path for complex choreography (smoke-test headless Metal render first) |
| Lip-sync | **Rhubarb 1.14.0** | MIT | CLI, JSON out, 9 visemes; always pass `-d` dialog text | — |
| TTS (en + hi) | **Kokoro** | **Apache 2.0**, 82 M params, CPU-friendly, Hindi + English, top TTS-Arena ranking | Cleanest license + quality + light | Chatterbox Multilingual v3 (MIT, voice cloning, has Hindi) as secondary. **Ruled out:** F5-TTS (CC-BY-NC — no monetization), MeloTTS (no Hindi), Piper (maintained fork went GPL-3, license discontinuity trap), Coqui XTTS (murky) |
| Music | **Port of the in-house raga synthesis** (Karplus-Strong / additive, seeded) | Ours | Proven in 5 shipped films, zero licensing surface | Any CC0 library later, behind the adapter |
| Assembly/mux | ffmpeg 8.x (installed) | LGPL/GPL build | Standard; salvaged filter graphs | — |
| Corpus | Optional `the-Hindu-timeline` read-only corpus adapter | Ours | Its documented adapter data contract; enabled only through an explicit path such as `ANIM_CORPUS_ROOT` | — |

## Hard rules

1. **No generative video.** Stills only, pre-production only.
2. **Model/asset license recorded per artifact** — every `meta.json` in
   `library/` names the generating model + its license at generation time.
3. **No FLUX-family models in the default pipeline** until/unless a BFL
   commercial license is purchased; config guards this.
4. **TTS voices**: only Apache/MIT-licensed model output ships in monetized
   video. `say`/espeak are dev-smoke-only.
5. **Remotion**: pinned to 4.0.x; review license + telemetry before any 5.x bump.

## Environment facts (this machine, 2026-07-08)

Apple M5 Pro, 24 GB unified. Node v26.3.1, ffmpeg 8.1.2 present. System Python
3.9 (unused — `uv` manages project Python). ComfyUI installed at `~/ComfyUI`
(0.27.0, torch MPS, ~22 GB models) via `tools/setup-comfyui.sh` (manual git
install, not Desktop app, so the HTTP API and model paths are ours to
control). Rhubarb fetched to `vendor/` by `tools/fetch-rhubarb.sh`. Memory
rule: image gen and render never run concurrently (CLI lock).

**MPS precision (verified 2026-07-08, do not regress):** `--force-fp16` NaNs
the Qwen-Image-Edit unet on MPS → all-black outputs. Working server config:
`PYTORCH_ENABLE_MPS_FALLBACK=1` + `--bf16-unet --fp32-vae`. Timings on this
machine: 512×512 smoke ≈ 7 min; 1024×1536 @ 24 steps ≈ 28–54 min (swap-bound
at ~22 GB resident — close browsers during batches). Kokoro requires Python
3.12 (`py/.python-version`; spacy 3.8.14 has no 3.13+ wheel). Voices in use:
en `af_heart`, hi `hf_alpha`.
