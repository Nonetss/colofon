import { db } from "@nonete/db"
import { session, user } from "@nonete/db/schema/auth"
import {
  and,
  count,
  eq,
  gt,
  inArray,
  lte,
  type SQL,
  type SQLWrapper,
  sql,
} from "drizzle-orm"
import type { z } from "zod"

import type { Context } from "#context"
import { toIso } from "#shared/dates"
import { paginate, sortedCursor } from "#shared/pagination"
import { cursorFor, sortedKeyset } from "#shared/sorted-keyset"
import type {
  SESSION_STATUSES,
  SessionSortKey,
  sessionHistoryInput,
} from "#v1/session-history/input"

/** The expression each ordering sorts by; ties fall back to the session id.
 *  `status` ranks sessions still valid (0) before expired ones (1). */
const SORT_COLUMNS = {
  createdAt: session.createdAt,
  expiresAt: session.expiresAt,
  ipAddress: session.ipAddress,
  user: user.name,
  status: sql`case when ${session.expiresAt} > now() then 0 else 1 end`,
} satisfies Record<SessionSortKey, SQLWrapper>

type SessionStatus = (typeof SESSION_STATUSES)[number]

/** Only one of the two statuses filters; both or none keep every session. */
function statusFilter(
  statuses: readonly SessionStatus[] | undefined
): SQL | undefined {
  if (statuses?.length !== 1) return undefined
  if (statuses[0] === "active") return gt(session.expiresAt, sql`now()`)
  return lte(session.expiresAt, sql`now()`)
}

function userFilter(userIds: readonly string[] | undefined): SQL | undefined {
  if (!userIds || userIds.length === 0) return undefined
  return inArray(session.userId, [...userIds])
}

export const sessionHistoryHandler = {
  list: async ({
    context,
    input,
  }: {
    context: Context
    input: z.infer<typeof sessionHistoryInput.list>
  }) => {
    void context
    // Before any read: resuming one ordering from another's cursor would
    // skip or repeat rows.
    const cursor = cursorFor(input.cursor, input.sort, input.order, 1)
    const keyset = sortedKeyset({
      primary: SORT_COLUMNS[input.sort],
      order: input.order,
      tiebreak: [session.id],
    })
    const filters = and(statusFilter(input.statuses), userFilter(input.userIds))

    const [rows, countRows] = await Promise.all([
      db
        .select({
          session,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
          },
          sortValue: keyset.sortValue,
        })
        .from(session)
        .leftJoin(user, eq(session.userId, user.id))
        .where(and(filters, keyset.after(cursor)))
        .orderBy(...keyset.orderBy)
        .limit(input.limit + 1),
      db.select({ total: count() }).from(session).where(filters),
    ])
    const total = countRows[0]?.total ?? 0
    const { page, hasMore, lastRow } = paginate(rows, input.limit)

    const sessions = []
    for (const row of page) {
      if (!row.user) continue
      sessions.push({
        id: row.session.id,
        userId: row.session.userId,
        user: row.user,
        ipAddress: row.session.ipAddress,
        userAgent: row.session.userAgent,
        createdAt: toIso(row.session.createdAt),
        updatedAt: toIso(row.session.updatedAt),
        expiresAt: toIso(row.session.expiresAt),
        impersonatedBy: row.session.impersonatedBy,
        activeOrganizationId: row.session.activeOrganizationId,
        activeTeamId: row.session.activeTeamId,
      })
    }

    return {
      sessions,
      total,
      nextCursor: nextCursorOf(hasMore, lastRow, input),
    }
  },
}

function nextCursorOf(
  hasMore: boolean,
  lastRow: { session: { id: string }; sortValue: string | null } | undefined,
  input: { sort: SessionSortKey; order: "asc" | "desc" }
): string | null {
  if (!hasMore || !lastRow) return null
  return sortedCursor.encode({
    k: input.sort,
    o: input.order,
    p: lastRow.sortValue,
    t: [lastRow.session.id],
  })
}
