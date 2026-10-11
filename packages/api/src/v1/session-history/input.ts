import { z } from "zod"

import { paginationLimit, sortedPaginationCursor } from "#shared/pagination"

/** Orderings of the session history; `createdAt` is the natural order. */
export const SESSION_SORT_KEYS = [
  "createdAt",
  "expiresAt",
  "ipAddress",
  "user",
  "status",
] as const

/** A session is `active` until it expires. */
export const SESSION_STATUSES = ["active", "expired"] as const

export type SessionSortKey = (typeof SESSION_SORT_KEYS)[number]

export const sessionHistoryInput = {
  list: z.object({
    sort: z
      .enum(SESSION_SORT_KEYS)
      .default("createdAt")
      .describe(
        "Ordering of the sessions: start time, expiration time, IP address, the user's name or status (active first when ascending); sessions without a value come last and ties fall back to the session id"
      ),
    order: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("Direction of the ordering"),
    statuses: z
      .array(z.enum(SESSION_STATUSES))
      .optional()
      .describe(
        "Keep only active (not yet expired) or expired sessions; omitted, empty or both keeps every session"
      ),
    userIds: z
      .array(z.string().min(1))
      .optional()
      .describe("Keep only these users' sessions; omitted or empty keeps all"),
    limit: paginationLimit(25, 100),
    cursor: sortedPaginationCursor(),
  }),
}
