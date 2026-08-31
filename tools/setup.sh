#!/usr/bin/env bash
#
# One-shot dev setup for agentic-animation (workstream E, ARCHITECTURE §13).
#
# Verifies the core toolchain, installs uv (the Python sidecar manager) if
# missing, and hands off to the per-capability fetch/setup scripts owned by
# other workstreams. It ORCHESTRATES — it does not duplicate their work — and
# tolerates a sibling script not existing yet (warns, keeps going).
#
# It never installs the big models itself; those are large and opt-in. Read
# tools/README.md to choose what to download, then run the named script.
#
# Usage:
#   tools/setup.sh            # verify toolchain + hand off (prompts before uv install)
#   tools/setup.sh --yes      # non-interactive: auto-approve the uv install
#   tools/setup.sh --help
set -euo pipefail

ASSUME_YES=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) ASSUME_YES=1 ;;
    --help|-h)
      # Print the leading comment header (skip the shebang, stop at first code line).
      awk 'NR==1{next} /^#/{sub(/^# ?/,""); print; next} {exit}' "$0"
      exit 0
      ;;
    *) echo "setup: unknown flag '$arg' (see --help)" >&2; exit 2 ;;
  esac
done

# Repo root = parent of this script's dir, regardless of CWD.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

ok()   { printf '  [ ok ] %s\n' "$1"; }
warn() { printf '  [warn] %s\n' "$1"; }
fail() { printf '  [FAIL] %s\n' "$1" >&2; }

FAILED=0

echo "agentic-animation — dev setup"
echo
echo "toolchain"

# --- Node -------------------------------------------------------------------
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  if [ "$NODE_MAJOR" -ge 20 ]; then
    ok "node $(node -v)"
  else
    fail "node $(node -v) is too old — need >= 20. Install via 'brew install node'."
    FAILED=1
  fi
else
  fail "node not found — install Node 20+ ('brew install node')."
  FAILED=1
fi

# --- ffmpeg / ffprobe -------------------------------------------------------
for bin in ffmpeg ffprobe; do
  if command -v "$bin" >/dev/null 2>&1; then
    ok "$($bin -version 2>/dev/null | head -1)"
  else
    fail "$bin not found — install ffmpeg 8.x ('brew install ffmpeg')."
    FAILED=1
  fi
done

if [ "$FAILED" -ne 0 ]; then
  echo
  echo "setup: core toolchain incomplete — fix the FAIL rows above and re-run." >&2
  exit 1
fi

# --- uv (Python sidecar manager) --------------------------------------------
echo
echo "python (uv)"
if command -v uv >/dev/null 2>&1; then
  ok "uv $(uv --version 2>/dev/null | awk '{print $2}')"
else
  DO_INSTALL=0
  if [ "$ASSUME_YES" -eq 1 ]; then
    DO_INSTALL=1
  else
    printf '  uv is not installed. Install it now via the official script? [y/N] '
    read -r reply || reply=""
    case "$reply" in y|Y|yes|YES) DO_INSTALL=1 ;; esac
  fi
  if [ "$DO_INSTALL" -eq 1 ]; then
    echo "  installing uv (https://astral.sh/uv/install.sh) ..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # uv installs to ~/.local/bin or ~/.cargo/bin — surface it for this shell.
    export PATH="$HOME/.local/bin:$HOME/.cargo/bin:$PATH"
    if command -v uv >/dev/null 2>&1; then
      ok "uv $(uv --version 2>/dev/null | awk '{print $2}') installed"
    else
      warn "uv installed but not on PATH yet — open a new shell or add ~/.local/bin to PATH."
    fi
  else
    warn "skipped uv install — Kokoro TTS and the Python part-cutter will not run until 'uv' is available."
  fi
fi

# --- Hand off to per-capability scripts (owned by other workstreams) --------
# Each is optional at this stage; warn if a sibling has not landed it yet.
echo
echo "capabilities (run the ones you need — see tools/README.md for sizes)"

handoff() {
  local script="$1" ; local what="$2"
  if [ -x "$ROOT/$script" ]; then
    ok "$script present — run it to $what"
  elif [ -f "$ROOT/$script" ]; then
    warn "$script present but not executable — 'chmod +x $script', then run it to $what"
  else
    warn "$script not present yet (owning workstream has not landed it) — will $what"
  fi
}

handoff "tools/fetch-rhubarb.sh"  "fetch the Rhubarb lip-sync binary into vendor/ (workstream A)"
handoff "tools/setup-kokoro.sh"   "create the uv-managed Kokoro TTS env + weights (workstream A)"
handoff "tools/setup-comfyui.sh"  "install ComfyUI + Qwen-Image-Edit GGUF for image gen (workstream B)"

echo
echo "next:"
echo "  npm install                 # once, at the repo root"
echo "  npx remotion browser ensure # one-time headless Chromium for render/stills"
echo "  npm run anim -- doctor       # verify the whole environment"
echo
echo "setup: toolchain ready."
