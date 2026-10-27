# BACKLOG: fall edge cases from the slice-4 review (non-blocking)

From the independent slice-4 review (2026-10-16, head d0eca4f).

1. **Bake crash edge**: shoving a body after its fall envelope closes (fallen,
   envelope nulled, stagger >1 re-raised by a new push drive) hits a non-null
   assertion in `packages/core/src/motor/index.ts` collapse branch and fails
   the bake loudly. Smallest fix: guard the branch on `state.fall` and let a
   fallen body without an envelope skid at the bounded slide rate (or keep the
   envelope while fallen). Edge choreography, outside slice-4's claimed
   scenarios — fail-loud today, not silent corruption.
2. **Missing regression test**: the slice-4 push-drive repair (native drives
   honoring the 480 px/s hand cap; no single-substep lean snap) has no test
   pinning it in `packages/studio/test/nativeFigureMotor.test.ts`; the freeze
   defect could silently return. Add a native push-drive rate/freeze
   regression test.
