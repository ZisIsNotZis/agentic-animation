import type {Invocation, LoadedPlugin, World} from "./types";

/** Duration tolerance when checking yielded time against a blocking descriptor. */
const DURATION_EPSILON = 1e-6;

/**
 * Evaluate one brace expression as real JavaScript against the given scope.
 * Fails closed: unknown identifiers become runtime ReferenceErrors naming the
 * expression, which callers wrap with episode location context.
 */
export function evaluateExpression(expression: string, scope: Record<string, unknown>): unknown {
  const keys = Object.keys(scope);
  const values = Object.values(scope);
  // Non-strict function constructor: identifiers resolve through the scope params.
  const factory = new Function(...keys, `"use strict";\nreturn (${expression});`);
  return factory(...values);
}

export class InvocationRunError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvocationRunError";
  }
}

export type SyncRunResult = {elapsedSec: number; steps: number};

/**
 * Synchronously drive an invocation body with a virtual clock: each yield
 * advances invocation-local time by the yielded seconds (engine step when
 * undefined). Helpers have already written their track events at expansion
 * time, so this pass validates structure and measures elapsed time.
 *
 * Cancellation before completion runs finally blocks via iterator .return().
 * The world's `invocation` field carries local time for helpers.
 */
export function runInvocationSync(
  descriptor: Invocation,
  world: World,
  info: {id: string; category: string; asset: string},
): SyncRunResult {
  if (typeof descriptor.run !== "function") {
    throw new InvocationRunError(`${info.category}.${info.asset}: descriptor has no run()`);
  }
  const durationSec = descriptor.durationSec ?? null;
  world.invocation = {id: info.id, category: info.category, asset: info.asset, localSec: 0, durationSec};
  const iterator = descriptor.run(world);
  let elapsedSec = 0;
  let steps = 0;
  let completed = false;
  try {
    let next = iterator.next();
    while (!next.done) {
      steps++;
      const step = typeof next.value === "number" && Number.isFinite(next.value) && next.value > 0
        ? next.value
        : defaultStep(world);
      elapsedSec += step;
      if (world.invocation) world.invocation.localSec = elapsedSec;
      next = iterator.next();
    }
    completed = true;
  } catch (error) {
    throw new InvocationRunError(`${info.category}.${info.asset} failed at local ${elapsedSec.toFixed(3)}s: ${(error as Error).message}`);
  } finally {
    if (!completed) iterator.return?.();
    if (world.invocation?.id === info.id) delete world.invocation;
  }
  if (durationSec !== null && Math.abs(elapsedSec - durationSec) > DURATION_EPSILON) {
    throw new InvocationRunError(
      `${info.category}.${info.asset}: body elapsed ${elapsedSec.toFixed(3)}s but descriptor declares durationSec ${durationSec}`,
    );
  }
  return {elapsedSec, steps};
}

function defaultStep(world: World): number {
  return 1 / (world.fps || 24);
}

/** Build the evaluation scope: instance handles + plugin namespace exports. */
export function buildScope(instances: Record<string, unknown>, plugins: readonly LoadedPlugin[]): Record<string, unknown> {
  const scope: Record<string, unknown> = {...instances};
  for (const plugin of plugins) scope[plugin.category] = plugin.namespace;
  return scope;
}
