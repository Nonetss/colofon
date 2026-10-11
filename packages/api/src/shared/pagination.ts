import { z } from "zod"

import { errors } from "#errors"

/** `rows` MUST be over-fetched by `limit + 1` for `hasMore` to be accurate. */
export function paginate<T>(
  rows: T[],
  limit: number
): { page: T[]; hasMore: boolean; lastRow: T | undefined } {
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows
  return { page, hasMore, lastRow: page.at(-1) }
}

/**
 * `paginate`, plus the grand total across every page. `totalRows` should be
 * a `count()` query built from the same `.from()`/joins/filters as `rows`,
 * minus the cursor condition — the two run in parallel since neither depends
 * on the other.
 */
export async function paginateWithTotal<T>(
  rows: Promise<T[]>,
  totalRows: Promise<{ total: number }[]>,
  limit: number
): Promise<{
  page: T[]
  hasMore: boolean
  lastRow: T | undefined
  total: number
}> {
  const [rowsResult, totalResult] = await Promise.all([rows, totalRows])
  const { page, hasMore, lastRow } = paginate(rowsResult, limit)
  return { page, hasMore, lastRow, total: totalResult[0]?.total ?? 0 }
}

export function encodeKeysetCursor(timestamp: Date, id: string): string {
  return `${timestamp.toISOString()}|${id}`
}

export function decodeKeysetCursor(
  cursor: string | null | undefined
): { timestamp: Date; id: string } | undefined {
  if (!cursor) return undefined
  const separatorIndex = cursor.indexOf("|")
  const timestamp = new Date(cursor.slice(0, separatorIndex))
  const id = cursor.slice(separatorIndex + 1)
  if (separatorIndex === -1 || Number.isNaN(timestamp.getTime()) || !id) {
    throw errors.BAD_REQUEST({ message: "Invalid pagination cursor" })
  }
  return { timestamp, id }
}

export function paginationLimit(defaultLimit: number, maxLimit: number) {
  return z.number().int().min(1).max(maxLimit).default(defaultLimit)
}

export function paginationCursor() {
  return z
    .string()
    .nullish()
    .describe(
      "Opaque pagination cursor from a previous response's nextCursor; omit for the first page"
    )
}

const INVALID_CURSOR = "Invalid pagination cursor"

const sortedCursorPayload = z.object({
  k: z.string().min(1),
  o: z.enum(["asc", "desc"]),
  p: z.string().nullable(),
  t: z.array(z.union([z.string(), z.number()])).min(1),
})

/** Keyset over a chosen ordering (`#shared/sorted-keyset`): the sort key,
 *  direction, the primary value as text and the tiebreak values, as
 *  base64url JSON. The handler checks `k`/`o` against the request with
 *  `cursorFor`. */
export const sortedCursor = z.codec(z.string(), sortedCursorPayload, {
  decode: (cursor, ctx) => {
    let raw: unknown
    try {
      raw = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"))
    } catch {
      ctx.issues.push({
        code: "custom",
        input: cursor,
        message: INVALID_CURSOR,
      })
      return z.NEVER
    }
    const parsed = sortedCursorPayload.safeParse(raw)
    if (!parsed.success) {
      ctx.issues.push({
        code: "custom",
        input: cursor,
        message: INVALID_CURSOR,
      })
      return z.NEVER
    }
    return parsed.data
  },
  encode: (value) =>
    Buffer.from(JSON.stringify(value), "utf8").toString("base64url"),
})

/** `paginationCursor` for a list the caller orders: decoded during input
 *  validation, so a malformed cursor is `BAD_REQUEST` before the handler
 *  runs. */
export function sortedPaginationCursor() {
  return sortedCursor
    .nullish()
    .describe(
      "Opaque pagination cursor from a previous response's nextCursor, valid only with the same sort and order; omit for the first page"
    )
}
