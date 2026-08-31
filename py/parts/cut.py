#!/usr/bin/env python3
"""rembg part cutter — JSON in (stdin), JSON out (stdout).

Reads a batch of generated part/mouth images, removes the flat chroma
background (rembg, CPU — fine on Apple Silicon), trims to the tight alpha
bounding box, and writes a clean RGBA PNG per item. The `anim char cut` stage
drives this; it falls back to a no-trim Node copier when this script or its
deps are unavailable, so the character pipeline still runs offline.

Input  (stdin JSON):
  {"removeBg": true,
   "items": [{"id": "torso", "in": "/abs/raw.png", "out": "/abs/trimmed.png"}, ...]}

Output (stdout JSON):
  {"items": [{"id": "torso", "out": "/abs/trimmed.png",
              "width": W, "height": H, "bbox": [x, y, w, h]}, ...]}

Deps (managed by uv — see requirements.txt): pillow, rembg. rembg is optional:
without it (or with removeBg=false) the script trims existing alpha only.
"""

import json
import os
import sys


def _fail(msg: str) -> "None":
    sys.stderr.write(f"cut.py: {msg}\n")
    sys.exit(2)


def main() -> None:
    try:
        from PIL import Image
    except Exception as exc:  # noqa: BLE001 — surfaced to the Node fallback
        _fail(f"Pillow not available ({exc}). Install with: uv pip install -r py/parts/requirements.txt")

    try:
        req = json.load(sys.stdin)
    except Exception as exc:  # noqa: BLE001
        _fail(f"invalid input JSON: {exc}")

    remove_bg = bool(req.get("removeBg", True))
    items = req.get("items", [])

    remover = None
    if remove_bg:
        try:
            from rembg import remove, new_session

            remover = (remove, new_session("isnet-general-use"))
        except Exception:  # noqa: BLE001 — degrade to alpha-trim only
            remover = None

    out_items = []
    for it in items:
        src, dst = it["in"], it["out"]
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        img = Image.open(src).convert("RGBA")

        if remover is not None:
            remove, session = remover
            img = remove(img, session=session).convert("RGBA")

        bbox = img.getbbox()  # tight box of non-zero (alpha) region
        if bbox is None:
            # Fully transparent — keep a 1x1 to stay schema-valid.
            trimmed = Image.new("RGBA", (1, 1), (0, 0, 0, 0))
            x0, y0, x1, y1 = 0, 0, 1, 1
        else:
            trimmed = img.crop(bbox)
            x0, y0, x1, y1 = bbox

        trimmed.save(dst, "PNG")
        out_items.append(
            {
                "id": it["id"],
                "out": dst,
                "width": trimmed.width,
                "height": trimmed.height,
                "bbox": [x0, y0, x1 - x0, y1 - y0],
            }
        )

    json.dump({"items": out_items}, sys.stdout)


if __name__ == "__main__":
    main()
