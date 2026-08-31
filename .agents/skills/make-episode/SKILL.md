---
name: make-episode
description: Produce a narrated, lip-synced, deterministic 2D animated episode (MP4) of a story from the the-Hindu-timeline corpus, using the anim toolkit. Use when asked to make/animate/film an episode of a story.
---

# make-episode

Turns "make an episode of `<story>`" into the end-to-end `anim` pipeline: ground
the story in the corpus, author `episode.json` + `script.json`, generate audio +
timeline, choreograph a storyboard, validate it, review stills until they are
actually good, then render and deliver. Read
[docs/PIPELINE.md](../../../docs/PIPELINE.md) (per-stage contract) and
[docs/SCHEMAS.md](../../../docs/SCHEMAS.md) (field notes) before step 3 — this
skill assumes them rather than re-deriving them. Character creation is a separate
gated pre-production flow; see [make-character](../make-character/SKILL.md). The
stills craft checklist is [qa-stills](../qa-stills/SKILL.md).

Commands are `anim <stage>` (in this repo, `npm run anim -- <stage>`). `<slug>`
is the episode directory name under `episodes/` (lowercase-kebab-case).

**On stub stages.** In M0 the scaffold implements `doctor`, `episode new`, and
`board validate`; `voice`, `lipsync`, `music`, `mix`, `assemble`, `stills`,
`golden`, `render` are registered with their final CLI surface but throw
`NotImplementedError` naming the owning workstream until that workstream lands
them. Run each stage; if it reports not-implemented, that stage's owner hasn't
shipped yet — report which stage blocked you rather than working around it. The
contract (inputs/outputs) in PIPELINE.md is stable regardless.

## Step 0 — Preflight

`anim doctor` first, always. Fix every FAIL row (hard failures) before
proceeding; adapters reporting "not ready" (missing model/binary) are warnings
you can defer until the stage that needs them. Confirm the corpus adapter is
green (`corpus:hindu-timeline: data files` / `parse`) — if not, the story can't
be grounded; check `paths.corpus` in `anim.config.json` (default
`../the-Hindu-timeline`) or export `ANIM_CORPUS_ROOT`.

## Step 1 — GROUND the story in the corpus (do not paraphrase from memory)

The corpus is the source of truth and every claim in it is cited; yours must be
too. Use the `hindu-timeline` corpus adapter (not ad-hoc file reads):

1. **Search.** Call the adapter's `search(query)` with the story/character names
   — try Sanskrit *and* common English spellings; search is diacritic-
   insensitive, so `krishna` finds `Kṛṣṇa`. You get ranked `CorpusHit`s
   (`{ref, title, snippet, citation, score}`): event hits join to their
   `detail_file`, file hits to their `path`. The `04-deep-dives/` file is almost
   always the best home for a fully-told story.
2. **Read.** Call `read(ref)` on the best 2–4 hits. Beyond the raw `text`, the
   parsed doc gives you `title`, the `breadcrumb`, `## Heading` **sections** with
   bullets already split into `{title, text, source, tags}`, the `## Sources`
   body, and the document-level `reliability` tags. Extract: the beat sequence,
   every named character + epithets, and — critically — any **variant** tellings.
3. **Carry the nuance.** The corpus tags material `[disputed] [folk tradition]
   [late text] [scholarly] [regional]` rather than flattening disagreement. A
   film script must not quietly present disputed or late-text material as settled
   fact — reflect uncertainty in the narration (e.g. "some tellings hold…") and
   record variants in `episode.json`'s `variants[]`.
4. **If the story genuinely isn't in the corpus,** say so plainly and suggest the
   closest covered stories instead of inventing content.
5. Note the exact refs you used — they become `episode.json`'s `sources[]` and
   the colophon citations.

## Step 2 — SCAFFOLD

```
anim episode new <slug> --title "<Title>"
```

Writes `episodes/<slug>/` with schema-valid starter `episode.json`,
`script.json`, `storyboard.json` wired to `_placeholder`, plus `audio/`,
`build/`, `dist/`. It refuses an existing slug (pass `--force` to overwrite).
You now **replace the placeholder content** with the real, corpus-grounded
material — do not add new files, edit these.

## Step 3 — AUTHOR `episode.json` + `script.json`

`episode.json` (see SCHEMAS.md → episode):

- `sources[]` = `{path, citation}` from step 1's refs.
- `cast[]` = `{characterId, role}` for each speaking/present character. Every
  `characterId` must exist as an approved library character at a pinned version
  before render (`make-character` if missing).
- `beats[]` = the corpus beat sequence, each `{id, summary, sceneRef}` mapping to
  a scene id you'll use in `script.json`.
- `variants[]` = the variant tellings you chose to acknowledge.

`script.json` (see SCHEMAS.md → script): **6–9 scenes**, each ~30–45 spoken words.
Per scene `{id, display, tts, mood, padBefore, padAfter, dialogue[]}`:

- **`display`** — the on-screen caption, **full IAST diacritics** (`Draupadī`,
  `Kṛṣṇa`, `Yudhiṣṭhira`).
- **`tts`** — the *same* line with proper names **hand-phoneticized** for the
  synth (`Draupadī → "Drow-pa-dee"`, `Kṛṣṇa → "Krish-na"`, `Yudhiṣṭhira →
  "You-dish-teer"`); put commas/periods where the voice should breathe. Never
  ship raw diacritics to the TTS.
