# SSOT and evidence

`docs/` owns human-facing contracts, one level per document and one source zone
per fact (`EXPLICIT`, `CONFIRMED`, `INFERRED`); `evidence/` owns captures and is
never authority. `.agents/skills/` owns agent procedures. `.agents/knowledge/`
owns reconciled agent lessons. `.scratch/` and `/tmp` hold working evidence and
are not durable sources.

A tree organized by milestone becomes a diary even when every entry is true: the
same fact is restated per milestone and drifts, and state ends up spread across a
status file, a roadmap and a ticket. Organizing by level (distance from purpose)
and by source (who said it) deletes that class of error by construction;
`npm run docs:lint` observes the shape so it cannot decay silently.

Do not copy a contract into a skill when a sharp link is enough. Promote a
lesson only after checking current source, tests, and runtime behavior. State
the command, scope, result, and limitation. Passing tests does not prove
visual or audio quality; actual artifact inspection does.

Evidence distinguishes success from failure only if it could have failed. Pair
a material check with a red case, and measure at the source — run the real
evaluator — rather than through a proxy such as a pixel ratio. Bind a claim to
the revision it was observed on: a worker's completion claim ("no regression",
"byte-identical") is not evidence until re-derived.

## Evidence carries its bake identity

A rendered still or clip is evidence about the bake it was rendered from, never
about the episode in general: two bakes of one episode differ by a retiming, and
frame 53 of one is a different pose from frame 53 of the other. The M5 second
review judged nine stills of a 12.15 s bake while quoting a 14.35 s bake's
numbers, and read a correct renderer as broken. So: an evidence image carries
the identity of its bake — duration, frame count and a hash of the compiled
manifest or motor track, plus the repository revision — in the evidence index
(and a sidecar or filename where cheap). A picture without that identity is not
evidence. Derive the sampled frames from the bake (bind, lift, release, aim)
rather than copying a number, and prefer a committed check that makes the
comparison mechanical.
