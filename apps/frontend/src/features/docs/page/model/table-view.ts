import {
  type ColumnKind,
  detectKind,
  isEmptyCell,
  type SortKey,
  sortKey,
} from "@/features/docs/page/model/table-kinds"
import { foldText } from "@/lib/fold-text"

// A table of a documentation page as read from the server's HTML: its
// columns (with a unique id and the kind their cells read as) and its rows
// (texts, folded texts and sort keys), plus the labels its toolbar shows.
// The state and the view are TanStack Table's (`doc-table.ts`).

/** Rows from which a table gets its toolbar; below, it only sorts. */
export const TOOLBAR_ROWS = 2
/** Above this many rows a table is split in pages. */
export const PAGED_ROWS = 50
export const PAGE_SIZE = 25
/** The page sizes offered, besides every row. */
export const PAGE_SIZES = [25, 50, 100] as const
/** Longer than this, a value does not fit one line of the filter panel, so
 *  the column offers no value filter. */
export const MAX_FILTER_VALUE_LENGTH = 40

export interface TableColumn {
  index: number
  /** The header folded into a slug (`estado`), unique in the table. */
  id: string
  header: string
  kind: ColumnKind
  /** Its values fit the filter panel, so the header offers a value filter. */
  filterable: boolean
}

export interface TableRow {
  /** Its place in the written order. */
  index: number
  /** Cell texts, spaces collapsed. */
  text: string[]
  /** The same, folded, for the filters. */
  folded: string[]
  keys: SortKey[]
}

export interface TableModel {
  columns: TableColumn[]
  rows: TableRow[]
  /** Has the toolbar; otherwise it only sorts. */
  full: boolean
  /** Split in pages. */
  paged: boolean
}

/** Collapses the spaces of a cell's text. */
export function cellText(text: string): string {
  return text.replace(/\s+/g, " ").trim()
}

/** The text a filter value stands for: an empty cell is `""`. */
export function facetValue(text: string): string {
  if (isEmptyCell(text)) return ""
  return text
}

/** A header folded into a slug; `col<n>` when nothing is left. */
export function slugOf(text: string): string {
  return foldText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

/** One id per header, in order: its slug, with `-2`, `-3` when repeated. */
function columnIds(headers: readonly string[]): string[] {
  const taken = new Set<string>()
  return headers.map((header, index) => {
    const base = slugOrDefault(slugOf(header), index)
    let id = base
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
    taken.add(id)
    return id
  })
}

function slugOrDefault(slug: string, index: number): string {
  if (slug !== "") return slug
  return `col${index + 1}`
}

/** The model of a table from its header texts and the texts of its cells. */
export function tableModel(
  headers: readonly string[],
  cells: readonly (readonly string[])[]
): TableModel {
  const texts = cells.map((row) =>
    headers.map((_, index) => cellText(row[index] ?? ""))
  )
  const ids = columnIds(headers.map(cellText))
  const columns = ids.map((id, index) => ({
    index,
    id,
    header: cellText(headers[index] ?? ""),
    kind: detectKind(texts.map((row) => row[index] ?? "")),
    filterable: valuesFitFilter(texts, index),
  }))
  const rows = texts.map((text, index) => ({
    index,
    text,
    folded: text.map(foldText),
    keys: columns.map((column) =>
      sortKey(column.kind, text[column.index] ?? "")
    ),
  }))
  const full = rows.length >= TOOLBAR_ROWS
  return { columns, rows, full, paged: full && rows.length > PAGED_ROWS }
}

/** Whether every value of column `index` fits the filter panel. An empty
 *  cell does: it is listed as "(vacía)". */
function valuesFitFilter(
  texts: readonly (readonly string[])[],
  index: number
): boolean {
  for (const row of texts) {
    const value = row[index]
    if (value !== undefined && value.length > MAX_FILTER_VALUE_LENGTH)
      return false
  }
  return true
}

/** "(vacía)" for the empty cells, as the filter lists them. */
export function facetLabel(value: string): string {
  if (value === "") return "(vacía)"
  return value
}

/** "12 filas", or "3 de 12 filas" while filtered. */
export function rowsLabel(shown: number, total: number, filtered: boolean) {
  const count = `${total} ${rowsNoun(total)}`
  if (!filtered) return count
  return `${shown} de ${count}`
}

function rowsNoun(total: number): string {
  if (total === 1) return "fila"
  return "filas"
}

/** "Página 2 de 5". */
export function pageLabel(pageIndex: number, pageCount: number): string {
  return `Página ${pageIndex + 1} de ${Math.max(pageCount, 1)}`
}
