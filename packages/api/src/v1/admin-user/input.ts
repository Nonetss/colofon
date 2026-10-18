import { z } from "zod"

import { paginationLimit, sortedPaginationCursor } from "#shared/pagination"
import { searchQuery } from "#shared/search"

/** Orderings of the admin user list; `createdAt` is the natural order. */
const ADMIN_USER_SORT_KEYS = [
  "name",
  "email",
  "role",
  "banned",
  "createdAt",
] as const

export type AdminUserSortKey = (typeof ADMIN_USER_SORT_KEYS)[number]

/** `admin` is the administrator role; every other role (or none) is `user`. */
export const ADMIN_USER_ROLES = ["admin", "user"] as const

export const ADMIN_USER_STATUSES = ["active", "banned"] as const

export const adminUserInput = {
  list: z.object({
    ids: z
      .array(z.string().min(1))
      .optional()
      .describe("Keep only these users; omitted or empty keeps every user"),
    search: searchQuery()
      .optional()
      .describe(
        "Keep only users whose name or email contains this text, ignoring case (min 2 characters)"
      ),
    roles: z
      .array(z.enum(ADMIN_USER_ROLES))
      .optional()
      .describe(
        "Keep only administrators (`admin`) or the rest (`user`); omitted, empty or both keeps every user"
      ),
    statuses: z
      .array(z.enum(ADMIN_USER_STATUSES))
      .optional()
      .describe(
        "Keep only active or banned users; omitted, empty or both keeps every user"
      ),
    sort: z
      .enum(ADMIN_USER_SORT_KEYS)
      .default("createdAt")
      .describe(
        "Ordering: name, email, role, ban state or creation time; ties fall back to the user id"
      ),
    order: z
      .enum(["asc", "desc"])
      .default("desc")
      .describe("Direction of the ordering"),
    limit: paginationLimit(25, 100),
    cursor: sortedPaginationCursor(),
  }),
}
