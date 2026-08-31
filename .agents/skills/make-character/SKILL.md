---
name: make-character
description: Create a new approved, versioned puppet character for the anim library from a corpus-grounded brief — brief → anchor approval → generate parts → cut → rig → approve. Use when an episode needs a character that isn't in library/characters yet.
---

# make-character

Pre-production for one character: an expensive, human-approved, versioned batch
that produces an approved `library/characters/<id>/v<N>/` (puppet.json + parts +
meta.json) an episode can pin. This is **generate-once**: never regenerate an
approved character in place — a new look is a new `v<N+1>` via the same flow.
Read [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md) §8 (the puppet model)
and [docs/DECISIONS.md](../../../docs/DECISIONS.md) (licensing) before `char gen`,
and [docs/SCHEMAS.md](../../../docs/SCHEMAS.md) for `puppet.json` /
`library-meta.json` fields. The visual bar and anti-twinning rules are in
[qa-stills](../qa-stills/SKILL.md).

Commands are `anim char <sub> <id>` (`npm run anim -- char <sub> <id>`). `<id>`
is lowercase (e.g. `krishna`, `satyavati`).

**On stub stages.** `anim char *` is owned by the imagegen workstream; in M0 the
subcommands are registered but throw `NotImplementedError` until that workstream
lands ComfyUI + `rembg` + the pivot editor. Run each; if a stage reports
not-implemented, report that rather than hand-building assets. The gates and
contract below are what those stages will enforce.

## The two human gates (both mandatory)

1. **Anchor approval** (after `char gen` produces the frontal reference): a human
   confirms the identity anchor reads correctly *before* any derived art is made.
   Everything downstream is edited *from* this anchor to lock identity, so a bad
   anchor poisons the whole set.
2. **Character approval** (`char approve`): a human signs off the rigged puppet;
   this freezes `draft/` → `v<N>/` and is the moment the character becomes
   citable by episodes.

Do not skip or self-approve these — they are the project's quality spine
(ARCHITECTURE §3).

## Step 0 — Preflight

`anim doctor`. The imagegen adapter (`imagegen:comfyui`) must be reachable
(ComfyUI `/system_stats` responds) and the edit model present. Image gen and
render never run concurrently — the CLI holds a lock; don't start a render mid-gen.

## Step 1 — BRIEF (`char new <id>`)

```
anim char new <id>
```

Creates `library/characters/<id>/draft/brief.md` prefilled with the locked
house-style block from `library/style/house-style.json` (prompt fragments +
negative prompts + palette). **Fill the brief from the corpus** using the
`hindu-timeline` adapter (see make-episode step 1): grounding citations,
epithets, and iconography — skin tone, ornaments, weapons, `vāhana`, and any
canonical marks (`tilak`, crown/`mukut`). Note variant iconographies the corpus
flags. Record every corpus ref you used — it becomes `meta.json.grounding`.

Body-plan note: exotic beings (`vānara`, `nāga`, multi-armed/multi-headed deities)
are just **more parts** on the same rig — capture the extra limbs/heads/tail in
the brief; the runtime handles them.

## Step 2 — GENERATE (`char gen <id>`) — with the anchor gate

```
anim char gen <id>
```

Runs the ComfyUI workflows in order, recording seeds in `meta.json`:

1. **Frontal identity anchor** — the canonical reference. **STOP and get human
   approval of this image** before continuing (gate 1). Read it yourself first
   against the brief; if it's off, re-run with an adjusted prompt/seed.
2. **Turnaround + expression sheet**, edited *from the approved anchor* (identity
   lock via the edit model).
3. **Part sheets** — each body part as its own image on flat chroma (head, torso,
   upper/lower arms, hands, upper/lower legs, feet, costume attachments) — plus
   the **9 mouth shapes** (Rhubarb visemes `A–H, X`) as head-space overlays.
   Parts must include the *occluded* regions (the shoulder under the arm), not
   just the visible silhouette — this is why parts are generated separately
   rather than segmented out of one image.

Licensing is binding here (DECISIONS.md): the default edit model is
**Qwen-Image-Edit (Apache-2.0)** — commercial-clean. **No FLUX-family models**
unless `allowFluxFamily` is set with an explicit BFL license; the config guards
this. Whatever generated each image, its model + license is recorded in
`meta.json` at generation time (hard rule #2).

## Step 3 — CUT (`char cut <id>`)

```
anim char cut <id>
```

`rembg` background removal (CPU-fine on Mac) + trim + pivot annotation. Then the
interactive **HTML pivot editor** (a localhost page) for what automation gets
wrong — click to set each part's pivot and z-order. Pivots must sit **inside**
each part's bounds (the rig stage rejects otherwise). SAM2/SAM3 segmentation is
not used (architectural + Mac-viability reasons in DECISIONS.md).

## Step 4 — RIG (`char rig <id>`)

```
anim char rig <id>
```

Assembles `draft/puppet.json` on the standard part skeleton (torso, head,
arm_u/l_l/r, hand_l/r, leg_u/l_l/r, foot_l/r) and validates: every standard part
present, all **9 visemes** present, every pivot inside its part bounds, the mouth
anchored (usually to `head`). Costume/state variants are **skin swaps** on this
same rig (`skins`), never a second rig. Extra parts (`tail`, `wings_l/r`,
`heads_2..n`, `arms_3..n`) are allowed additions.

## Step 5 — STILLS review before approval

Before approving, render the rigged puppet in a few poses/visemes and **Read the
PNGs** against the [qa-stills](../qa-stills/SKILL.md) checklist — silhouette
readability, no mannequin/joint-dot look, house-style conformance, correct
iconography. Iterate the parts/pivots until it genuinely reads. A puppet that
hasn't been looked at doesn't get approved.

## Step 6 — APPROVE (`char approve <id>`) — human gate 2

```
anim char approve <id>
```

Freezes `draft/` → `v<N>/`, writes `meta.json` (version, seeds, prompts, model +
license, ISO date, approver, grounding citations, notes) and regenerates
`library/characters/index.json`. Episodes now reference `<id>@v<N>`.

If a later episode needs a different look, run the whole flow again — it lands as
`v<N+1>`; the old version stays intact so already-shipped episodes never change.

## Constraints

- **Generate once / assemble many.** Never overwrite an approved version.
- **License recorded per artifact.** Every image's generating model + license is
  in `meta.json`; no FLUX-family without an explicit config override.
- **Identity lock.** All derived art is edited from the approved anchor.
- **Grounding.** Iconography traces to corpus citations; variant iconographies
  are noted, not silently picked.
- **Deferred (record in `meta.json.notes`, don't block on):** anything the rig or
  runtime can't yet express (unusual `vāhana` rigs, exotic deformation) — flag it
  so episode choreography can work around it.
