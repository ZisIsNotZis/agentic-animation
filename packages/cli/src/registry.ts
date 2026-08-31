/**
 * THE SINGLE ADAPTER REGISTRATION POINT (ARCHITECTURE §14).
 *
 * Every adapter package is loaded here — by its FIXED package name — inside a
 * try/catch, so a missing or broken adapter degrades to a `doctor` warning
 * instead of crashing the CLI. NO OTHER FILE may register an adapter; parallel
 * workstreams must not edit this file. All adapters are imported now so the set
 * is frozen for the swarm.
 *
 * Each adapter package default-exports an `AdapterRegistration` — the
 * `{ kind, adapter }` discriminated union defined in `@anim/core`.
 */
import type { AdapterKind, AdapterRegistration, AnyAdapter, Check, Doctorable } from "@anim/core";

/** Fixed package names — the complete adapter set (ARCHITECTURE §5). */
export const ADAPTER_PACKAGES = [
  "@anim/adapter-tts-kokoro",
  "@anim/adapter-tts-dir",
  "@anim/adapter-tts-say",
  "@anim/adapter-tts-espeak",
  "@anim/adapter-tts-edge",
  "@anim/adapter-lipsync-rhubarb",
  "@anim/adapter-music-raga",
  "@anim/adapter-imagegen-comfyui",
  "@anim/adapter-corpus-hindu-timeline",
  "@anim/adapter-renderer-remotion",
] as const;

export interface LoadedAdapter {
  pkg: string;
  kind: AdapterKind;
  adapter: AnyAdapter;
}

export interface AdapterProblem {
  pkg: string;
  error: string;
}

export interface Registry {
  adapters: LoadedAdapter[];
  problems: AdapterProblem[];
  /** All successfully-loaded adapters as Doctorables (for `anim doctor`). */
  doctorables(): Doctorable[];
  /** Find an adapter by kind + id, or undefined. */
  find(kind: AdapterKind, id: string): AnyAdapter | undefined;
  /** Select an adapter by kind + id or throw a descriptive error. */
  require(kind: AdapterKind, id: string): AnyAdapter;
}

function isRegistration(v: unknown): v is AdapterRegistration {
  return (
    typeof v === "object" &&
    v !== null &&
    "kind" in v &&
    "adapter" in v &&
    typeof (v as { adapter?: unknown }).adapter === "object"
  );
}

/** Dynamically load every adapter package; capture per-package failures. */
export async function loadRegistry(): Promise<Registry> {
  const adapters: LoadedAdapter[] = [];
  const problems: AdapterProblem[] = [];

  for (const pkg of ADAPTER_PACKAGES) {
    try {
      const mod: unknown = await import(pkg);
      const reg = (mod as { default?: unknown }).default;
      if (!isRegistration(reg)) {
        problems.push({
          pkg,
          error: `default export is not an AdapterRegistration { kind, adapter }`,
        });
        continue;
      }
      adapters.push({ pkg, kind: reg.kind, adapter: reg.adapter });
    } catch (err) {
      problems.push({ pkg, error: (err as Error).message });
    }
  }

  const find = (kind: AdapterKind, id: string): AnyAdapter | undefined =>
    adapters.find((a) => a.kind === kind && a.adapter.id === id)?.adapter;

  return {
    adapters,
    problems,
    doctorables(): Doctorable[] {
      return adapters.map((a) => a.adapter);
    },
    find,
    require(kind, id) {
      const found = find(kind, id);
      if (found) return found;
      const available = adapters
        .filter((a) => a.kind === kind)
        .map((a) => a.adapter.id)
        .join(", ") || "(none loaded)";
      const problem = problems.length
        ? ` Adapters that failed to load: ${problems.map((p) => p.pkg).join(", ")}.`
        : "";
      throw new Error(
        `No ${kind} adapter with id "${id}" is registered. Available ${kind} adapters: ${available}.${problem}\n` +
          `Check anim.config.json's "adapters.${kind}" and that the adapter package builds.`,
      );
    },
  };
}

/** Turn adapter load failures into failed doctor checks. */
export function problemChecks(problems: AdapterProblem[]): Check[] {
  return problems.map((p) => ({
    name: `adapter ${p.pkg}`,
    ok: false,
    detail: `failed to load: ${p.error}`,
    fix: `Ensure ${p.pkg} builds and default-exports an AdapterRegistration. Run 'npm install'.`,
  }));
}
