#!/usr/bin/env bash
# Fetch Rhubarb Lip Sync 1.14.0 into vendor/rhubarb/ (gitignored).
#
#   tools/fetch-rhubarb.sh
#
# The lipsync adapter resolves the binary at vendor/rhubarb/rhubarb (or
# $RHUBARB_PATH). Apple Silicon note: the official macOS release is an x86_64
# build — it runs under Rosetta 2 (install with
# `softwareupdate --install-rosetta --agree-to-license` if it fails to launch).
# `anim doctor` detects and reports the Rosetta case.
set -euo pipefail

VERSION="1.14.0"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/vendor/rhubarb"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

case "$(uname -s)" in
  Darwin) ASSET="Rhubarb-Lip-Sync-${VERSION}-macOS.zip" ;;
  Linux)  ASSET="Rhubarb-Lip-Sync-${VERSION}-Linux.zip" ;;
  *) echo "fetch-rhubarb: unsupported OS $(uname -s). Download manually from the release page." >&2; exit 1 ;;
esac

URL="https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v${VERSION}/${ASSET}"
echo "fetch-rhubarb: downloading $ASSET"
curl -fL --retry 3 -o "$TMP/rhubarb.zip" "$URL"

echo "fetch-rhubarb: extracting"
unzip -q "$TMP/rhubarb.zip" -d "$TMP/unzipped"

# The zip extracts to a top-level "Rhubarb-Lip-Sync-<ver>-<os>/" dir containing
# the `rhubarb` binary and its `res/` resource dir (needed at runtime).
SRC="$(find "$TMP/unzipped" -maxdepth 1 -type d -name 'Rhubarb-Lip-Sync-*' | head -n1)"
if [ -z "$SRC" ]; then
  # Some archives extract flat.
  SRC="$TMP/unzipped"
fi
if [ ! -f "$SRC/rhubarb" ]; then
  echo "fetch-rhubarb: expected a 'rhubarb' binary in the archive; layout was:" >&2
  ls -R "$TMP/unzipped" >&2
  exit 1
fi

rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"
chmod +x "$DEST/rhubarb"

echo "fetch-rhubarb: installed $("$DEST/rhubarb" --version 2>/dev/null || echo "rhubarb ${VERSION}") -> $DEST"
echo "fetch-rhubarb: verify with  anim doctor"
