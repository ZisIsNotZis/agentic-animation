/**
 * Remotion bundle entry — the file the renderer adapter points `bundle()` at
 * (resolved via the `@anim/studio/remotion-entry` package export). It only
 * registers the root; all logic lives in the composition tree.
 */
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
