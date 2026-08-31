#!/usr/bin/env python3
"""Kokoro TTS sidecar — a thin JSON-in / JSON-out CLI.

The Node adapter (`packages/adapters/tts-kokoro`) hands us a JSON request on
stdin and reads a JSON result on stdout; nothing else is printed to stdout so
the protocol stays clean (diagnostics go to stderr). Kokoro is Apache-2.0 and
runs CPU-fine on Apple Silicon (DECISIONS.md).

Requests:
  {"op": "synthesize", "text": "...", "voice": "af_heart",
   "lang": "en"|"hi", "out_path": "/abs/out.wav"}
      -> {"path": "...", "durationSec": <float>}
  {"op": "list_voices", "lang": "en"}       -> {"voices": [...]}
  {"op": "health"}                          -> {"ok": bool, "detail": "..."}

Determinism: Kokoro synthesis is deterministic for a fixed (text, voice, model)
— no seeds needed. We never touch the wall clock here.
"""
import json
import sys

# Protocol hygiene: kokoro/huggingface print diagnostics (e.g. "WARNING:
# Defaulting repo_id to hexgrad/Kokoro-82M") straight to stdout, which corrupts
# the JSON-only protocol the Node adapter parses. Route all incidental stdout
# to stderr; only the final JSON result is written to the real stdout.
_REAL_STDOUT = sys.stdout
sys.stdout = sys.stderr

SAMPLE_RATE = 24000  # Kokoro native output rate

# lang code -> Kokoro KPipeline lang_code (a=American English, h=Hindi)
LANG_CODE = {"en": "a", "hi": "h"}

# A small curated voice list per language (the full set ships with the model).
VOICES = {
    "en": [
        {"id": "af_heart", "name": "Heart", "lang": "en", "gender": "female"},
        {"id": "af_bella", "name": "Bella", "lang": "en", "gender": "female"},
        {"id": "am_michael", "name": "Michael", "lang": "en", "gender": "male"},
        {"id": "am_puck", "name": "Puck", "lang": "en", "gender": "male"},
    ],
    "hi": [
        {"id": "hf_alpha", "name": "Alpha", "lang": "hi", "gender": "female"},
        {"id": "hf_beta", "name": "Beta", "lang": "hi", "gender": "female"},
        {"id": "hm_omega", "name": "Omega", "lang": "hi", "gender": "male"},
        {"id": "hm_psi", "name": "Psi", "lang": "hi", "gender": "male"},
    ],
}


def fail(msg: str) -> None:
    """Emit a JSON error result and exit non-zero."""
    json.dump({"ok": False, "error": msg}, _REAL_STDOUT)
    _REAL_STDOUT.flush()
    sys.exit(1)


def op_health() -> dict:
    try:
        import kokoro  # noqa: F401
    except Exception as e:  # pragma: no cover - environment dependent
        return {"ok": False, "detail": f"kokoro import failed: {e}"}
    try:
        # Constructing the pipeline pulls the model weights from cache; if they
        # are absent Kokoro downloads them, so a successful build means ready.
        from kokoro import KPipeline

        KPipeline(lang_code="a")
    except Exception as e:  # pragma: no cover - environment dependent
        return {"ok": False, "detail": f"model not ready: {e}"}
    return {"ok": True, "detail": "kokoro import + English model ready"}


def op_list_voices(req: dict) -> dict:
    lang = req.get("lang", "en")
    return {"voices": VOICES.get(lang, [])}


def op_synthesize(req: dict) -> dict:
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    text = req.get("text", "").strip()
    if not text:
        fail("synthesize: empty text")
    voice = req.get("voice") or "af_heart"
    lang = req.get("lang", "en")
    out_path = req.get("out_path")
    if not out_path:
        fail("synthesize: missing out_path")

    lang_code = LANG_CODE.get(lang)
    if lang_code is None:
        fail(f"synthesize: unsupported lang '{lang}' (know: {', '.join(LANG_CODE)})")

    pipeline = KPipeline(lang_code=lang_code)
    chunks = []
    for _graphemes, _phonemes, audio in pipeline(text, voice=voice):
        chunks.append(np.asarray(audio, dtype="float32"))
    if not chunks:
        fail("synthesize: Kokoro produced no audio")
    samples = np.concatenate(chunks)
    sf.write(out_path, samples, SAMPLE_RATE, subtype="PCM_16")
    return {"path": out_path, "durationSec": round(len(samples) / SAMPLE_RATE, 3)}


def main() -> None:
    try:
        req = json.load(sys.stdin)
    except Exception as e:
        fail(f"invalid JSON request on stdin: {e}")

    op = req.get("op")
    try:
        if op == "health":
            result = op_health()
        elif op == "list_voices":
            result = op_list_voices(req)
        elif op == "synthesize":
            result = op_synthesize(req)
        else:
            fail(f"unknown op '{op}'")
            return
    except SystemExit:
        raise
    except Exception as e:
        fail(f"{op} failed: {e}")
        return

    json.dump(result, _REAL_STDOUT)
    _REAL_STDOUT.flush()


if __name__ == "__main__":
    main()
