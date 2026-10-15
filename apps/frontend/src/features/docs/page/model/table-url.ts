import type { ColumnFiltersState, SortingState } from "@tanstack/react-table"
import {
  type DocTableState,
  hiddenColumns,
  keptValues,
} from "@/features/docs/page/model/doc-table"
import {
  PAGE_SIZES,
  type TableModel,
} from "@/features/docs/page/model/table-view"

// A table's view in the page's address, to send it by link:
// `?tabla=<id>&orden=ip.desc,name&f.kind=vm|physical&q=text&ocultas=notes
// &pagina=2&filas=50#<id>`. The keys are the earlier documentation site's,
// so its links keep working; free-text column filters (`t.`) are not read.

const VIEW_KEYS = ["tabla", "orden", "q", "ocultas", "pagina", "filas"]
const FILTER_PREFIX = "f."

/** The id of the n-th table (from 1) under a heading: `stacks-1`. */
export function tableId(headingId: string | null, n: number): string {
  if (headingId === null || headingId === "") return `tabla-${n}`
  return `${headingId}-${n}`
}

function isViewKey(key: string): boolean {
  return VIEW_KEYS.includes(key) || key.startsWith(FILTER_PREFIX)
}

function sortingParam(sorting: SortingState): string {
  return sorting
    .map((sort) => {
      if (sort.desc) return `${sort.id}.desc`
      return sort.id
    })
    .join(",")
}

/** The address `href` with the state of table `id`, replacing any other view. */
export function viewHref(
  href: string,
  id: string,
  model: TableModel,
  state: DocTableState,
  initialPageSize: number
): string {
  const url = new URL(href)
  for (const key of [...url.searchParams.keys()])
    if (isViewKey(key)) url.searchParams.delete(key)
  const params = url.searchParams
  params.set("tabla", id)
  if (state.sorting.length > 0) params.set("orden", sortingParam(state.sorting))
  for (const filter of state.columnFilters) {
    const kept = keptValues(filter.value)
    if (kept.length > 0)
      params.set(`${FILTER_PREFIX}${filter.id}`, kept.join("|"))
  }
  const query = state.globalFilter.trim()
  if (query !== "") params.set("q", query)
  // Always written, even empty: the link says which columns are shown.
  params.set("ocultas", hiddenColumns(state).join(","))
  if (model.paged) {
    const { pageIndex, pageSize } = state.pagination
    if (pageIndex > 0) params.set("pagina", String(pageIndex + 1))
    if (pageSize !== initialPageSize) params.set("filas", String(pageSize))
  }
  url.hash = id
  return url.toString()
}

function sortingFrom(
  value: string | null,
  has: (id: string) => boolean
): SortingState {
  const sorting: SortingState = []
  for (const part of (value ?? "").split(",")) {
    const desc = part.endsWith(".desc")
    const id = part.replace(/\.desc$/, "")
    if (has(id)) sorting.push({ id, desc })
  }
  return sorting
}

/** `filas` when it is a size the pager offers; the base size otherwise. */
function pageSizeFrom(
  value: string | null,
  model: TableModel,
  base: DocTableState
): number {
  const size = Number(value)
  if (PAGE_SIZES.some((offered) => offered === size)) return size
  if (size === model.rows.length) return size
  return base.pagination.pageSize
}

/**
 * The state the address gives table `id`, over `base`, or `null` when the
 * address names no view of it. What no longer fits (a column taken out, a
 * page past the end) is skipped; the first column is never hidden.
 */
export function stateFromSearch(
  search: string,
  id: string,
  model: TableModel,
  base: DocTableState
): DocTableState | null {
  const params = new URLSearchParams(search)
  if (params.get("tabla") !== id) return null
  const ids = model.columns.map((column) => column.id)
  const has = (column: string) => ids.includes(column)

  const columnFilters: ColumnFiltersState = []
  for (const [key, value] of params) {
    if (!key.startsWith(FILTER_PREFIX) || value === "") continue
    const column = key.slice(FILTER_PREFIX.length)
    if (has(column)) columnFilters.push({ id: column, value: value.split("|") })
  }
  const state: DocTableState = {
    ...base,
    sorting: sortingFrom(params.get("orden"), has),
    columnFilters,
    globalFilter: params.get("q") ?? "",
  }
  const hidden = params.get("ocultas")
  if (hidden !== null) {
    const columnVisibility: Record<string, boolean> = {}
    for (const column of hidden.split(","))
      if (has(column) && column !== ids[0]) columnVisibility[column] = false
    state.columnVisibility = columnVisibility
  }
  if (model.paged)
    state.pagination = {
      pageSize: pageSizeFrom(params.get("filas"), model, base),
      pageIndex: pageIndexFrom(params.get("pagina")),
    }
  return state
}

/** `pagina` is 1-based; anything else is the first page. */
function pageIndexFrom(value: string | null): number {
  const page = Number(value) - 1
  if (Number.isInteger(page) && page > 0) return page
  return 0
}
