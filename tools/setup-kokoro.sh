#!/usr/bin/env bash
# Prepare the Kokoro TTS sidecar: sync the uv venv and warm the model cache.
#
#   tools/setup-kokoro.sh
#
# Kokoro is Apache-2.0 (en + hi) and runs CPU-fine on Apple Silicon. The model
# weights are pulled from Hugging Face on first pipeline construction and cached
# under ~/.cache/huggingface. `anim doctor` reports readiness afterwards.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY_DIR="$ROOT/py"

if ! command -v uv >/dev/null 2>&1; then
  echo "setup-kokoro: uv not found. Install it first:" >&2
  echo "  curl -LsSf https://astral.sh/uv/install.sh | sh" >&2
  exit 1
fi

# espeak-ng is Kokoro/misaki's phoneme fallback for some tokens.
if ! command -v espeak-ng >/dev/null 2>&1; then
  echo "setup-kokoro: note — espeak-ng not found; install for best phonemization:" >&2
  echo "  brew install espeak-ng   (macOS)   |   apt-get install espeak-ng   (Linux)" >&2
fi

echo "setup-kokoro: syncing uv project at $PY_DIR"
uv sync --project "$PY_DIR"

echo "setup-kokoro: warming the model cache (first run downloads weights)"
echo '{"op":"health"}' | uv run --project "$PY_DIR" python "$PY_DIR/tts_kokoro.py"
echo
echo "setup-kokoro: done. Verify with  anim doctor"
