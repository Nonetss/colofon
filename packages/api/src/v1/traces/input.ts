import { z } from "zod"

import { paginationLimit } from "#shared/pagination"
import { traceIdSchema } from "#shared/trace-id"

/** Services that export spans: the logger's `service` values. */
export const TRACE_SERVICES = ["stack-backend", "stack-frontend"] as const

export const tracesInput = {
  search: z.object({
    service: z
      .enum(TRACE_SERVICES)
      .optional()
      .describe("Keep only traces whose root span is from this service"),
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
      .optional()
      .describe(
        "Keep only traces whose root span name contains this text, ignoring case"
      ),
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
