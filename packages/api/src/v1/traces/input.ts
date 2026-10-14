import { z } from "zod"

import { paginationLimit } from "#shared/pagination"
import { traceIdSchema } from "#shared/trace-id"

/**
 * What a trace can touch: the services that export spans (the logger's
 * `service` values) and the database their queries reach.
 */
export const TRACE_SERVICES = [
  "stack-frontend",
  "stack-backend",
  "postgresql",
] as const

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
    /** ISO timestamp lower bound. Defaults to 24 hours ago. */
    from: z.iso.datetime({ offset: true }).optional(),
    /** ISO timestamp upper bound. Defaults to now. */
    to: z.iso.datetime({ offset: true }).optional(),
    limit: paginationLimit(50, 200),
  }),
  get: z.object({
    traceId: traceIdSchema,
  }),
}
