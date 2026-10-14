import { z } from "zod"

import { paginationLimit } from "#shared/pagination"
import { traceIdSchema } from "#shared/trace-id"

/**
 * What a trace can touch: the services that export spans (the logger's
 * `service` values) and the database their queries reach.
 */
export const TRACE_SERVICES = ["frontend", "backend", "postgresql"] as const

/** A root span name, as `traces.rootNames` lists them. Control characters
 *  can't be written in a TraceQL string. */
const rootName = z
  .string()
  .min(1)
  .max(500)
  .regex(/^[^\p{Cc}]*$/u, "Invalid root span name")

export const tracesInput = {
  search: z.object({
    services: z
      .array(z.enum(TRACE_SERVICES))
      .optional()
      .describe(
        "Keep only traces that touch any of these: a service with a span in the trace, or `postgresql` for a trace that queried the database; omitted or empty keeps all"
      ),
    errorsOnly: z
      .boolean()
      .optional()
      .describe("Keep only traces with at least one span in error status"),
    minDurationMs: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Keep only traces lasting at least this many milliseconds"),
    names: z
      .array(rootName)
      .max(200)
      .optional()
      .describe(
        "Keep only traces whose root span has any of these exact names (from traces.rootNames); omitted or empty keeps all"
      ),
    /** ISO timestamp lower bound. Defaults to 24 hours ago. */
    from: z.iso.datetime({ offset: true }).optional(),
    /** ISO timestamp upper bound. Defaults to now. */
    to: z.iso.datetime({ offset: true }).optional(),
    /** The previous page's `nextCursor`: the start (Unix nanoseconds) and
     *  hex id of its oldest trace. The next page holds the traces strictly
     *  older than it, so it narrows `to`. */
    cursor: z
      .string()
      .regex(/^\d{1,30}-[0-9a-f]{32}$/, "Invalid pagination cursor")
      .nullish()
      .describe(
        "Opaque pagination cursor from a previous response's nextCursor; omit for the first page"
      ),
    limit: paginationLimit(50, 200),
  }),
  rootNames: z.object({
    /** ISO timestamp lower bound. Defaults to 24 hours ago. */
    from: z.iso.datetime({ offset: true }).optional(),
    /** ISO timestamp upper bound. Defaults to now. */
    to: z.iso.datetime({ offset: true }).optional(),
  }),
  get: z.object({
    traceId: traceIdSchema,
  }),
}
