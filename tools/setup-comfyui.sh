#!/usr/bin/env bash
# tools/setup-comfyui.sh — install ComfyUI + Qwen-Image-Edit (GGUF) for the
# image-gen adapter, on Apple Silicon (MPS). Manual git install (NOT the
# Desktop app) so the HTTP API and model paths are ours to control.
#
# Idempotent-ish: re-running skips clones/downloads that already exist. This
# script is NOT run by the build swarm — `anim doctor` reports what is missing
# and points here.
set -euo pipefail

# --- config (override via env) ---------------------------------------------
COMFY_DIR="${COMFY_DIR:-$HOME/ComfyUI}"
COMFY_PORT="${COMFY_PORT:-8188}"
# GGUF quant to fetch. `char gen` injects COMFYUI_MODEL (falling back to the
# house-style default) verbatim into UnetLoaderGGUF, so the file downloaded here
# MUST match that name exactly (ComfyUI validates node string inputs by
# case-sensitive membership in the model folder listing). Keep the two in step
# by having the download default to the same COMFYUI_MODEL the CLI reads.
QWEN_UNET_REPO="${QWEN_UNET_REPO:-QuantStack/Qwen-Image-Edit-GGUF}"
# QWEN_UNET_FILE is the on-disk / injected name (must equal COMFYUI_MODEL, hyphen
# spelling — see charDefaults.ts and the workflow UnetLoaderGGUF defaults).
QWEN_UNET_FILE="${QWEN_UNET_FILE:-${COMFYUI_MODEL:-Qwen-Image-Edit-Q4_K_M.gguf}}"
# The QuantStack repo spells the file with underscores (Qwen_Image_Edit-…); fetch
# that remote name but store it locally as QWEN_UNET_FILE so the injected name matches.
QWEN_UNET_REMOTE="${QWEN_UNET_REMOTE:-$(printf '%s' "$QWEN_UNET_FILE" | sed 's/^Qwen-Image-Edit/Qwen_Image_Edit/')}"
# Text encoder + VAE required by ComfyUI's Qwen-Image graphs.
TEXT_ENCODER_REPO="${TEXT_ENCODER_REPO:-Comfy-Org/Qwen-Image_ComfyUI}"
TEXT_ENCODER_FILE="${TEXT_ENCODER_FILE:-split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors}"
VAE_REPO="${VAE_REPO:-Comfy-Org/Qwen-Image_ComfyUI}"
VAE_FILE="${VAE_FILE:-split_files/vae/qwen_image_vae.safetensors}"

say() { printf '\n\033[1;36m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || { echo "missing required tool: $1"; exit 1; }; }

need git
need uv

# --- 1. clone ComfyUI ------------------------------------------------------
if [ ! -d "$COMFY_DIR/.git" ]; then
  say "Cloning ComfyUI into $COMFY_DIR"
  git clone https://github.com/comfyanonymous/ComfyUI "$COMFY_DIR"
else
  say "ComfyUI already present at $COMFY_DIR (skipping clone)"
fi

# --- 2. uv venv + torch (MPS) ---------------------------------------------
say "Creating uv venv + installing PyTorch (Metal/MPS) and ComfyUI deps"
cd "$COMFY_DIR"
# Guard venv creation for idempotency: uv refuses to overwrite an existing
# venv without --clear. The pip installs below run unconditionally (cache-fast)
# so deps are ensured even when the venv was already present.
if [ ! -d "$COMFY_DIR/.venv" ]; then
  uv venv --python 3.12 .venv
else
  say "uv venv already present at $COMFY_DIR/.venv (skipping create)"
fi
# On macOS the default torch wheels include MPS support.
uv pip install --python .venv torch torchvision torchaudio
uv pip install --python .venv -r requirements.txt

# --- 3. ComfyUI-GGUF custom node ------------------------------------------
GGUF_NODE="$COMFY_DIR/custom_nodes/ComfyUI-GGUF"
if [ ! -d "$GGUF_NODE/.git" ]; then
  say "Installing ComfyUI-GGUF custom node"
  git clone https://github.com/city96/ComfyUI-GGUF "$GGUF_NODE"
  uv pip install --python .venv -r "$GGUF_NODE/requirements.txt"
else
  say "ComfyUI-GGUF already installed (skipping)"
fi

# --- 4. models -------------------------------------------------------------
# The `hf` CLI ships with `huggingface_hub` (the legacy `huggingface-cli` is
# deprecated and no-ops in huggingface_hub >= 1.x); install into the venv.
uv pip install --python .venv "huggingface_hub[cli]"
HF="$COMFY_DIR/.venv/bin/hf"

dl() { # repo file dest-subdir [local-name]
  local repo="$1" file="$2" sub="$3"
  local local_name="${4:-$(basename "$file")}"
  local dest="$COMFY_DIR/models/$sub"
  mkdir -p "$dest"
  if [ -f "$dest/$local_name" ]; then
    say "already have $local_name in models/$sub"
  else
    say "Downloading $file → models/$sub/$local_name"
    # `hf download` no longer accepts --local-dir-use-symlinks (removed in 1.x);
    # it copies real files into --local-dir by default.
    "$HF" download "$repo" "$file" --local-dir "$dest"
    # Normalize to the on-disk name ComfyUI/char-gen expect: flatten split_files/…
    # subpaths and reconcile repo vs. injected filename spelling.
    if [ "$file" != "$local_name" ]; then
      mv "$dest/$file" "$dest/$local_name" 2>/dev/null || true
    fi
  fi
}

dl "$QWEN_UNET_REPO"     "$QWEN_UNET_REMOTE"  "unet"           "$QWEN_UNET_FILE"
dl "$TEXT_ENCODER_REPO"  "$TEXT_ENCODER_FILE" "text_encoders"
dl "$VAE_REPO"           "$VAE_FILE"          "vae"

# --- 5. memory guidance ----------------------------------------------------
cat <<EOF

$(say "Done.")
Start ComfyUI (24 GB budget, ARCHITECTURE §11):

  cd "$COMFY_DIR"
  PYTORCH_ENABLE_MPS_FALLBACK=1 .venv/bin/python main.py \\
    --listen 127.0.0.1 --port $COMFY_PORT --bf16-unet --fp32-vae

Notes:
  * On Apple Silicon (MPS), --force-fp16 makes the Qwen-Image (FLUX-arch) UNet
    overflow to NaN and the VAE decode to all-black PNGs (verified 2026-07).
    Use --bf16-unet (fp32 exponent range, no overflow) + --fp32-vae instead;
    keeps Qwen-Image-Edit Q4 (~13 GB) + overhead within the ~18 GB budget.
    PYTORCH_ENABLE_MPS_FALLBACK=1 lets any unimplemented MPS op fall back to CPU.
  * Image gen and Remotion render must NOT run at once (the CLI takes a lock).
  * Point the adapter at a non-default host with:  export COMFYUI_URL=http://127.0.0.1:$COMFY_PORT
  * Choose a different GGUF quant by exporting COMFYUI_MODEL before BOTH this
    script and \`anim char gen\` (the download and the gen inject the same name):
      export COMFYUI_MODEL=Qwen-Image-Edit-Q5_K_M.gguf
  * Verify with:  npm run anim -- doctor
EOF
