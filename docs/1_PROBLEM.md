# EXPLICIT

What the person said the work is for.

- The deliverable is a tool that turns a written story into a finished, narrated,
  2D animated MP4 — deterministically, locally, with **zero generative video**.
  Generated still images are allowed for asset creation only; all motion is
  code-driven.
- Delivery was slower than wanted, so the quality bar is “coarse is correct”: a
  defect counts only when it is visible at normal viewing size, and effort goes
  into not looking wrong rather than into being exact.
- Priority order: absorb every valuable Huashu mechanism into this engine, its
  skills and its practice — everything except image-generation models — then
  continue the engine goal with ready-made example assets. Every step ships as a
  vertical slice a person can see.

# INFERRED

The problems this project exists to remove, each traced to the mechanism that
made it possible.

## The artwork does not carry the story

The engine renders, but the drawn world does not yet make a person look twice:
schematic sets, one readable face, stiff joints, flat light, and props that read
as stickers. The deficit was accepted as a fact before it was worked on, and the
M0 baseline exists so improvements are compared against a frozen picture of it.
Story is carried by who bends, what is in whose hand and where the light comes
from — so artwork, materials, acting and framing are not decoration here.

## Motion was imagined instead of simulated

A previous renderer carried English prose in bone tracks, regex-matched it into
poses and eased between positions. Remote force was therefore *representable* — a
push could drag a target with no contact — so it happened. That defect was closed
at the class: the motor makes remote force unrepresentable, and its invariants
(support, contact, reaction, determinism) are enforced by the simulation rather
than by convention.

## A reusable asset could not act

Legacy puppet figures have no articulated posture, so any contact beat with them
lifts the prop while the figure never bends. Acting requires native artwork — five
drawn views, a skeleton per view, hands, expressions — and that is why the asset
programme's casts are new native figures rather than upgrades to old ones.

## Authoring was the bottleneck, not rendering

The authored input had to stay small, semantic and hard to misuse: one
`episode.yml`, friendly instance names, relationships instead of coordinates,
and typed calls at dialogue boundaries. Any richness that authors have to type is
a cost paid on every episode, so it belongs to library assets, procedures and the
compiler instead.

## The person's attention is the scarce resource

The person judges what a shot *reads* as; everything mechanical must be decided
before it reaches them. Each milestone therefore runs vertical-slice style, with
one slice mapping to one judgment, and a review agent does the person's job in
advance so they are not asked to reject the same milestone twice. A builder
never grades its own frames.
