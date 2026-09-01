# SSOT and evidence

`docs/` owns human-facing contracts. `.agents/skills/` owns agent procedures.
`.agents/knowledge/` owns reconciled agent lessons. `.scratch/` and `/tmp` hold
working evidence and are not durable sources.

Do not copy a contract into a skill when a sharp link is enough. Promote a
lesson only after checking current source, tests, and runtime behavior. State
the command, scope, result, and limitation. Passing tests does not prove
visual or audio quality; actual artifact inspection does.
