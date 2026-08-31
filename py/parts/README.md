# py/parts — rembg part cutter

Thin, JSON-in/JSON-out CLI used by `anim char cut`. Removes the flat chroma
background from generated part/mouth images, trims to the tight alpha box, and
writes clean RGBA PNGs.

## Contract

```
stdin:  {"removeBg": true, "items": [{"id","in","out"}, ...]}
stdout: {"items": [{"id","out","width","height","bbox":[x,y,w,h]}, ...]}
```

Exit code 2 (with a message on stderr) signals the caller to use its Node
passthrough fallback — so the character pipeline still runs when Python or
`rembg` is not installed. In that fallback there is no background removal or
trim; placeholder art from `anim char gen --dry-run` already carries alpha.

## Setup (uv-managed)

```
cd py && uv venv && uv pip install -r parts/requirements.txt
# then point the cutter at that interpreter:
export ANIM_PYTHON="$(pwd)/.venv/bin/python"
```

`anim char cut <id>` tries `$ANIM_PYTHON`, then `python3`, then `python`, and
falls back to the Node copier on any failure. Force the offline path with
`anim char cut <id> --engine node`.
