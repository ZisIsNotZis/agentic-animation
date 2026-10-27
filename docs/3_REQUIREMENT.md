# EXPLICIT

- `episode.yml` is the single authored production input; the supported path is
  `check`, `make`, `preview`, `render-yaml`.
- Chinese is valid only inside dialogue and human-facing metadata such as a title.
- No parallel DSL, no second puppet runtime, no converter or dual runtime for
  legacy authoring forms.
- Existing licensing decisions and the no-generative-video rule stay in force.
- New recurring costs, external services or material contract changes need
  authority covering them.

# INFERRED

## Functional

- **One authored script compiles to a renderable performance.** Every brace
  expression evaluates at `check`/`make`; unknown instances, missing exports and
  argument errors fail there, never mid-render
  ([DSL](7_DSL.md), [schemas](7_SCHEMAS.md)).
- **Audio is authoritative for timing.** Speech, subtitles, lips and calls all
  derive from one measured timeline; a named cue that cannot resolve is a defect.
- **Assets are immutable and identified by their path.** No `id`, `version`,
  aliases or registry index; a figure, set, prop or procedure is reusable because
  it exists in `library/`, not because an episode declares it
  ([plugin contract](6_WORLD_PLUGIN_CONTRACT.md)).
- **Staging is derived, not authored.** Authors state relationships (`facing`,
  `entrance`, `on(x)`); the engine resolves composition, scale, depth order,
  separation and clamp to the subject safe area, and fails rather than fudge a
  composition that cannot fit.
- **Motion is simulated.** Support, contact, reaction and ownership are enforced
  by the motor at a fixed substep, and a pose that would break them is refused
  with a named diagnostic ([motor](8_MOTOR.md)).
- **The renderer consumes only the compiled manifest**, evaluates it purely and
  seek-safely, and performs no filesystem, network or clock access per frame.
- **A changed contract is documented before it is coded**, at its owning level.

## Non-functional

- **Determinism.** Same seed and inputs produce byte-identical trajectories and
  frames within a session; cross-session render identity is a known open defect
  ([ticket](../evidence/tickets/BACKLOG-RENDER-NONDETERMINISM.md)).
- **Normalized geometry.** Everything crossing the plugin seam is normalized to
  `0..1`; native resource units never leak into staging, and output pixels are
  never reinterpreted as scene coordinates.
- **Performance.** 1280×720 at 24 fps, four render workers, concurrency
  configurable and per-frame work bounded; the 180-second benchmark is the
  regression check.
- **Legibility over physical completeness.** Inside the viewing-size bar, the
  convenient mechanism is preferred; a limit may be shaped (a carried prop keeps
  its authored orientation instead of swinging with the forearm) as long as it
  does not read as wrong.
- **Honest evidence.** A passing gate, a test run or a metadata field is not
  visual acceptance; modalities that were not exercised are named as not
  exercised.

## Constraints

- Everything runs locally on this machine with free or already-owned resources;
  the toolchain is pinned (`package.json`, `py/`, `vendor/`).
- Third-party skills under `vendor/` and their links are immutable; learning
  from them means re-authoring the mechanism, not copying their code.
- One writer per hot file; assets never conflict; a package runs its own scoped
  tests and the combining node runs the whole check
  ([ownership](6_ARCHITECTURE.md#ownership-and-the-conflict-rule)).
- Public behavior changes come with a test that observes the defect being closed.
