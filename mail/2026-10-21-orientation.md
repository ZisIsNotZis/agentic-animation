kind:    report
from:    orient-agentic-animation (package launched by root)
to:      root
spend:   idle-compute
id:      none — first contract, answered in the run final message

First orientation report, filed here by root. Body is the run report verbatim.

I've completed the orientation sweep. Report follows.

## (a) What this project is

`agentic-animation` is an agent-operated, local, deterministic pipeline that turns one authored `episode.yml` into a narrated 2D animated MP4 with **zero generative video**: motion is code (layered puppet rig + keyframes) compiled to renderer-neutral performance IR, rendered by Remotion. The single authored input is `episode.yml`; the supported verbs are `check → make → preview → render-yaml`. Identity of every reusable thing is its library path (`figure/athlete_a`, `set/badminton_hall`), category plugins own semantics, docs under `docs/` are the single source of truth with `AGENTS.md → docs/INDEX.md` as the entrance.

State measured in the checkout, not just read:
- `main` @ `8e7a552` (2026-10-19 +0800), clean against `origin/main`, no uncommitted work.
- **Engine milestone closed** (2026-09-29). 15 episode workspaces under `episodes/`, 77 docs under `docs/`.
- **Art-quality roadmap M0–M8 active** ([ART_PRODUCTION_UPGRADE](docs/ART_PRODUCTION_UPGRADE.md)): M0–M3 judged met by the user; M4, M5, M6 (PASS at `fb5baa6`), M7 (PASS at `8f8f1e8`) are delivered and awaiting the user's milestone judgment; M8 is planned.
- **Current work is the asset programme** ([ART_ASSET_PROGRAM](docs/ART_ASSET_PROGRAM.md)): three independent vertical slices on genuinely new native assets — A badminton rally, B giant swing, C pouring tea. Wave 0 landed the capability vocabulary (`4eef0de`). Slice A's assets are complete and independently reviewed; slice B's capability is proven but its shot is blocked on staging/sub-pixel boundaries; slice C has not started (no tea room, no host figure).
- The decisive inherited blocker for M8 is cast, not pipeline: legacy puppet figures have no articulated posture, so `lin_b_draft` remains the only native figure that can act ([ART_TRANSFER_M7](docs/ART_TRANSFER_M7.md), prerequisites 0–3).

## (b) Proposed next milestone

**Milestone: slice A (badminton rally) is accepted on its own evidence — the engine performs an instantaneous struck contact and a camera that follows a projectile, over assets that already passed review.**

