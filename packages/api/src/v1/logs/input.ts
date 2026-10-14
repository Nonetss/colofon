import { z } from "zod"

import { paginationLimit } from "#shared/pagination"
import { traceIdSchema } from "#shared/trace-id"

export const LOG_TYPES = ["page_view", "api_call"] as const

export const LOG_METHODS = [
  "GET",
  "QUERY",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
] as const

/** HTTP status classes an entry can be filtered by. */
export const LOG_STATUS_CLASSES = ["2xx", "3xx", "4xx", "5xx"] as const

export const logsInput = {
  query: z.object({
    userIds: z
      .array(z.string().min(1))
      .optional()
      .describe("Keep only these users' entries; omitted or empty keeps all"),
    types: z
      .array(z.enum(LOG_TYPES))
      .optional()
      .describe(
        "Keep only page views, API calls or both; omitted or empty keeps all"
      ),
    /** Substring match against the logged path. */
    path: z.string().optional(),
    traceId: traceIdSchema
      .optional()
      .describe("Keep only entries written inside this trace"),
    methods: z
      .array(z.enum(LOG_METHODS))
      .optional()
      .describe(
        "Keep only entries with these HTTP verbs; omitted or empty keeps all"
      ),
    statuses: z
      .array(z.enum(LOG_STATUS_CLASSES))
      .optional()
      .describe(
        "Keep only entries whose response status is in these classes (2xx, 3xx, 4xx, 5xx); omitted or empty keeps all"
      ),
    /** ISO timestamp lower bound. Defaults to 7 days ago. */
    from: z.string().optional(),
    /** ISO timestamp upper bound, exclusive. Defaults to now. */
    to: z.string().optional(),
    order: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("Direction by time: desc (newest first, the default) or asc"),
    /** The previous page's `nextCursor`: a Loki nanosecond timestamp. The
     * next page holds the entries strictly past it in `order`, so it takes
     * precedence over `to` (desc) or `from` (asc). */
    cursor: z
      .string()
      .regex(/^\d{1,30}$/, "Invalid pagination cursor")
      .nullish()
      .describe(
        "Opaque pagination cursor from a previous response's nextCursor, valid only with the same order; omit for the first page"
      ),
    limit: paginationLimit(50, 200),
  }),
}
