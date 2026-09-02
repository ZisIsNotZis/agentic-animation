// prop category plugin (docs/WORLD_PLUGIN_CONTRACT.md): namespace of resource factories.
import { handover } from "./handover/index.js";
import { pickup } from "./pickup/index.js";
import { putdown } from "./putdown/index.js";

export default {
  handover,
  pickup,
  putdown
};