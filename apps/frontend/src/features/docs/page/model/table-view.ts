import { foldText } from "@/lib/fold-text"
import { sortRows } from "@/lib/sort-rows"

// What a table of a documentation page shows: its rows filtered by the text
// typed over it and ordered by the column whose header was clicked.

/** Rows from which a table gets its search box (fewer are read at a glance). */
export const SEARCHABLE_ROWS = 8

export interface TableRow {
  /** The text of each cell, in column order. */
  cells: string[]
}

export interface TableSort {
  column: number
  desc: boolean
}

/** A header click: ascending, then descending, then the written order. */
export function nextSort(
  sort: TableSort | null,
  column: number
): TableSort | null {
  if (sort === null || sort.column !== column) return { column, desc: false }
  if (sort.desc) return null
  return { column, desc: true }
}

/** Every word of `query` is somewhere in the row, accents and case aside. */
function matches(row: TableRow, words: readonly string[]): boolean {
  const text = foldText(row.cells.join(" "))
  return words.every((word) => text.includes(word))
}

function cellValue(column: number) {
  return (row: TableRow): string | null => {
    const text = row.cells[column]?.trim()
    if (text === undefined || text === "") return null
    return text
  }
}

/**
 * The rows to show, in order: those that hold every word of `query`, sorted
 * by `sort` (empty cells last, ties in the written order).
 */
export function visibleRows<T extends TableRow>(
  rows: readonly T[],
  query: string,
  sort: TableSort | null
): T[] {
  const words = foldText(query).split(/\s+/).filter(Boolean)
  const shown = rows.filter((row) => matches(row, words))
  if (sort === null) return shown
  const id = String(sort.column)
  return sortRows(shown, [{ id, desc: sort.desc }], {
    [id]: cellValue(sort.column),
  })
}

/** "12 filas", or "3 de 12 filas" while a search hides some. */
export function rowsLabel(shown: number, total: number): string {
  const count = `${total} ${rowsNoun(total)}`
  if (shown === total) return count
  return `${shown} de ${count}`
}

function rowsNoun(total: number): string {
  if (total === 1) return "fila"
  return "filas"
}