- **`mood`** — exactly one of `mystic | festive | tense | tender | triumphant |
  somber | suspense`. This one choice drives the **score** (music adapter),
  and the overall register — pick per scene deliberately.
- **`padBefore` / `padAfter`** — seconds of silence around narration; size to the
  action (≈1.8–2.6 s normally, 4–5 s on a climax/final beat). This is your only
  pacing knob — `timeline.json` is generated, never hand-edited. Films should
  breathe: aim ~2–3 min for a short tale.
- **`dialogue[]`** — `{id, characterId, display, tts}` with the same display/tts
  discipline. Keep each `id` stable — lip-sync cues and `speakLineIds` key off it.

## Step 4 — AUDIO + TIMELINE

```
anim voice   --episode <slug>      # TTS per scene -> audio/narr-*.wav + timeline.json
anim lipsync --episode <slug>      # Rhubarb mouth cues -> cues/<lineId>.json
anim music   --episode <slug>      # seeded raga score from mood + timeline
anim mix     --episode <slug>      # narration + ducked music + loudnorm -> audio/mix.wav
```

`voice` produces `timeline.json` — the single timing truth for everything
downstream. **Never hand-edit it.** If timing is wrong, fix `padBefore` /
`padAfter` / the `tts` text in `script.json` and re-run `voice` (then re-run
`music`/`mix`, which derive from it). Only Apache/MIT-licensed TTS output ships
in a monetized episode; `say` is dev-smoke only.

## Step 5 — STORYBOARD

Author `storyboard.json` (see SCHEMAS.md → storyboard): one or more shots per
scene, referencing your cast at pinned versions.

- `set` — a known set name (validated against `library/style/catalog.json`).
- `camera[]` — keyframes `{t, x?, y?, z?, ease?}`; `z` zoom, easing
  `linear|io|in|out|back`.
- `actors[]` — `{characterId, version, at, scale, flip?, facing?, motion[],
  speakLineIds[]}`; pin `version` (`<id>@vN`); give a distinct `id` if a
  character appears twice.
- `beats[]` — `{at, actor?, pose?, face?, move?, fx?, over?}`; times are seconds,
  `"NN%"` of scene, or `"narr+X"`. Give every episode at least one **close-up at
  an emotional peak** (composition grammar; see qa-stills).

## Step 6 — VALIDATE (static gate, before render cost)

```
anim board validate --episode <slug>
```

Fix every **ERROR** (exit 1): unknown set/fx, missing `characterId@vN` puppet,
missing motion clip, a `speakLineId` that isn't a real dialogue line, a beat
targeting an absent actor, a malformed or out-of-scene time ref, a `sceneId` with
no scene. Warnings alone pass, but read them — an out-of-scene time ref warning
is usually a real timing mistake.

## Step 7 — STILLS QA LOOP (the craft step — do not skip or shortcut)

This is where an episode goes from "renders" to "genuinely good." Budget real
time.

```
anim stills --episode <slug>
```

renders each shot's start/mid/end PNGs into `build/` and writes the stills-review
receipt `render` gates on. Then:

1. **Read every PNG** with the image tool — not a description of it. Apply the
   [qa-stills](../qa-stills/SKILL.md) checklist per frame: silhouette
   readability, anti-twinning, house-style conformance, composition (nothing
   cut off / badly overlapping / off-canvas), scale consistency, continuity, and
   whether each pose/expression matches the line narrated at that timestamp.
2. Fix what's wrong in `storyboard.json` / `script.json` (or flag a character
   asset for `make-character`), regenerate, and look again.
3. **Iterate at least twice.** The bar is "would I ship this," not "it rendered
   without an exception." A change that has not been rendered to stills and
   actually looked at does not ship (CLAUDE.md gate).

## Step 8 — RENDER + verify the mux

```
anim render --episode <slug>
```

Deterministic Remotion render → `dist/<slug>.mp4` (+ captions + poster).
`render` refuses if the stills-review receipt is stale or inputs changed since
`assemble` — re-run the stills loop rather than reaching for `--force`. It is
slow; run it in the background and don't poll. When it finishes, pull 2–3 stills
straight from the encoded MP4 (≈10/50/90%) with `ffmpeg -ss <T> -i
dist/<slug>.mp4 -frames:v 1 …` and Read them to confirm the mux end-to-end.

Optionally lock goldens with `anim golden --episode <slug>` (per-shot `--scope`
for any `--update`).

## Step 9 — DELIVER

1. Report the MP4's absolute path (`episodes/<slug>/dist/<slug>.mp4`); send it if
   the session has a file-send tool.
2. Cross-link the episode from the corpus source doc(s) you cited, as a
   blockquote callout under the relevant heading (a `> 🎬 Watch:` line pointing
   at `episodes/<slug>/`). Do **not** modify the corpus repo's data files.

## Constraints

- **No generative video, ever.** Generated *stills* are for character/background
  assets only (pre-production); all motion is puppet transforms + keyframes
  rendered by Remotion.
- **Determinism.** Output is a pure function of committed inputs. No
  `Math.random()`/`Date.now()` on any path — seeds are explicit and recorded.
- **Generated manifests** (`timeline.json`, `cues/*`, `episode.build.json`) are
  never hand-edited — re-run the producing stage.
- **License + citation hygiene.** Every scene traces to a corpus citation;
  reliability nuance is preserved; only clean-licensed model output ships.
