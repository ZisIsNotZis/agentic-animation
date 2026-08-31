/**
 * Remotion CLI config — used only for local preview (`npx remotion studio
 * src/remotion/index.tsx`). Programmatic renders go through the
 * renderer-remotion adapter and do not read this file.
 */
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("png");
Config.overrideWebpackConfig((c) => c);
