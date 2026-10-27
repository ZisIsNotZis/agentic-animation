# Deferred prop drop / bounce experiment

## Status and contract

Deferred; not a M2 acceptance gate. Owning current requirements:
[ART_CHARACTER_M2.md](../art/ART_CHARACTER_M2.md#user-observed-contact-defects-and-acceptance).
Preserve existing assets and the single episode.yml path. No execution started.

Outcome: demonstrate an intentional giver release without receiver contact,
a gravity-driven fall to real support, and optional partial restitution without
fracture. Contact/support/ownership remain authoritative; no remote catch or
teleport. Authors should not script frame-level physics or bilateral synchronization.
Explicit release is one call; gravity, support response and rebound are automatic
physics consequences. Persistent holding ends only on explicit release or
successful transfer, not an implicit timer. Ordinary pickup/transfer need only
two calls and settle into natural holding poses; raising/repositioning is optional.

Acceptance proposal (agent, not user-approved numeric thresholds): release clears
ownership; detached position/velocity remain continuous; a missed receiver cannot
bind; impact gives a decaying rebound with restitution strictly between zero and
one; repeat impacts settle without energy growth, penetration or indefinite jitter.
Regression plus canonical rendered before/contact/recovery and realtime inspection
are required. Exact material parameters and thresholds remain to be selected.

## Record

- 2026-10-13T09:54:09+08:00 — Main: user permits deferral or opportunistic work,
  excludes cup breakage. Chose deferral to keep current M2 handover/contact repair
  focused; no physics implementation changed.
- Same event — scoped source inspection: `packages/core/src/motor/index.ts`
  already applies gravity to released/falling props and stops vertical motion on
  support (`vy = 0`, `falling = false`). This is not general all-body gravity or
  a restitution model. Existing behavior still needs the no-receiver scenario
  proved; do not rebuild an assumed absent gravity subsystem.

Next action when activated: reproduce no-receiver release through canonical
script; verify existing gravity/support behavior; design contact-local restitution
and velocity preservation within motor ownership; docs-first, TDD, bounded render
and actual experience checks. No publication/production replacement authorized.
