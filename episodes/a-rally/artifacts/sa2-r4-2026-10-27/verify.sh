#!/usr/bin/env bash
# Recompute this rendition's identity and cut its stills. Run from anywhere:
#   bash episodes/a-rally/artifacts/sa2-r4-2026-10-27/verify.sh
# Exit 0 only if the episode, the video, the frame count, the duration and the
# size all match bake-identity.json. The stills land in stills/ (regenerated,
# not tracked).
set -uo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
cd "$repo" || exit 2

want() { node -e "const j=require('$here/bake-identity.json');process.stdout.write(String(j['$1']))"; }
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then printf 'OK   %-12s %s\n' "$1" "$3"; else printf 'FAIL %-12s want %s got %s\n' "$1" "$2" "$3"; fail=1; fi
}

check episode.yml "$(want episodeSha256)" "$(sha256sum episodes/a-rally/episode.yml | cut -d' ' -f1)"
check episode.mp4 "$(want videoSha256)" "$(sha256sum "$here/episode.mp4" | cut -d' ' -f1)"
check frames "$(want frameCount)" "$(ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=nb_read_frames -of default=nw=1:nk=1 "$here/episode.mp4")"
check duration "$(printf '%.2f' "$(want durationSec)")" "$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$here/episode.mp4" | awk '{printf "%.2f", $1}')"
check size "$(want width)x$(want height)" "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "$here/episode.mp4" | sed 's/x$//')"

mkdir -p "$here/stills"
for row in $(node -e "const j=require('$here/bake-identity.json');for(const s of j.stills)console.log(s.name+'@'+s.sec)"); do
  name=${row%@*}; sec=${row#*@}
  ffmpeg -nostdin -v error -y -ss "$sec" -i "$here/episode.mp4" -frames:v 1 "$here/stills/$name" || fail=1
done
echo "stills: $(ls "$here/stills" | wc -l) cut into $here/stills"
exit $fail
