# Narrow episode DSL

- [x] Define one canonical, strict Zod schema and inline-call grammar
- [x] Add behavior tests for valid scripts and common authoring mistakes
- [x] Export JSON Schema and document the authoring contract
- [x] Have Luna rewrite `AI 打工奇遇记.md`
- [x] Machine-validate and review the generated YAML; refine until clean
- [x] Run core tests and typecheck

Evidence: YAML validates as 10 scenes; procedure registry, cue adjacency, and
prop ownership checks pass; `npm run typecheck`; full `npm test` 46/46 passed.
