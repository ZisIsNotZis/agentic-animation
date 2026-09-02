// set category plugin. Owns the category's whole-world behavior and its
// procedure/asset semantics; discovered via docs/WORLD_PLUGIN_CONTRACT.md.
// Members are the category's static procedure definitions, keyed by
// fully-qualified category call (e.g. "action.slam"). Identity is the path.
const definitions = {};

export default {
  run(world, invocation, frameContext) {
    // Per-frame category behavior. State lives in world.plugins["set"].
    return world;
  },
  members: definitions,
};
