import {loadPlugins} from "../plugins";
import type {ProcedureCatalog, ProcedureDefinition} from "./resolver";

/**
 * Filesystem-discovered procedure definitions: every category plugin's static
 * members keyed by fully-qualified category call. There is no TS-authored
 * catalog; library/<category>/plugin.js is the only source of semantics.
 */
export async function loadProcedureDefinitions(libraryRoot: string): Promise<ProcedureCatalog> {
  const plugins = await loadPlugins(libraryRoot);
  const definitions: Record<string, ProcedureDefinition> = {};
  for (const plugin of plugins) {
    for (const [key, value] of Object.entries(plugin.definition.members ?? {})) {
      if (typeof value === "function") continue;
      definitions[key] = value as unknown as ProcedureDefinition;
    }
  }
  return definitions;
}
