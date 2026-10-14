import { z } from "zod"

import { paginationLimit } from "#shared/pagination"
import { traceIdSchema } from "#shared/trace-id"

/**
 * What a trace can touch: the services that export spans (the logger's
 * `service` values) and the database their queries reach.
 */
export const TRACE_SERVICES = ["frontend", "backend", "postgresql"] as const

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
    name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[^\p{Cc}]*$/u, "Invalid name filter")
      .optional()
      .describe(
        "Keep only traces whose root span name contains this text, ignoring case"
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
  get: z.object({
    traceId: traceIdSchema,
  }),
}
