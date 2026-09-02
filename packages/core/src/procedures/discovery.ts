import {loadPlugins} from "../plugins";
import {join} from "node:path";
import {access} from "node:fs/promises";
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
      // Members carrying other static data (e.g. cueAssets) are not definitions.
      const record = value as {id?: unknown} | null;
      if (record === null || typeof record !== "object" || record.id !== key) continue;
      definitions[key] = value as unknown as ProcedureDefinition;
    }
  }
  return definitions;
}

export type AudioCueAsset = {kind: "sfx" | "music"; dir: string; file: string};

/**
 * Plugin-owned audio cue assets. Cue audio is handed over by the owning
 * category plugin's static "cueAssets" member; the engine never looks up
 * resource paths by convention.
 */
export async function loadAudioCues(libraryRoot: string): Promise<Record<string, AudioCueAsset>> {
  const plugins = await loadPlugins(libraryRoot);
  const cues: Record<string, AudioCueAsset> = {};
  for (const plugin of plugins) {
    const raw = (plugin.definition.members ?? {} as Record<string, unknown>).cueAssets;
    if (raw === undefined) continue;
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`plugin ${plugin.category} member "cueAssets" must be an object of cue entries`);
    }
    for (const [cue, entry] of Object.entries(raw as Record<string, unknown>)) {
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        throw new Error(`plugin ${plugin.category} cue "${cue}" must be an object with kind and file`);
      }
      const {kind, file} = entry as {kind?: unknown; file?: unknown};
      if ((kind !== "sfx" && kind !== "music") || typeof file !== "string" || !file) {
        throw new Error(`plugin ${plugin.category} cue "${cue}" needs kind (sfx|music) and file`);
      }
      if (cue in cues) throw new Error(`duplicate audio cue "${cue}" in plugin ${plugin.category}`);
      cues[cue] = {kind, dir: join(libraryRoot, plugin.category), file};
    }
  }
  return cues;
}
