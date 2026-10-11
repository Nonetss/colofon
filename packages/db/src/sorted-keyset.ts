import { and, asc, desc, or, type SQL, type SQLWrapper, sql } from "drizzle-orm"

/**
 * Keyset pagination over a caller-chosen ordering: one primary expression in
 * either direction, missing values (`NULL`) last both ways, then a fixed
 * tiebreak — the list's own default order, every column in one direction
 * (`tiebreakOrder`, ascending by default), ending in a unique id — so the
 * order is total and a cursor can resume from any row.
 *
 * The cursor carries the primary value as Postgres renders it as text
 * (`sortValue`) and the tiebreak values as text or numbers the row returned;
 * both go back as untyped parameters, which Postgres reads with the type of
 * the expression they're compared to. That keeps `timestamp` and `bigint`
 * keys exact without a JS round trip through `Date` or `number`.
 *
 * Pure Drizzle, so `packages/cron` can page with it without depending on the
 * API layer; the API checks a cursor against the request with `cursorFor`.
 */

export type SortOrder = "asc" | "desc"

export type SortedCursorPosition = {
  /** The row's primary value as text, `null` when it has none. */
  p: string | null
  /** The row's tiebreak values, in tiebreak order. */
  t: readonly (string | number)[]
}

export type SortedCursor = SortedCursorPosition & { k: string; o: SortOrder }

export function sortedKeyset({
  primary,
  order,
  tiebreak,
  tiebreakOrder = "asc",
}: {
  primary: SQLWrapper
  order: SortOrder
  tiebreak: readonly SQLWrapper[]
  /** One direction for every tiebreak column (a row tuple compares them
   *  together): `asc` by default, `desc` for newest-first lists. */
  tiebreakOrder?: SortOrder
}) {
  const direction = order === "desc" ? sql`desc` : sql`asc`
  const tiebreakTerm = tiebreakOrder === "desc" ? desc : asc
  const orderBy: SQL[] = [
    sql`${primary} ${direction} nulls last`,
    ...tiebreak.map((expression) => tiebreakTerm(expression)),
  ]

  /** Select it as the row's `sortValue` to build the next cursor. */
  const sortValue = sql<string | null>`(${primary})::text`

  function tiebreakAfter(values: readonly (string | number)[]): SQL {
    const columns = sql.join([...tiebreak], sql`, `)
    const params = sql.join(
      values.map((value) => sql`${value}`),
      sql`, `
    )
    if (tiebreakOrder === "desc") return sql`(${columns}) < (${params})`
    return sql`(${columns}) > (${params})`
  }

  /** Rows strictly after `cursor` in `orderBy`; `undefined` on page one. */
  function after(
    cursor: SortedCursorPosition | null | undefined
  ): SQL | undefined {
    if (!cursor) return undefined
    const tie = tiebreakAfter(cursor.t)
    if (cursor.p === null) return and(sql`${primary} is null`, tie)
    const beyond =
      order === "desc"
        ? sql`${primary} < ${cursor.p}`
        : sql`${primary} > ${cursor.p}`
    return or(
      beyond,
      sql`${primary} is null`,
      and(sql`${primary} = ${cursor.p}`, tie)
    )
  }

  return { orderBy, sortValue, after }
}
