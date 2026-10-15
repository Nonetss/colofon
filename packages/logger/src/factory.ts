import pino, { type Logger, type LoggerOptions } from "pino"
import pretty from "pino-pretty"

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace"

export interface CreateLoggerOptions {
  /** Base `service` field attached to every line. */
  service: string
  level: LogLevel
  production: boolean
}

/**
 * Env-agnostic pino factory shared by every service that logs (backend,
 * frontend, ...). Callers pass their own config instead of this module
 * reading it, so it carries no dependency on any particular env schema.
 *
 * Writes to stdout: JSON lines in production, pretty-printed otherwise. The
 * stream is built in-process, never with `pino.transport()`: both apps that
 * use this bundle every dependency into one file with no `node_modules` in
 * the runtime image, which a transport's worker-thread module resolution
 * can't survive.
 */
export function createLogger({
  service,
  level,
  production,
}: CreateLoggerOptions): Logger {
  const options: LoggerOptions = {
    level,
    base: { service },
    timestamp: pino.stdTimeFunctions.isoTime,
  }
  if (production) return pino(options, process.stdout)
  return pino(options, pretty({ colorize: true, translateTime: "HH:MM:ss.l" }))
}
