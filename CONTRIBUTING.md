# Contributing

This is a working engine with a real art pipeline behind it. Contributions are
welcome where they keep the canonical path intact: `episode.yml` in, performance
IR out, Remotion renders it.

The full rules live in
[`docs/9_REPOSITORY_MAINTENANCE.md`](docs/9_REPOSITORY_MAINTENANCE.md) and the
document precedence in [`docs/INDEX.md`](docs/INDEX.md). This file is the short
version.

## Scope

- In: the `packages/` engine, `library/` assets and category plugins, the motor,
  the Remotion renderer, adapters, tools and docs.
- Out until asked for: a second DSL or puppet runtime, a broad rewrite for its
  own sake, external paid generation services, finished commercial episodes.

## Set up and run the checks

```sh
npm install
bash tools/setup.sh          # toolchain check, uv, optional services
npm run typecheck
npm test                     # docs lint + unit tests
npm run test:all             # adds packages/adapters/* tests
npm run anim -- doctor
```

There is no CI. The gate is those commands run locally on the machine that
changed the tree, plus `npm run smoke` when the YAML path is touched. Say exactly
what you ran; a skipped test or a build is not visual QA.

## Pull requests

- One scoped change. Preserve unrelated work in the tree.
- If public behaviour changes, update the owning document in `docs/` in the same
  change — `npm run docs:lint` checks structure and every relative link.
- Add a focused test for a mechanism, or measured evidence (a still, a
  `performance.json` measurement, a command transcript) for an art change.
  `evidence/` holds captures; it never overrides a level document.
- Never commit generated manifests, audio, images or video except the episode
  delivery `dist/*.mp4` files the `.gitignore` explicitly allows, and never commit
  secrets or `anim.config.local.json`.
- No history rewrites and no force-pushes on shared branches.

## Issues

Include the command you ran, the environment (`npm run anim -- doctor` output),
the input (`episode.yml` or asset path), the log, and any QA artifact. A
reproducible bug plus a failing check is the fastest path to a fix. Design
questions are fine as issues; the person's decision, once given, is recorded in
`docs/0_ROADMAP.md`.
