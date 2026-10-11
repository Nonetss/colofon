import { z } from "zod"

import { paginationLimit } from "#shared/pagination"

export const logsInput = {
  query: z.object({
    userId: z.string().optional(),
    type: z.enum(["page_view", "api_call"]).optional(),
    /** Substring match against the logged path. */
    path: z.string().optional(),
    /** HTTP verb — only meaningful for `api_call` entries. */
    method: z
      .enum(["GET", "QUERY", "POST", "PUT", "PATCH", "DELETE"])
      .optional(),
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
