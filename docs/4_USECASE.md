# EXPLICIT

- Slice A's serve is accepted; the person judges whether a shot *reads* as
  badminton, and they accepted it with “not very natural” as an observation.
- Vertical improvement: a slice is accepted at the level where it can be judged,
  and the next cut goes deeper.

# INFERRED

## P0 · turning a story into an episode

An agent receives prose, a markdown document or a theatrical script and returns a
rendered episode. The flow is the pipeline's, not this document's
([pipeline](9_PIPELINE.md)): map the story onto actors, locations, objects and
beats; bind library assets; author `episode.yml` with semantic calls; run
`check`, then `make`; inspect stills at the beats; `render-yaml`; verify the
media. Done means the episode compiles, the cues it authored appear in
`audio.cues`, and a reviewer who did not build it passes the stills.

## P1 · the three new situations (the asset programme)

Each situation exists because it needs a capability the engine does not have, and
each is delivered as its own slice with new native artwork.

### A · the badminton serve, then the rally

A server strikes a shuttle from his palm, the shuttle arcs at 40°, bounces and
settles, the camera follows it, and the racket stays in his other hand. The rally
extends it: the receiver's hand is placed where the descending shuttle will be, so
a second hit lands from a cue a person could author.

- **Accepted rendition:** the one the episode's artifacts note records as
  accepted — 1280×720, 132 frames, 5.5 s, 24 fps, the serve struck 2.207 s and
  settled 3.717 s — and the later rendition beside it with the racket in the off
  hand and those events unmoved ([renditions](../episodes/a-badminton/artifacts/README.md)).
- **What a later cut owes:** a second `projectile.struck` from at least six of
  eleven authored cues ([roadmap](0_ROADMAP.md) R8).
- **What it may not do:** change the accepted serve's arc, force, elevation,
  staging or timing.

### B · a giant swing on a high bar

A compact, heavy gymnast rotates a full circle about a fixed bar while a second
figure reacts; the support is the bar, not the ground, and both hands share one
grip. **State:** the capability is proven (grip error 0.000000 px over 86 frames,
zero diagnostics) but the shot does not bake, and the reason is staging and
sub-pixel invariants, not the swing ([roadmap](0_ROADMAP.md)).

### C · pouring tea

An older host tilts a pot into a cup; the tilt is authored intent and the stream,
cup level and steam are derived from it. **State:** `intent pour` is declared and
fails loud, the pot and cup exist, the room and the two cast members do not.

## P2 · capability demonstrations

`episodes/showcase-*` are minimal single-capability episodes — states, actions,
camera, effects, props, voice, particle snow, orientations — used as regression
probes and as living documentation of what the DSL can express. They are not
story deliveries; the list and what each proves are in
[4_SHOWCASES](4_SHOWCASES.md).

## P3 · an asset is produced, judged and installed

The producer builds five views, a skeleton per view, hands, expressions and
wardrobe in a disposable draft library, runs the declared==painted guard, gets
stills, and only an approved asset moves into `library/`. A figure becomes the
category's recommendation through the category manifest's `use`, never by editing
episodes; the person approves the production path per figure.

## Acceptance of a slice

A slice is accepted on its own evidence, never on the programme's:

1. The episode passes `check` and `make`, and the compiled `audio.cues` names the
   cues it authored.
2. The render is cut into stills that carry their bake identity, and the frames
   inspected are those of the current revision — a reused stills directory is not
   evidence.
3. An independent viewer review passes at normal viewing size. **The reviewer may
   not be the package that built the shot**; a builder grading its own frames is
   the failure this rule exists for.
4. Terms that only taste can settle are marked as the person's and stay apart from
   what passed by measurement.
