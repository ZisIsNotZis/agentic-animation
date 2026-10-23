#!/usr/bin/env bash
# Recompute every field this rendition's identity claims and cut its stills.
# Exit 0 means the rendition is intact; a non-zero exit names the field that moved.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(git -C "$here" rev-parse --show-toplevel)"
ident="$here/bake-identity.json"
field() { python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$ident" "$1"; }

episode_sha=$(sha256sum "$root/$(field episode)" | cut -d' ' -f1)
[ "$episode_sha" = "$(field episodeSha256)" ] || { echo "episodeSha256 moved: $episode_sha"; exit 1; }

video_sha=$(sha256sum "$here/episode.mp4" | cut -d' ' -f1)
[ "$video_sha" = "$(field videoSha256)" ] || { echo "videoSha256 moved: $video_sha"; exit 1; }

frames=$(ffprobe -v error -count_frames -select_streams v:0 -show_entries stream=nb_read_frames -of default=noprint_wrappers=1:nokey=1 "$here/episode.mp4")
[ "$frames" = "$(field frameCount)" ] || { echo "frameCount moved: $frames"; exit 1; }

mkdir -p "$here/stills"
python3 - "$ident" <<'PY' | while IFS=$'\t' read -r name sec; do
import json,sys
for still in json.load(open(sys.argv[1]))["stills"]:
    print(f"{still['name']}\t{still['sec']}")
PY
  ffmpeg -nostdin -loglevel error -ss "$sec" -i "$here/episode.mp4" -frames:v 1 -y "$here/stills/$name"
done
echo "ok: episode $episode_sha, video $video_sha, $frames frames, stills cut"
