# Tool & Licensing Decisions

## Episode DSL

The repository has one source language: English instance IDs, semantic staging,
direct dialogue, and plugin-provided typed terminal calls inside braces.
Legacy `say/run/#cue/at/layout` authoring is removed without compatibility mode.
All timed procedures block by default; generic scheduling supports nonblocking,
explicit duration, and normalized begin/end spans. Domain behavior belongs to category plugin procedure definitions rather than
compiler action-name switches.

> Licensing choices require re-verification before new use for a monetized
> channel. Current decisions belong here; provenance/history belongs in tickets.
> Stack candidates are not proof of installed capability or execution authority.

## Art-production upgrade

The user approved learning Huashu's useful art-production mechanisms while
preserving our asset management, canonical YAML pipeline and engine functions,
with visible comparisons at each milestone. Scope and acceptance are owned by
[ART_PRODUCTION_UPGRADE.md](ART_PRODUCTION_UPGRADE.md); this does not replace
licensing rules, authorize generative video, or mandate a model/provider switch.
Current milestone authority and progress are owned by
[ART_CHARACTER_M2](ART_CHARACTER_M2.md), not the initial M0 request.
Original vector drafts do not require the image-generation stack below.

## Chosen stack

| Capability | Choice | License / cost | Why | Runner-up |
|---|---|---|---|---|
| Render engine | **Remotion 4.0.x** | Free ≤ 3-person for-profit; re-verify if team grows. Don't jump to 5.0 blindly (telemetry changes) | React → deterministic MP4, official agent skills (`npx skills add remotion-dev/skills`), audio + Rive/Lottie support | Revideo (MIT) — Motion Canvas itself is stale/abandoned |
| Character image gen | **ComfyUI + Qwen-Image-Edit (GGUF Q4_K_M ≈ 13 GB)** | ComfyUI GPL-3 (tool, fine); Qwen-Image-Edit **Apache 2.0** — unambiguous commercial | Best license-clean identity-locked editing; fits 24 GB MPS | FLUX.1 Kontext dev — quality-competitive but model license is non-commercial (outputs arguably fine; **gray zone** — use only with a BFL paid license) |
| Consistency helpers | SDXL + IPAdapter FaceID v2 + ControlNet | Permissive | No-training identity lock at 80–95%; pose control for part sheets | — |
| Part separation | **Generate parts as separate images + `rembg` + manual pivot editor** | rembg MIT | Primary reason is architectural, not hardware: segmentation yields visible-region masks, but puppet parts need *complete* art that overlaps at joints (shoulder must exist under the arm). Hardware note: SAM3 is CUDA-bound and SAM2 has open MPS issues (verified 2026-07), but **SAM1/MobileSAM run fine on MPS, and SAM2 works CPU-only** — viable for batch use | SAM1/MobileSAM mask-guided cutting + inpaint of occluded regions is a candidate when only a single hero image exists; no milestone assignment |
| Rig format | **Canonical declared skeleton; optional native artwork data** ([SCHEMAS](SCHEMAS.md)) | Ours | Shared geometry and existing compiler/Remotion motor; alternate `puppet.json` path is not canonical M2 acceptance | Rive/Blender remain candidates requiring capability, cost and authority review |
| Lip-sync | **Rhubarb 1.14.0** | MIT | CLI, JSON out, 9 visemes; always pass `-d` dialog text | — |
| TTS (en + hi) | **Kokoro** | **Apache 2.0**, 82 M params, CPU-friendly, Hindi + English, top TTS-Arena ranking | Cleanest license + quality + light | Chatterbox Multilingual v3 (MIT, voice cloning, has Hindi) as secondary. **Ruled out:** F5-TTS (CC-BY-NC — no monetization), MeloTTS (no Hindi), Piper (maintained fork went GPL-3, license discontinuity trap), Coqui XTTS (murky) |
| Music | **Port of the in-house raga synthesis** (Karplus-Strong / additive, seeded) | Ours | Proven in 5 shipped films, zero licensing surface | Any CC0 library later, behind the adapter |
| Assembly/mux | ffmpeg (verify local version/build before use) | LGPL/GPL build | Standard; salvaged filter graphs | — |
| Corpus | Optional `the-Hindu-timeline` read-only corpus adapter | Ours | Its documented adapter data contract; enabled only through an explicit path such as `ANIM_CORPUS_ROOT` | — |

## Hard rules

1. **No generative video.** Stills only, pre-production only.
2. **Model/asset license recorded per artifact** — every `manifest.json` in
   `library/` names the generating model + its license at generation time.
3. **No FLUX-family models in the default pipeline** until/unless a BFL
   commercial license is purchased; config guards this.
4. **TTS voices**: only Apache/MIT-licensed model output ships in monetized
   video. `say`/espeak are dev-smoke-only.
5. **Remotion**: pinned to 4.0.x; review license + telemetry before any 5.x bump.

## Environment capability boundary

Do not infer this machine's hardware, installed services, voices or performance
from stack choices. Inspect local configuration before execution; exact capture
environment belongs in evidence receipts ([M0](ART_BASELINE_M0.md)). Current M2
capability limits belong in [M2](ART_CHARACTER_M2.md). Image generation and render
must not run concurrently. No provider/model change is authorized by this table.
