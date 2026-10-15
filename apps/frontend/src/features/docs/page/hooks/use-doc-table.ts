import { functionalUpdate as resolve, useTable } from "@tanstack/react-table"
import { useMemo, useRef, useState } from "react"
import {
  type DocTableState,
  docTableColumns,
  docTableFeatures,
  docTableGlobalFilter,
  hiddenColumns,
  termsCache,
} from "@/features/docs/page/model/doc-table"
import type { TableModel } from "@/features/docs/page/model/table-view"

/** Whether a header press asks to add the column to the sort (Shift). */
function isShiftPress(event: unknown): boolean {
  return event instanceof MouseEvent && event.shiftKey
}

/**
 * The TanStack table of a documentation page's table, its state controlled
 * here so the island can write it to the URL and clear it. Changing the
 * sort, the box or a filter goes back to the first page.
 */
export function useDocTable(model: TableModel, opening: DocTableState) {
  const [state, setState] = useState(opening)

  // The box looks only in the columns shown; read when it filters.
  const visible = useRef<number[]>([])
  const hidden = hiddenColumns(state)
  visible.current = model.columns
    .filter((column) => !hidden.includes(column.id))
    .map((column) => column.index)

  const terms = useMemo(() => termsCache(model), [model])
  const columns = useMemo(() => docTableColumns(model), [model])
  const globalFilterFn = useMemo(
    () => docTableGlobalFilter(terms, () => visible.current),
    [terms]
  )
  const firstColumn = model.columns[0]?.id

  const toFirstPage = (current: DocTableState): DocTableState => ({
    ...current,
    pagination: { ...current.pagination, pageIndex: 0 },
  })

  const table = useTable({
    features: docTableFeatures,
    data: model.rows,
    columns,
    getRowId: (row) => String(row.index),
    state,
    enableMultiSort: true,
    isMultiSortEvent: isShiftPress,
    autoResetPageIndex: false,
    // The box filters the whole row once, through the first column only.
    getColumnCanGlobalFilter: (column) => column.id === firstColumn,
    globalFilterFn,
    onSortingChange: (updater) =>
      setState((current) =>
        toFirstPage({ ...current, sorting: resolve(updater, current.sorting) })
      ),
    onColumnFiltersChange: (updater) =>
      setState((current) =>
        toFirstPage({
          ...current,
          columnFilters: resolve(updater, current.columnFilters),
        })
      ),
    onGlobalFilterChange: (updater) =>
      setState((current) =>
        toFirstPage({
          ...current,
          globalFilter: String(resolve(updater, current.globalFilter)),
        })
      ),
    onColumnVisibilityChange: (updater) =>
      setState((current) => ({
        ...current,
        columnVisibility: resolve(updater, current.columnVisibility),
      })),
    onPaginationChange: (updater) =>
      setState((current) => ({
        ...current,
        pagination: resolve(updater, current.pagination),
      })),
  })

  return { table, state, setState }
}
