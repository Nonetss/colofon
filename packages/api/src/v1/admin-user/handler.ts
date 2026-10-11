import { db } from "@nonete/db"
import { user } from "@nonete/db/schema/auth"
import {
  and,
  count,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  type SQL,
  type SQLWrapper,
  sql,
} from "drizzle-orm"
import type { z } from "zod"

import type { Context } from "#context"
import { toIso, toIsoOrNull } from "#shared/dates"
import { paginate, sortedCursor } from "#shared/pagination"
import { likePattern } from "#shared/search"
import { cursorFor, sortedKeyset } from "#shared/sorted-keyset"
import type {
  ADMIN_USER_ROLES,
  ADMIN_USER_STATUSES,
  AdminUserSortKey,
  adminUserInput,
} from "#v1/admin-user/input"

type AdminUserRole = (typeof ADMIN_USER_ROLES)[number]
type AdminUserStatus = (typeof ADMIN_USER_STATUSES)[number]

/** The expression each ordering sorts by; ties fall back to the user id. */
const SORT_COLUMNS = {
  name: user.name,
  email: user.email,
  role: user.role,
  banned: sql`coalesce(${user.banned}, false)`,
  createdAt: user.createdAt,
} satisfies Record<AdminUserSortKey, SQLWrapper>

function idFilter(ids: readonly string[] | undefined): SQL | undefined {
  if (!ids || ids.length === 0) return undefined
  return inArray(user.id, [...ids])
}

/** Name or email containing the term, ignoring case. */
function searchFilter(search: string | undefined): SQL | undefined {
  if (!search) return undefined
  const pattern = likePattern(search)
  return or(ilike(user.name, pattern), ilike(user.email, pattern))
}

/** Only one of the two roles filters; both or none keep every user. */
function roleFilter(
  roles: readonly AdminUserRole[] | undefined
): SQL | undefined {
  if (roles?.length !== 1) return undefined
  if (roles[0] === "admin") return eq(user.role, "admin")
  return or(isNull(user.role), ne(user.role, "admin"))
}

/** Only one of the two statuses filters; both or none keep every user. */
function statusFilter(
  statuses: readonly AdminUserStatus[] | undefined
): SQL | undefined {
  if (statuses?.length !== 1) return undefined
  if (statuses[0] === "banned") return eq(user.banned, true)
  return or(isNull(user.banned), eq(user.banned, false))
}

export const adminUserHandler = {
  /**
   * The administrator user list, filtered by a name-or-email search, ids,
   * role and ban state,
   * ordered by the caller's column and paged with a sorted cursor for
   * infinite scrolling; `total` counts every user the filters keep.
   */
  list: async ({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof adminUserInput.list>
  }) => {
    void context
    // Before any read: resuming one ordering from another's cursor would
    // skip or repeat rows.
    const cursor = cursorFor(input.cursor, input.sort, input.order, 1)
    const keyset = sortedKeyset({
      primary: SORT_COLUMNS[input.sort],
      order: input.order,
      tiebreak: [user.id],
    })
    const filters = and(
      searchFilter(input.search),
      idFilter(input.ids),
      roleFilter(input.roles),
      statusFilter(input.statuses)
    )

    const [rows, countRows] = await Promise.all([
      db
        .select({ user, sortValue: keyset.sortValue })
        .from(user)
        .where(and(filters, keyset.after(cursor)))
        .orderBy(...keyset.orderBy)
        .limit(input.limit + 1),
      db.select({ total: count() }).from(user).where(filters),
    ])
    const { page, hasMore, lastRow } = paginate(rows, input.limit)

    return {
      users: page.map(({ user: row }) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        emailVerified: row.emailVerified,
        image: row.image,
        role: row.role,
        banned: row.banned === true,
        banReason: row.banReason,
        banExpires: toIsoOrNull(row.banExpires),
        createdAt: toIso(row.createdAt),
        updatedAt: toIso(row.updatedAt),
      })),
      total: countRows[0]?.total ?? 0,
      nextCursor: nextCursorOf(hasMore, lastRow, input),
    }
  },
}

function nextCursorOf(
  hasMore: boolean,
  lastRow: { user: { id: string }; sortValue: string | null } | undefined,
  input: { sort: AdminUserSortKey; order: "asc" | "desc" }
): string | null {
  if (!hasMore || !lastRow) return null
  return sortedCursor.encode({
    k: input.sort,
    o: input.order,
    p: lastRow.sortValue,
    t: [lastRow.user.id],
  })
}
