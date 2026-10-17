# SSOT and evidence

`docs/` owns human-facing contracts. `.agents/skills/` owns agent procedures.
`.agents/knowledge/` owns reconciled agent lessons. `.scratch/` and `/tmp` hold
working evidence and are not durable sources.

Do not copy a contract into a skill when a sharp link is enough. Promote a
lesson only after checking current source, tests, and runtime behavior. State
the command, scope, result, and limitation. Passing tests does not prove
visual or audio quality; actual artifact inspection does.

Evidence distinguishes success from failure only if it could have failed. Pair
a material check with a red case, and measure at the source — run the real
evaluator — rather than through a proxy such as a pixel ratio. Bind a claim to
the revision it was observed on: a worker's completion claim ("no regression",
"byte-identical") is not evidence until re-derived.
