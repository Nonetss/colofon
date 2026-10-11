import {
  type SortedCursor,
  type SortedCursorPosition,
  type SortOrder,
  sortedKeyset,
} from "@nonete/db/sorted-keyset"
import { errors } from "#errors"

/**
 * The caller-ordered keyset for API lists: `sortedKeyset` lives in
 * `@nonete/db/sorted-keyset` (pure Drizzle, shared with `packages/cron`) and
 * is re-exported here with its types; `cursorFor` adds the request check,
 * which throws the API's `BAD_REQUEST`.
 */
export type { SortedCursor, SortedCursorPosition, SortOrder }
export { sortedKeyset }

/**
 * The decoded cursor when it was issued for this `sort`, `order` and
 * tiebreak size; `BAD_REQUEST` otherwise, since resuming one ordering from
 * another's position would skip or repeat rows.
 */
export function cursorFor(
  cursor: SortedCursor | null | undefined,
  sort: string,
  order: SortOrder,
  tiebreakSize: number
): SortedCursor | undefined {
  if (!cursor) return undefined
  if (
    cursor.k !== sort ||
    cursor.o !== order ||
    cursor.t.length !== tiebreakSize
  ) {
    throw errors.BAD_REQUEST({ message: "Invalid pagination cursor" })
  }
  return cursor
}
