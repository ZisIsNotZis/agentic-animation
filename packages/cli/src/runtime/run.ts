import type { Command } from "commander";
import { createLogger } from "@anim/core";
import { loadContext, NotImplementedError, type StageContext } from "./context";

/**
 * Wrap a stage handler as a commander action: build the StageContext, run the
 * handler, and turn any error into a clean message + non-zero exit. Keeps every
 * command's error handling identical and names the failing stage.
 */
export function stage(
  name: string,
  handler: (ctx: StageContext) => Promise<void> | void,
): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    // commander passes the Command as the last action argument.
    const command = args[args.length - 1] as Command;
    const globals = (command.optsWithGlobals?.() ?? {}) as { verbose?: boolean; cwd?: string };
    let ctx: StageContext | undefined;
    try {
      ctx = await loadContext({ verbose: globals.verbose, cwd: globals.cwd });
      await handler(ctx);
    } catch (err) {
      const log = ctx?.log ?? createLogger({});
      if (err instanceof NotImplementedError) {
        log.error(`${name}: ${err.message}`);
        log.error(`This stage arrives with the ${err.owner} workstream.`);
      } else {
        log.error(`${name} failed: ${(err as Error).message}`);
        if (globals.verbose && (err as Error).stack) log.debug((err as Error).stack!);
      }
      process.exitCode = 1;
    }
  };
}
