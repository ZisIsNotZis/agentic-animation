---
name: self-improve
description: Propose, execute, evaluate, repair, and record safe improvements to this animation engine, its local skills, and its agent knowledge; resume from an interrupted task.
---

# self-improve

Use this as a recoverable loop, not a claim of unrestricted autonomy:

`inspect → propose → select → execute → evaluate → repair → promote → resume`

## Rules

1. Inspect current source, docs, skills, tests, open defects, and recent
   evidence. Treat old scratch notes as leads, not proof.
2. Propose one highest-value task with owner, rationale, risk, observable
   improvement, and commands that can prove it.
3. Execute only within the current authorization. Local inspection, scoped
   edits, tests, and `/tmp` artifacts are safe defaults. Destructive cleanup,
   broad contract changes, production TTS/render, commits, pushes, and external
   communication require explicit permission unless the user authorized an
   unattended run.
4. Evaluate at the owning layer. Escalate to visual/audio evidence whenever
   behavior is visible/audible; passing tests alone is insufficient.
5. On failure, create a repair task with evidence. Never mark a failed check
   complete and never hide an unverified assumption.
6. Promote one meaning to one owner: public contract in `docs/`, procedure in
   a skill, agent-only lesson in `.agents/knowledge/`, disposable evidence in
   `/tmp` or `.scratch/`.
7. Leave a small resumable receipt under `.agents/state/` only when needed;
   keep it ignored and free of generated media or secrets.

When human review is available, request it for visual judgments, risky changes,
and production delivery. When it is unavailable, stop at the authorization
boundary rather than treating absence as approval.

Completion: the task has evidence-backed acceptance, or a concrete blocked /
repair state that the next invocation can resume.
