# Eight-orientation evidence — episodes/showcase-orientations

Rendered from /tmp/orient-ws (library symlinked, edge TTS), frame 30 of 49.
Full row: full-frame.png (1280x720).

## Per-view verdict (f0..f7, left to right)

| Actor | Orientation | Verdict |
|---|---|---|
| f0 lin | front | PASS — frontal symmetric, both eyes centered |
| f1 awei | front-right | PASS — quarter turn right, face narrowed/turned vs f0 |
| f2 aqiang | right | PASS — true profile facing RIGHT (single eye right, nose profile edge) |
| f3 liu | back-right | PASS — back view, right-side asymmetry |
| f4 senior | back | PASS — full back, no face |
| f5 student_a | back-left | PASS — back view mirrored vs f3 |
| f6 student_b | left | PASS — true profile facing LEFT (mirror of f2) |
| f7 elder | front-left | PASS — quarter turn left (mirror of f1) |

Zoom crops: row-left.png (f0-f4), row-right.png (f4-f7), f2-right.png, f6-left.png.
Old per-figure crops (view-*.png) used off-center x positions — superseded
by the row crops; kept for the record.

## Defects found and fixed while producing this evidence

The showcase initially rendered ALL EIGHT figures as identical front views.
Root causes (both fixed in this commit):

1. packages/core/src/compiler/index.ts — `shimCall` promoted the first ref
   argument to the event subject only for a hardcoded namespace list that
   omitted `pose`, so every `pose.orient(fX, ...)` call compiled into a world
   track keyed "pose" that no renderer reads. `pose` added to
   ACTOR_NAMESPACES; each actor now owns its orient call event.
2. packages/studio/src/performance/evaluate.ts — the orientation reader only
   looked at currently-ACTIVE events; orient events last 0.2s and then
   expire, so the turn was forgotten the moment it finished. Orientation is a
   body STATE: the reader now takes the newest at-or-before-frame event
   (persisting, like expressions) and also reads bone events nested inside
   call events.

Note: `npm run test:all` shows 2 failures in packages/core/test/motor.test.ts
(locomotion monotonicity, pursuit adjacency) that predate this work and are
unrelated to orientation — left for the motor worker.
