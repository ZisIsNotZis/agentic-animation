// music category plugin (docs/WORLD_PLUGIN_CONTRACT.md): the namespace is
// enumerated from this category's child resources at load time.
import { enumerateCueAssets, enumerateResources } from "@anim/core/stdlib";

export default {
  ...(await enumerateResources(import.meta.url)),
  cueAssets: enumerateCueAssets(import.meta.url, "music"),
};
