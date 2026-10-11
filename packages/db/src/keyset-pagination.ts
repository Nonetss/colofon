import {
  type AnyColumn,
  and,
  asc,
  desc,
  eq,
  gt,
  lt,
  or,
  type SQL,
} from "drizzle-orm"
import type { PgSelect } from "drizzle-orm/pg-core"

export type KeysetDirection = "asc" | "desc"

/** The ordering and the "strictly past this value" comparison of one
 *  direction, so the cursor condition always follows the `orderBy`. */
const DIRECTIONS = {
  desc: { order: desc, past: lt },
  asc: { order: asc, past: gt },
} satisfies Record<KeysetDirection, unknown>

export function withKeysetPagination<T extends PgSelect>(
  qb: T,
  opts: {
    orderColumns: [AnyColumn, AnyColumn]
    cursor?: { timestamp: Date; id: string }
    filters?: (SQL | undefined)[]
    limit: number
    /** `desc` (newest first) unless the caller asks for `asc`. */
    direction?: KeysetDirection
  }
) {
  const [timestampColumn, idColumn] = opts.orderColumns
  const { order, past } = DIRECTIONS[opts.direction ?? "desc"]
  const conditions = (opts.filters ?? []).filter(
    (filter): filter is SQL => filter !== undefined
  )

  if (opts.cursor) {
    const { timestamp, id } = opts.cursor
    const cursorCondition = or(
      past(timestampColumn, timestamp),
      and(eq(timestampColumn, timestamp), past(idColumn, id))
    )
    if (cursorCondition) {
      conditions.push(cursorCondition)
    }
  }

  return qb
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(order(timestampColumn), order(idColumn))
    .limit(opts.limit)
}
