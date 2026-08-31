/**
 * Minimal structured logger. Writes human lines to stderr (so stdout stays
 * clean for machine-readable stage output). No wall-clock in messages by
 * default — determinism-sensitive stages log via this without timestamps.
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  /** Derive a child logger that prefixes a stage name. */
  stage(name: string): Logger;
}

export interface LoggerOptions {
  level?: LogLevel;
  prefix?: string;
  /** Sink for testing; defaults to stderr. */
  write?: (line: string) => void;
}

export function createLogger(opts: LoggerOptions = {}): Logger {
  const level = opts.level ?? "info";
  const prefix = opts.prefix ?? "";
  const write = opts.write ?? ((line: string) => process.stderr.write(line + "\n"));

  const emit = (lvl: LogLevel, msg: string, fields?: Record<string, unknown>): void => {
    if (ORDER[lvl] < ORDER[level]) return;
    const tag = prefix ? `[${prefix}] ` : "";
    const extra = fields && Object.keys(fields).length ? " " + JSON.stringify(fields) : "";
    write(`${lvl.toUpperCase().padEnd(5)} ${tag}${msg}${extra}`);
  };

  return {
    debug: (m, f) => emit("debug", m, f),
    info: (m, f) => emit("info", m, f),
    warn: (m, f) => emit("warn", m, f),
    error: (m, f) => emit("error", m, f),
    stage(name: string): Logger {
      return createLogger({ level, prefix: prefix ? `${prefix}:${name}` : name, write });
    },
  };
}
