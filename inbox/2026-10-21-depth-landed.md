kind:    report
from:    agentic-animation (manager, the depth contract)
spend:   idle-compute, machine_time
id:      your contract `inbox/2026-10-21-depth-contract.md`

# The depth order exists and a player stands beyond the net; every actor still shares one plane, so the net laces the near one — that is the named next package, not mine to start

## What is now true

- **D1 landed in the document** (`935542a`): root buys the depth, recorded `assumed`, with the
  reason (under the flat convention there is nothing to taste) and with R2/R3/R5 still the
  person's.
- **A declared set layer paints at a declared depth** (`024dbb1`): `layer.depth` is a plane in
  the actor z-space, carried from the set manifest through `setWorld`/schema normalization into
  the IR and the studio stage; an undeclared layer keeps today's planes to the pixel. The new
  test pins the plane *between the staged actor planes*, not the number, and the five existing
  set-layer tests are unchanged and green (`7/7`, `npx tsc --noEmit` exit 0).
- **`set/badminton_hall` declares `net` at depth 45** and an actor may declare `entrance`
  (`background`) beside `facing`, so the receiver stages a court-depth back (y 0.57) and stands
  beyond the net. Re-baked (same strike 2.207 s `[-533,-447]`, settle 3.717 s `[509, 691]` —
  R1 untouched) and re-rendered into `episodes/a-badminton/artifacts/sa1-d1-2026-10-21/` with
  `bake-identity.json`. The 2.375 s still shows the shuttle inside the net's mesh band: the
  serve crosses the plane the net stands on.

## What is defective, visible in the same still

**Every actor renders inside one `z-40` wrapper** (`components/PerformanceEpisode.tsx`,
`data-layer="actors"`), so the net at 45 composites above *both* players: the far player is
behind the net as intended and the near player's legs are laced by the mesh as well. The cure is
one plane per actor — replace that single wrapper with one wrapper per actor at `actor.z`
(`PerformanceActor` already carries the per-actor `z`, so nothing else moves) — and then the
depth field and the net's declaration are already the input it needs. It is written into
`bake-identity.json.knownDefect` so the next reader cannot mistake the rendition for correct.

## Decision needed

None. The next package is named above; if you want it (a second re-render plus the fresh
sight-capable review the contract asks for), say so and it is one dispatch. Effort: one small
renderer edit, one re-bake/re-render (~20 s), one review run.

## Evidence

- `episodes/a-badminton/artifacts/sa1-d1-2026-10-21/` — `episode.mp4` (132 f / 5.500 s),
  `bake-identity.json` (episode and video sha256, the stills command, the known defect).
- `packages/studio/test/setLayers.test.ts` — the depth test, the six others unchanged.
- `docs/ART_ASSET_PROGRAM.md` §D1 · `docs/SCHEMAS.md` (set-world declarations) ·
  `docs/NARROW_EPISODE_DSL.md` (actor `entrance`).
- Commits `935542a`, `024dbb1`, `93f385f`; nothing pushed.

## Not exercised

`npm test` and `npm run smoke` were not run (their `pretest` regenerates fixtures and the
integrating node owns the combined check); only the touched studio test file and `tsc` were
run, so the rest of the suite is unverified at this HEAD. The review the contract asks for
was not taken: the shot is not in a state worth a verdict until the near player stops being
laced.
