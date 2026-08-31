/**
 * @anim/studio — public surface. This barrel is intentionally *pure Node* (no
 * React / JSX): it is imported by the renderer adapter and CLI, both typechecked
 * by the root tsconfig which has no DOM lib. The Remotion compositions live
 * under `src/remotion` + `src/components` and are reached only by the bundler
 * via the `./remotion-entry` package export, never by a TypeScript import here.
 */
export const STUDIO_PACKAGE = "@anim/studio";

/** Fixed design space (ARCHITECTURE §9); the compositions read the build's own. */
export const DESIGN = { width: 1920, height: 1080, fps: 24 } as const;

/** Set + fx vocabularies the placeholder runtime knows how to draw. The style
 *  workstream should list these in `library/style/catalog.json` so board
 *  validate can check storyboard set/fx names. */
export const SUPPORTED_SETS = ["void", "interior", "exterior", "sky", "river", "forest"] as const;
export const SUPPORTED_FX = ["fade", "title", "glow", "flash"] as const;

export * from "./performance";