Why this one: it is the only slice whose blocker is engine mechanism rather than a person's taste or unbuilt art, it is the project's own recorded first item ("Resume here" step 1; STATUS "Restart point"), and its acceptance is already defined without inventing new judgement (all three new capability families — instantaneous contact, following camera, hanging support — are exactly what M8's "second production situation" needs, and slice A is the first of them).

Work packages inside it, in order, with their seams:
1. **E1 projectile** — `packages/core/src/motor/index.ts` (state, gravity, restitution, struck rule), events `projectile.struck` / `projectile.settled`, `compiler/capabilities.ts` `projectile.implemented` flipped. Measured gap: `library/prop/shuttle/manifest.json` declares no `placement.kind` at all (`placement` is base/size/supports/body only), and no `packages/**` non-test file reads `.projectile` outside the schema.
2. **E4 following camera** — `packages/studio/src/performance/evaluate.ts`; today `library/camera/` holds only `punch_in` and `wide`, and M6's camera moves are authored pushes, not tracking. No follow camera exists.
3. **Episode** — `episodes/a-badminton/` does not exist (only `episodes/b-bar-swing/` carries slice work).
4. **Evidence + review** — bake-identity stills, independent viewer review, docs promotion (ART_ASSET_PROGRAM is at 243 lines against the ≤200 rule).

Evidence pointer: `docs/ART_ASSET_PROGRAM.md` §"Resume here" item 1 + §"Acceptance per slice"; `docs/STATUS.md` §"Restart point" naming the exact files and event names; `packages/core/src/compiler/capabilities.ts:38-42` (`owner: "Wave 2 (E1 projectile + struck contact)"`, `implemented` unset).

Rejected alternatives: slice B (blocked on a framing decision that is the person's — see below) and slice C (uses two figures that do not exist).

## (c) Questions the project cannot answer

1. **Direction — how to frame slice B's giant swing.** The orbit is 1351.5 design px against a 1080 stage; a whole circle cannot fit at any bar or ground position. Tried: raising the bar to reachable height (requires k ≤ 0.7991, outside the staging ladder), walking the actor onto the grip (singular), a walk stopping short (diagonal chord), and proving `setupY()` at 691.2 owns the standing line so the set cannot move it. Closed because the third option needs a scale/staging knob the YAML path does not have and the first two are film-grammar taste. Reopens on one sentence from the person choosing follow-the-body / pull-up-and-land / grow canvas, or on any change that lets a scene own its standing line. Pointer: `docs/ART_ASSET_PROGRAM.md` §"Slice B: the bar is staged below the gymnast's shoulder", `episodes/b-bar-swing/README.md`.
2. **Direction — is M8 still the destination, now that the asset programme exists?** M8's row ("integrate proven assets/recipes… final short showcase") reads as the end of the M0–M8 roadmap, while the programme is explicitly three independently accepted slices with no combined film. Tried: reading ART_PRODUCTION_UPGRADE, ART_TRANSFER_M7 prerequisites, ART_ASSET_PROGRAM scope; none states whether slice acceptance substitutes for M8 or feeds it. Reopens on a verdict naming which one is the finish line.
3. **Consent — may the new assets become the *preferred* production cast?** The 2026-10-16 gate opened the production path for `figure/lin_b_draft` only, "per item"; creating `athlete_a`/`gymnast_b`/`badminton_hall` is authorised by the programme, but flipping a category `use` recommendation to them is not covered by either sentence. Tried: STATUS §"Art-quality work", ART_PRODUCTION_UPGRADE §"User gates" — no approval names a new figure. Reopens if the person says one sentence about whether new assets may be recommended by default.
4. **Direction — do M4–M7 need judgment before slice A lands?** The project's own rule says internal checkpoints are not reasons to pause, so work can proceed; what it cannot decide is whether four unjudged milestones make slice A's report a fifth queue item rather than progress. Reopens on a batch judgment or a "don't ask yet".

## Findings the next package must land (defects, not questions)

- **The fail-loud gate covers intents only.** STATUS claims a projectile "fails loud as unimplemented", but `assertCapabilityImplemented` selects on `capability.intent === terminal` (`packages/core/src/compiler/capabilities.ts:59-72`), `compiler/index.ts:572` is its only call site, and `prop.kind: "projectile"` / `support.kind: "hanging"` are validated by zod only (`schemas/libraryMeta.ts:117-160`). No test asserts a projectile compile error (`capabilityContract.test.ts:96-118` is schema-only). So E1's entry condition as recorded does not exist: a projectile prop compiles today and the motor ignores it. This is a `contract` report — the next package should gate on `prop.kind` before writing the projectile.
- **Nothing is staged for me:** `mail/` does not exist at the project root, and `git branch -a` shows no `keep/slice-b` pin named in ART_ASSET_PROGRAM — harmless, because `35bf415` is on `main`.
- **Roadmap authority is split three ways** (`STATUS.md` 176 lines, `ART_PRODUCTION_UPGRADE.md`, `ART_ASSET_PROGRAM.md` 243 lines) and `.scratch/active-work.md` is stale at the M3 era, claiming "no incomplete advance work — next candidates M3 and huashu slices", which contradicts STATUS. Four docs exceed the maintained-Markdown ≤200-line rule (243/219/217/211).

Implemented: nothing — read-only orientation package; no edits made.
Changed files: none (no writes anywhere, including `/tmp`).
Validation: read-only inspection only — `git status -sb` (clean vs `origin/main`), `git log`, `wc -l` over `docs/`, code reads at `capabilities.ts`, `compiler/index.ts:555-590`, `libraryMeta.ts:117-160`, `library/prop/shuttle/manifest.json`, `ls library/{camera,figure,set,prop}`, `ls episodes`; test suite **not** re-run (STATUS's 313/313 is documented, not verified here).
Open risks/questions: projectile gate missing (contract report); ~4 milestones queue at the user gate; ART_ASSET_PROGRAM doc over its own line rule; stale `.scratch/active-work.md`.
Recommended next step: dispatch one package for E1 only (gate `prop.kind: "projectile"` fail-loud first, then projectile state + struck contact + `projectile.struck`/`.settled`, plus `prop/shuttle` physics), and route question 1 (slice B framing) upward as a `direction` report.