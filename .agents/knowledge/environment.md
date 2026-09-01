# Production environment lessons

Edge TTS is the configured production adapter. Run `anim doctor` before
synthesis and preserve completed cache entries while retrying transient
provider failures. Global voice speed is configured at 1.2; CLI and inline
overrides follow the canonical DSL precedence.

Remotion consumes compiled performance IR. Generated audio, video, manifests,
screenshots, and caches are disposable evidence; use `/tmp` and verify final
media with `ffprobe` and loudness checks.
