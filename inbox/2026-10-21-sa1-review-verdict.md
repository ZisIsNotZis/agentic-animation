All named commands have now run to completion. Here is the review.

## Base and revision

- Revision reviewed: `a022a1e` (HEAD of `main` here), worktree clean before and after; every check below was run by me at that revision.
- **Base I used: `8e7a552`** — the tip of `origin/main`, and the merge-base of `8e7a552..a022a1e`. The project's own records point at it: `docs/STATUS.md` §"Restart point" describes the pre-advance state as "main at the asset-programme commit, 313/313 tests", and `8e7a552` is "Asset programme: resume instructions for each of the three slices".
- The advance is `8e7a552..a022a1e`: 25 commits, 25 files, +2337/−272 (E1 → E2 → E4 → EP → EA → ER → mail/docs). Reads the same if you take only the ER+mail pair (`70bf431..a022a1e`); nothing in the verdict depends on where the base is drawn.
- No engine or episode code changed after `6a8d967` (the render's revision) — the only post-render code is `tools/prop-track.mjs` (read-only printer). So the video in `/tmp/aa-sa1` is the render of this engine at this episode.

## Ran, at `a022a1e`

| command | result |
|---|---|
| `npm run anim -- check episodes/a-badminton/episode.yml` | exit 0, `check: OK … (1 scene(s), 2 spoken take(s))` |
| `make` on a **copy** of the episode in `/tmp` (so I wrote nothing in the project) | exit 0, 5.500 s, events `struck 2.207 [-533,-447]`, `settled 3.633 [509,650.16]` — EA's bake, event for event |
| `node tools/prop-track.mjs episodes/a-badminton/performance.json shuttle 2.8 3.7` | contacts 635.17 / 648.32; hops 62.41 px and 16.26 px; rest 650.16 s at 3.625 s; frame-0 (staged) y 691.20 |
| `npm test` | **333 tests, 333 pass, 0 fail**, exit 0 (149.5 s) |
| `npm run smoke` | `SMOKE PASSED`, exit 0 |
| `npx tsc --noEmit` | exit 0 |
| `git diff --check` | clean, exit 0 |
| `ffprobe` + `sha256sum` on the artefact | 132 f / 5.500 s / 24 fps / 1280×720; `episode.yml` `fcb4de68…` ✓ and video `6d3cbca5…` ✓ match `bake-identity.json`; `performance.json` is now `3a7550d3…` ≠ recorded `7df6ee87…` because it embeds `generatedBy.at` — exactly as the document now says |

So every mechanical precondition the plan names holds at this revision, and the bake reproduces.

## What I saw (my own reading, full-resolution frames)

Stills `t2.208/t2.500/t2.917/t3.167/t4.583` plus frames I cut at 3.083 s and 3.625 s:

- **At 3.625 s — the rest — the shuttle hangs in mid-air.** Its tip sits at roughly the racket's head height, ~30–40 screen px above the floorboards, with nothing under it, beside a racquet that stands upright unsupported. It never looks as if it has landed. This is ER's "leaning on a standing racquet", and it is true.
- **At 2.917 s and 3.083 s** the shuttle overlaps the receiver's shoe/ankle in mid-air, cork down, well oversized.
- The arc and the court do read: high on the right, over the net, low on the left. The shot is a wide; the shuttle ends at ~29 % of frame width with the whole court still in frame. The scoreboard is cut at the right frame edge from the follow onward (it is whole at 0.5 s, so the follow causes it).
- The players are identical statues in every frame.

## Verdict

**1. Is S-A1 reached / reachable at `a022a1e`?** Not reached. The plan (`docs/ART_ASSET_PROGRAM.md` §Roadmap) makes a fresh sight-capable reviewer's verdict on the cut stills *the* observation that decides S-A1; the only verdict in the tree is `NOT SATISFIED`, and my own reading of the stills agrees with its substance. The remaining gap is repairable **in-tree** — no missing capability blocks it — but a pass requires a repair, a re-render, new stills and a fresh review; none of that exists at `a022a1e`.

**2. Does the earlier `NOT SATISFIED` still hold?** Yes on substance, no on one observation.
- Falsified by my own run: *"no bounce, anywhere."* There are two hops, 62.41 px and 16.26 px at 3.125 s and 3.500 s. Its 6 fps sample stepped over them. That half is a measurement error, not a finding, and no later reader should inherit it.
- Standing: *"it does not come to rest in front of the camera."* The rest at 650.16 is 41.04 px above the line the shuttle started on (691.20 = the floor it was staged on), and the frames show it floating. Also standing: the follow is a wide (~118 px of set-feature shift across the whole follow, matching the document's own ~120 px), the shuttle is oversized, the receiver is never reacted to, and the shot's scale reads as a cone rather than a shuttle.

**3. Smallest missing thing.** **R1 — the projectile's ground is the actor y-clamp, not the set's floor.** The one still I can check by eye cannot be fixed by framing, staging or asset work: the rest sits on the actors' 650 line, 41 px above the 691 floor. That is the single defect that makes "lands, bounces, comes to rest" undrawable. R1 alone will not flip the verdict — the workset's order (R1, then R3+R4, one re-render, one still set, one fresh review) is the smallest *sufficient* path, and R2/R5 only if the second review still refuses.

## Blocking — things that make a pass unsafe even if the checks pass

1. **The evidence lives only in `/tmp/aa-sa1/`** — video, five stills, `bake-identity.json`. `git ls-files | grep -c aa-sa1` is 0; `art-baselines/` does not exist in the tree. A pass recorded here rests on bytes a reboot deletes, and `docs/ART_ASSET_PROGRAM.md` points at that identity file as the durable anchor. A pass needs the artefact or its identity in a declared home first.
2. **The bake warns and no document says so.** `make` emits seven `[make] sudden-move warning: shuttle jumps 33–55px at frame 63–69 — objects must move continuously` (my run and EA's own `/tmp/aa-sa1/make.log` both carry them, identical). The episode README and the programme record `make` as "exit 0" with no mention. The descent the bounce depends on is exactly what the pipeline flags.
3. **The green claim cites a key that is not there.** `performance.json` contains the string `diagnostics` zero times — `motor.diagnostics: []` is a claim about an absent key. The only diagnostic channel that fired was the stdout warning, and it is recorded nowhere. "Empty" and "not recorded" are not the same fact.
4. **R1's own instrument cannot show what its acceptance asks.** `tools/prop-track.mjs` prints `floor painted/tracked at y 691.2` from `track[0].y` — the prop's first frame, not the set. R1's accept ("rests on that line ±1 px; `node tools/prop-track.mjs` shows it") would pass against the prop's staged y even if the set's floor moved. The gate needs a floor from the set or the manifest's `supportSurfaces`, not from the prop.
5. **A dangling attribution.** `episodes/a-badminton/README.md:165` says the floor defect is one "EA named … as *could not land 1*". `grep -rn "could not land"` returns exactly two hits, both that citation; EA's five recorded limits are swing/elevation/toss/head-cut/scale and do not include it. The defect was found by the review, not recorded by the producer, and the document currently says otherwise.
6. **A doc claim against the artefact.** "Both players' heads are cut above the eyebrows from the first floor contact onward": at 2.917 s both heads are whole with margin above; at 3.625 s the hair touches the top edge at most. The cut is overstated.

## Not run, and residual

`render-yaml` was **not** re-run by me (a five-second 720p render); the video I judged is the recorded artefact, hash-verified, rendered at `6a8d967` where the engine code is byte-identical to `a022a1e`. My perceptual evidence is therefore bound to a video hash plus a code-identity argument, not to a render I made.
I wrote nothing in the project; the only `make` I ran wrote into `/tmp/rev-a022a1e/iso-a-badminton/`. Worktree clean at `a022a1e` at the end.

Report kind: **verdict (fail)**, routed to my parent. Roadmap touched: none of mine — S-A1 stays unreached and the repair workset stays as written in `docs/ART_ASSET_PROGRAM.md`. Evidence pointer: this session's commands above; `/tmp/rev-a022a1e/` (logs) and `/tmp/aa-sa1/` (artefact). Decision needed from root: only whether the workset launches, and R2/R3 if it does.