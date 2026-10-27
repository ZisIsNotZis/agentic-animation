# EXPLICIT

- Quality bar: coarse is correct — a defect counts only when it is visible at
  normal viewing size. Two bounds hold regardless: a carried item must not read
  as spilling, and a hand must not read as passing through the middle of a prop.
- Vertical improvement, not “everything as good as it can be, then next step”.
- Compare visible outcomes at every milestone: original → last accepted →
  candidate, at matching narrative beats.
- Production-path replacement of an asset, publication and new spending are the
  person's decisions, taken per item.

# INFERRED

## Success, in the order it is judged

1. **A person watches the clip and believes the moment.** This decides; every
   other measure below only explains it.
2. **The story survives the pipeline.** Speech, lips, subtitles, contact, support,
   ownership and camera containment stay correct through the beat.
3. **The authored input stays small.** An ordinary pickup or handover is two
   semantic calls, not positioning code.
4. **The work reproduces.** Same inputs and seed produce the same frames; every
   accepted artifact is bound to a hash, not to `HEAD`.
5. **Cost stays inside the budget below.** Time is the scarce resource: where
   finishing sooner costs more, finish sooner.

## Scope

In scope: the canonical `episode.yml` path (`check`, `make`, `preview`,
`render-yaml`), the library assets and procedures it consumes, the plugin-host
engine, the motor, the Remotion renderer, the local skills and docs that operate
them, and the art-quality milestones M0–M8.

Out of scope until named: publication and public distribution, paid or external
generation services, a parallel DSL or a second puppet runtime, a broad engine
rewrite for its own sake, and finished commercial episodes. The three checked-in
episodes are demonstrations, not product.

## Prioritization principles

- **Depth over breadth.** A layer is accepted at the level where it can be
  judged, and the next cut goes deeper; one layer is never perfected first.
- **Cause over symptom.** A defect is closed where it was made — the drawn size
  and the physical body are one declaration, the support line is the painted
  line, the camera viewport is the rendered frame — and the closure is pinned by
  a test or a measurement rather than by prose.
- **Gauges over opinions.** Where a mechanism can be measured (ink retention,
  overlap area, rate limits, gap in screen pixels), the measurement decides
  before a reviewer is asked.
- **Immutability where comparison depends on it.** Source assets, frozen audio and
  accepted renditions are never rewritten; a new revision is additive.
- **One home per fact.** If two documents disagree, the higher level wins and the
  lower one is corrected in the same change.

## Budget

- Comparison renders: 1280×720 at 24 fps, four workers, at most 15 s per clip and
  30 s of footage per iteration; targeted stills before clips. Raising it needs a
  concrete reason.
- The 180-second benchmark is the regression check for engine work, never for
  these short art comparisons.
- Generated media, manifests, caches and scratch notes stay out of Git; evidence
  bundles live outside the repository and are referenced by hash.
- A metered call's cap is a runaway valve, not a budget.
