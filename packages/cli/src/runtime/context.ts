import { createLogger, loadConfig, type AnimConfig, type Logger } from "@anim/core";
import { loadRegistry, type Registry } from "../registry";

/** Everything a stage handler needs: resolved config, logger, adapter registry. */
export interface StageContext {
  config: AnimConfig;
  rootDir: string;
  configSources: string[];
  log: Logger;
  registry: Registry;
}

export interface ContextOptions {
  cwd?: string;
  verbose?: boolean;
}

/**
 * The stage-runner's context loader: reads config (+ local overlay) and loads
 * the adapter registry. Called once per command invocation.
 */
export async function loadContext(opts: ContextOptions = {}): Promise<StageContext> {
  const { config, rootDir, sources } = loadConfig(opts.cwd ?? process.cwd());
  const log = createLogger({ level: opts.verbose ? "debug" : "info" });
  const registry = await loadRegistry();
  return { config, rootDir, configSources: sources, log, registry };
}

/** Thrown by stages owned by another workstream that are not built yet. */
export class NotImplementedError extends Error {
  constructor(
    readonly stage: string,
    readonly owner: string,
  ) {
    super(`stage "${stage}" is not implemented yet — it is owned by ${owner}.`);
    this.name = "NotImplementedError";
  }
}

/** Mark a command whose implementation belongs to another package/workstream. */
export function notImplemented(stage: string, owner: string): never {
  throw new NotImplementedError(stage, owner);
}
