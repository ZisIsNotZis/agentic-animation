# episodes/a-badminton/artifacts/ — the declared home for this episode's renditions

One directory per rendition, named `<round>-<date>` (`sa1-er-` is the rendition ER refused;
the bake identity inside each one names the revision it was rendered at). A rendition is a
bake plus its render, and it never leaves this directory: `/tmp` is not a home, and a
verdict may not rest on bytes a reboot deletes.

Each rendition directory holds:

- `episode.mp4` — the render itself, tracked, identified by its sha256.
- `bake-identity.json` — the pinned identity: episode sha256, video sha256, frame count,
  duration, size, and the revision the render was made at. It also names the stills (the
  beats they show and the second each is cut at) and the command that cuts them.
- `verify.sh` — one command that recomputes every field of the identity and cuts the
  stills. Exit 0 means this rendition is intact; a non-zero exit names the field that moved.
- `stills/` — created by `verify.sh`, regenerated from `episode.mp4`, not tracked.
- `*.log.txt` — the logs of the commands that produced it (`*.log` is ignored repository-wide,
  so they are stored with a `.txt` suffix rather than left behind).
- `probe/` — the episode variants tried on the way, `episode.yml` only; their
  `performance.json` is derivable with `make` and is not stored.

A rendition is superseded, never overwritten: its identity is what a verdict is bound to.

```
bash episodes/a-badminton/artifacts/<rendition>/verify.sh
```

**Renditions here**

| directory | revision | video sha256 | what it decided |
| --- | --- | --- | --- |
| `sa1-d1p-2026-10-23/` | R6 (this commit) | `f2539bda…` | the first rendition at the acceptance size **1280×720**, after R6 closed three depth defects: the background entrance's 0.82 scale, a native object's plane (shuttle 35 once free, its holder's 50 while held), and the actor planes themselves reaching the drawing (receiver 40, server 50, net 45 between them). The net's tape now passes in front of the free shuttle and behind the near player's legs. Struck 2.207 s `[-533,-447]`, settled 3.717 s `[476.56, 691]`, unmoved from R1. **Accepted by the person on 2026-10-23** (“probably yes, not very natural, but again we prefer vertical improvement…”), with that observation recorded as theirs in `docs/ART_ASSET_PROGRAM.md` §Roadmap and no polish pass owed on this shot. |
| `sa1-d1w-2026-10-21/` | `264a09a` | `2ad11717…` | D1's wrapper half landed (one plane per actor): the net stands behind the near player and in front of the far one. The blind depth review is bound to this rendition; struck 2.207 s, settled 3.717 s at `[476.56, 691]`. |
| `sa1-r1r4-2026-10-21/` | `c38c782` | `29ca57f4…` | the rendition after R1 (the projectile's ground is the set's floor) and R4 (the shuttle at 116): struck 2.207 s, settled 3.717 s at `[476.56, 691]` — its rest is **on** the hall's painted floor line, and its contacts and hops are in `bake-identity.json`. This is what a fresh reviewer is asked about. |
| `sa1-er-2026-10-21/` | `6a8d967` | `6d3cbca5…` | ER refused it `NOT SATISFIED`; a second, independent review agreed on substance and falsified ER's "no bounce" (two hops of 62 px and 16 px). The shot's rest sat 41 px above the painted floor — the R1 defect. |
