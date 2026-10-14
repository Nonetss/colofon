import { z } from "zod"

const logEntry = z.object({
  timestamp: z.string(),
  level: z.string(),
  service: z.string(),
  type: z.enum(["page_view", "api_call"]),
  message: z.string(),
  userId: z.string().nullable(),
  /** The user's email when the line was logged, so entries stay readable
   * after that user is deleted. */
  email: z.string().nullable(),
  path: z.string().nullable(),
  method: z.string().nullable(),
  statusCode: z.number().nullable(),
  /** The trace the line was written in (`/admin/traces/<traceId>`), or
   * `null` when tracing was off or the trace wasn't sampled. */
  traceId: z.string().nullable(),
  /** Everything else pino attached to the line, for the expandable
   * "raw payload" view. */
  raw: z.record(z.string(), z.unknown()),
})

export const logsOutput = {
  query: z.object({
    entries: z.array(logEntry),
    /** Opaque cursor (the last entry's Loki nanosecond timestamp) for the
     * next page's `cursor` input; `null` when no entries follow. */
    nextCursor: z.string().nullable(),
  }),
}
