# M2 self-contained SVG validation repair

## Scoped contract before implementation

Interpretation: close the independent review's concrete external CSS injection
blocker in figure artwork validation only; preserve renderer, motion, approved
assets and all historical/staged work. The named independent static review ticket
was absent at kickoff; supplied finding is independently tested here.

Options: blacklist CSS spellings (fragile against escapes/entities), or enforce
a small non-executable SVG element/attribute grammar. Recommendation: the latter,
with no style elements/attributes, namespaced content, entity references or
non-local URLs. Local fragment paint/clip references remain supported.
Cohesive leaf; no recursive delegation. Budget 20 minutes, bounded commands.

Acceptance: reproduce the CSS bypass with a valid design frame; red-then-green
regressions for imports, URLs, escaped/encoded CSS and executable containers;
existing native artwork still parses without mutation. Docs-first owning schema
contract. Renew typecheck, full tests, canonical smoke, Python checks and whitespace
checks. Bind final source and unchanged render inputs to existing static/video
bundles using durable supplemental evidence, without modifying originals or
needlessly rerendering validation-only changes.

Exclusions: no full M2 PASS, actual AV remains UNVERIFIED, independent fresh
review, user milestone judgment and production approval remain required.
Existing staged vendor/.gitmodules changes are not owned by this task.

## Result and revision-bound proof

Ready for fresh scoped review, not whole-M2 acceptance. Supplemental bundle:
`/home/z/.local/share/agentic-animation/art-baselines/m2-svg-validation-20261010T084349Z/`.
Original static/video bundles are untouched. `evidence/render-equivalence.json`
verifies all 2,521 static and 1,017 video bundle manifest hashes; the only source
hash deltas against both baselines are this schema, its test and `SCHEMAS.md`.
Twenty-five retained render-input JSON files and the draft asset validate;
45 embedded artwork objects parse deep-equal (no transformation). Renderer,
compiler, motor, audio and all other previously bound source remain byte-identical.
Consequently existing rendered pixels/audio remain applicable to these unchanged
render inputs; no new visual output or AV perception claim is made.

Independent reproduction: valid-frame CSS import passed old validation;
`evidence/red.log` records the expected failing assertion. New tests cover CSS
imports/URLs, escaped/entity URL forms, animation/link/namespace/event bypasses,
comments/CDATA and positive local gradient/clip references. Strict grammar now
rejects unsupported content rather than attempting general CSS sanitization.
Existing approved draft SVG data remains accepted without mutation.

Final gates exit0: typecheck, test:all (191 pass,7 skip), canonical smoke,
22 Python tests, diff-check. Initial typecheck exposed unchecked regex capture
types and was corrected before all final gates were rerun; failed log retained.
Final source snapshots/hashes, scoped delta and executable binding script are
in the supplemental bundle. Existing staged diff is byte-identical before/after;
this worker staged nothing, but repository no-staged-files is false because
pre-existing `.gitmodules` and vendor gitlinks remain staged.

Blast radius: `packages/core/src/schemas/figureArtwork.ts`, its test,
`docs/SCHEMAS.md` and this ticket only. No dependencies or renderer changes.
Remaining gates: fresh independent review of this repair and full M2 artifacts;
actual listening/real-time viewing remains UNVERIFIED; user M2 judgment and
separately named production approval remain ungranted. Reviewer should attempt
to falsify the conservative markup grammar and inspect source/render binding;
validation rejects unsupported SVG features intentionally, not general SVG support.
