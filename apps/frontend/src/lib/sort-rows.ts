import type { SortingState } from "@tanstack/react-table"

/** A column's sortable value for one row; `null` when the row has none. */
export type SortValue<T> = (row: T) => string | number | null

function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b
  return String(a).localeCompare(String(b), undefined, { numeric: true })
}

/**
 * Rows of an in-memory data table in the order of its (single-column)
 * sorting state. `values` maps a sortable column id to the value it sorts by;
 * rows without a value come last in both directions, ties keep their input
 * order. A sort on a column with no entry in `values` leaves the rows as they
 * are.
 */
export function sortRows<T>(
  rows: readonly T[],
  sorting: SortingState,
  values: Partial<Record<string, SortValue<T>>>
): T[] {
  const active = sorting[0]
  if (!active) return [...rows]
  const sortValueOf = values[active.id]
  if (!sortValueOf) return [...rows]
  const direction = active.desc ? -1 : 1

  return rows
    .map((row) => ({ row, value: sortValueOf(row) }))
    .sort((a, b) => {
      if (a.value === null && b.value === null) return 0
      if (a.value === null) return 1
      if (b.value === null) return -1
      return direction * compareValues(a.value, b.value)
    })
    .map((entry) => entry.row)
}
