import {
  type ColumnFiltersState,
  type ColumnVisibilityState,
  columnFacetingFeature,
  columnFilteringFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  type FilterFn,
  globalFilteringFeature,
  type PaginationState,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
} from "@tanstack/react-table"
import { compareKeys } from "@/features/docs/tables/model/table-kinds"
import {
  type QueryTerm,
  rowMatches,
  tableTerms,
} from "@/features/docs/tables/model/table-query"
import {
  facetLabel,
  facetValue,
  PAGE_SIZE,
  type TableModel,
  type TableRow,
} from "@/features/docs/tables/model/table-view"

// The TanStack Table (table-core v9, through its React adapter) behind every
// table of a documentation page: sorting by one or several columns with the
// type-aware keys of `table-kinds.ts`, the box as the global filter, each
// column filtered by the values it keeps, faceted counts for its filter,
// pages and column visibility.

export const docTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  columnFacetingFeature,
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
})

export type DocTableFeatures = typeof docTableFeatures

/** The state of a table, in TanStack's own shapes. */
export interface DocTableState {
  sorting: SortingState
  /** Each filtered column with the values it keeps (`string[]`). */
  columnFilters: ColumnFiltersState
  /** What is typed in the box. */
  globalFilter: string
  columnVisibility: ColumnVisibilityState
  pagination: PaginationState
}

/** The state a table starts with: written order, no filter, first page. */
export function initialState(model: TableModel): DocTableState {
  return {
    sorting: [],
    columnFilters: [],
    globalFilter: "",
    columnVisibility: {},
    pagination: { pageIndex: 0, pageSize: initialPageSize(model) },
  }
}

function initialPageSize(model: TableModel): number {
  if (model.paged) return PAGE_SIZE
  return model.rows.length
}

/** The ids of the hidden columns. */
export function hiddenColumns(state: DocTableState): string[] {
  return Object.entries(state.columnVisibility)
    .filter(([, shown]) => !shown)
    .map(([column]) => column)
}

/** Whether the box or any column filter is on. */
export function isFiltered(state: DocTableState): boolean {
  if (state.globalFilter.trim() !== "") return true
  return state.columnFilters.some(
    (filter) => keptValues(filter.value).length > 0
  )
}

/** The state with every filter and the box cleared, back on the first page. */
export function withoutFilters(state: DocTableState): DocTableState {
  return {
    ...state,
    globalFilter: "",
    columnFilters: [],
    pagination: { ...state.pagination, pageIndex: 0 },
  }
}

/** A removable chip over the table: a column's filter, or the box. */
export type TableChip =
  | { kind: "filter"; column: string; label: string }
  | { kind: "query"; label: string }

/** The chips of the active filters, in column order, then the box's. */
export function tableChips(
  model: TableModel,
  state: DocTableState
): TableChip[] {
  const chips: TableChip[] = []
  for (const column of model.columns) {
    const filter = state.columnFilters.find((entry) => entry.id === column.id)
    const kept = keptValues(filter?.value)
    if (kept.length === 0) continue
    chips.push({
      kind: "filter",
      column: column.id,
      label: `${column.header}: ${kept.map(facetLabel).join(", ")}`,
    })
  }
  const query = state.globalFilter.trim()
  if (query !== "") chips.push({ kind: "query", label: `Texto: «${query}»` })
  return chips
}

/** The values a column filter keeps; anything else keeps none. */
export function keptValues(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const kept: string[] = []
  for (const item of value) if (typeof item === "string") kept.push(item)
  return kept
}

/** The cell's filter value, `undefined` for an empty cell (sorted last). */
function accessorValue(row: TableRow, index: number): string | undefined {
  const value = facetValue(row.text[index] ?? "")
  if (value === "") return undefined
  return value
}

const columnHelper = createColumnHelper<DocTableFeatures, TableRow>()

/** The column definitions of a table. */
export function docTableColumns(model: TableModel) {
  return columnHelper.columns(
    model.columns.map((column) =>
      columnHelper.accessor((row) => accessorValue(row, column.index), {
        id: column.id,
        header: column.header,
        enableHiding: column.index > 0,
        enableColumnFilter: column.filterable,
        sortDescFirst: false,
        sortUndefined: "last",
        sortFn: (a, b) =>
          compareKeys(
            a.original.keys[column.index] ?? null,
            b.original.keys[column.index] ?? null
          ),
        filterFn: (row, _columnId, value) =>
          keptValues(value).includes(
            facetValue(row.original.text[column.index] ?? "")
          ),
      })
    )
  )
}

/**
 * The box as TanStack's global filter: every term in the row. `terms`
 * parses the box (kept while it doesn't change) and `visible` gives the
 * indexes of the columns shown, so a free word is only looked for where the
 * reader can see it.
 */
export function docTableGlobalFilter(
  terms: (query: string) => QueryTerm[],
  visible: () => readonly number[]
): FilterFn<DocTableFeatures, TableRow> {
  return (row, _columnId, value) =>
    rowMatches(terms(String(value)), row.original.folded, visible())
}

/** A cache of the box's parsed terms, rebuilt only when the box changes. */
export function termsCache(model: TableModel) {
  const headers = model.columns.map((column) => column.header)
  let parsed = { query: "", terms: tableTerms("", headers) }
  return (query: string): QueryTerm[] => {
    if (parsed.query !== query)
      parsed = { query, terms: tableTerms(query, headers) }
    return parsed.terms
  }
}

export interface FacetOption {
  value: string
  label: string
  /** Rows with this value under the box and the other columns' filters. */
  count: number
}

const collator = new Intl.Collator("es", { numeric: true })

function byCountThenLabel(a: FacetOption, b: FacetOption): number {
  if (a.count !== b.count) return b.count - a.count
  return collator.compare(a.label, b.label)
}

/**
 * A column's filter options from TanStack's faceted counts (computed over
 * the other filters): every value of the column, the empty one as
 * "(vacía)", kept ones always listed; most frequent first.
 */
export function facetOptions(
  model: TableModel,
  columnIndex: number,
  faceted: ReadonlyMap<unknown, number>,
  kept: readonly string[]
): FacetOption[] {
  const counts = new Map<string, number>()
  for (const row of model.rows)
    counts.set(facetValue(row.text[columnIndex] ?? ""), 0)
  for (const [value, count] of faceted) {
    const key = typeof value === "string" ? facetValue(value) : ""
    counts.set(key, (counts.get(key) ?? 0) + count)
  }
  for (const value of kept) if (!counts.has(value)) counts.set(value, 0)
  return [...counts]
    .map(([value, count]) => ({ value, label: facetLabel(value), count }))
    .sort(byCountThenLabel)
}
