import {
  type ColumnDef,
  columnOrderingFeature,
  columnResizingFeature,
  columnSizingFeature,
  columnVisibilityFeature,
  metaHelper,
  type OnChangeFn,
  type RowData,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table"
import { useMemo, useState } from "react"
import {
  type ColumnPreferenceDefault,
  useColumnPreferences,
} from "@/hooks/use-column-preferences"
import { type SortValue, sortRows } from "@/lib/sort-rows"

/** What every data-table column declares beyond TanStack's own options. */
export type DataTableColumnMeta = {
  /** The column's name in the columns menu and the resize handle's label. */
  label: string
  /** `false` pins the column to its declared position (identifying column
   *  first, row-control column last). */
  reorderable: boolean
  /** Extra classes for the column's body cells (type role, wrapping). */
  cellClassName?: string
  /** Extra classes for the column's header cell, e.g. `text-right` to line
   *  the header up with right-aligned numbers. */
  headerClassName?: string
  /** A hideable column that starts hidden (until the user shows it, and
   *  again after a reset). */
  defaultHidden?: boolean
  /** Where the column goes in `DataTableView`'s compact layout: the row's
   *  heading (the identifying column), its status next to the row controls,
   *  or left out because another cell already shows its value. Unset, it is
   *  a labelled field. Display columns always go with the row controls. */
  compact?: "primary" | "status" | "omit"
  /** The row renders this accessor column's cell through `renderControl`,
   *  like a display column, because it needs the page's callbacks (an open
   *  button, an inline select); the accessor still sorts it. */
  rowRendered?: boolean
}

/** Only the column features the data table uses; rows keep the order they
 *  arrive in (the server sorts). */
export const dataTableFeatures = tableFeatures({
  columnVisibilityFeature,
  columnOrderingFeature,
  columnSizingFeature,
  columnResizingFeature,
  rowSortingFeature,
  columnMeta: metaHelper<DataTableColumnMeta>(),
})

export type DataTableFeatures = typeof dataTableFeatures

export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData,
  unknown
>

/** Columns opt in to hiding and sorting; resizing is on unless a column
 *  turns it off. */
const DEFAULT_COLUMN = {
  enableHiding: false,
  enableSorting: false,
  enableResizing: true,
  sortDescFirst: false,
}

const DEFAULT_SIZE = 150
const DEFAULT_MIN_SIZE = 40
const DEFAULT_MAX_SIZE = 600

function numberOr(value: number | undefined, fallback: number): number {
  if (value === undefined) return fallback
  return value
}

/**
 * The saved-layout declaration of each column, in declared order. Every
 * column needs an explicit `id` and a `meta`; a column without one is a
 * programming error caught on first render.
 */
export function columnLayoutOf<TData extends RowData>(
  columns: readonly DataTableColumnDef<TData>[]
): ColumnPreferenceDefault[] {
  return columns.map((column) => {
    if (typeof column.id !== "string" || column.meta === undefined) {
      throw new Error("Every data-table column needs an `id` and a `meta`")
    }
    return {
      id: column.id,
      size: numberOr(column.size, DEFAULT_SIZE),
      minSize: numberOr(column.minSize, DEFAULT_MIN_SIZE),
      maxSize: numberOr(column.maxSize, DEFAULT_MAX_SIZE),
      hideable: column.enableHiding === true,
      visible: column.meta.defaultHidden !== true,
      reorderable: column.meta.reorderable,
    }
  })
}

export interface UseDataTableOptions<TData extends RowData> {
  data: readonly TData[]
  /** A module-level constant: TanStack rebuilds the columns when it changes. */
  columns: readonly DataTableColumnDef<TData>[]
  getRowId: (row: TData) => string
  /** The active sort, owned by the caller (the URL for list pages). */
  sorting: SortingState
  onSortingChange: OnChangeFn<SortingState>
  /** From `useColumnPreferences`. */
  columnVisibility: Record<string, boolean>
  onColumnVisibilityChange: OnChangeFn<Record<string, boolean>>
  columnOrder: string[]
  onColumnOrderChange: OnChangeFn<string[]>
  columnSizing: Record<string, number>
  onColumnSizingChange: OnChangeFn<Record<string, number>>
  /** Columns that don't apply right now (an actions column the viewer can't
   *  use): hidden whatever the preferences say,
   *  and never written back to them. Pass the same ids to the columns
   *  menu's `hiddenColumnIds`. Keep the array stable (memoize it). */
  forcedHidden?: readonly string[]
}

const NO_FORCED_HIDDEN: readonly string[] = []

/** `visibility` with every forced column hidden. */
function withForcedHidden(
  visibility: Record<string, boolean>,
  forcedHidden: readonly string[]
): Record<string, boolean> {
  if (forcedHidden.length === 0) return visibility
  const merged = { ...visibility }
  for (const id of forcedHidden) merged[id] = false
  return merged
}

/** `next` with each forced column's entry put back to what the caller had
 *  saved, so the forced `false` never reaches the preferences. */
function withoutForcedHidden(
  next: Record<string, boolean>,
  saved: Record<string, boolean>,
  forcedHidden: readonly string[]
): Record<string, boolean> {
  if (forcedHidden.length === 0) return next
  const restored = { ...next }
  for (const id of forcedHidden) {
    const own = saved[id]
    if (own === undefined) delete restored[id]
    else restored[id] = own
  }
  return restored
}

/**
 * A TanStack Table v9 instance for a data table: column
 * visibility, order and widths are controlled by the caller (usually
 * `useColumnPreferences`), the sort is controlled and applied outside the
 * table — by the server, or by `sortRows` before the rows come in
 * (`manualSorting`) — one column at a time, toggling asc ↔ desc. Resizing
 * updates widths live.
 */
export function useDataTable<TData extends RowData>({
  data,
  columns,
  getRowId,
  sorting,
  onSortingChange,
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder,
  onColumnOrderChange,
  columnSizing,
  onColumnSizingChange,
  forcedHidden = NO_FORCED_HIDDEN,
}: UseDataTableOptions<TData>) {
  const visibility = useMemo(
    () => withForcedHidden(columnVisibility, forcedHidden),
    [columnVisibility, forcedHidden]
  )
  const onVisibilityChange: OnChangeFn<Record<string, boolean>> = (updater) => {
    const next = typeof updater === "function" ? updater(visibility) : updater
    onColumnVisibilityChange(
      withoutForcedHidden(next, columnVisibility, forcedHidden)
    )
  }

  return useTable({
    features: dataTableFeatures,
    data,
    columns,
    getRowId,
    defaultColumn: DEFAULT_COLUMN,
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    columnResizeMode: "onChange",
    state: {
      sorting,
      columnVisibility: visibility,
      columnOrder,
      columnSizing,
    },
    onSortingChange,
    onColumnVisibilityChange: onVisibilityChange,
    onColumnOrderChange,
    onColumnSizingChange,
  })
}

export type DataTable<TData extends RowData> = ReturnType<
  typeof useDataTable<TData>
>

/** The column-state props of `useDataTable` from `useColumnPreferences`. */
export function columnPreferenceProps(preferences: {
  visibility: Record<string, boolean>
  setVisibility: OnChangeFn<Record<string, boolean>>
  order: string[]
  setOrder: OnChangeFn<string[]>
  sizing: Record<string, number>
  setSizing: OnChangeFn<Record<string, number>>
}) {
  return {
    columnVisibility: preferences.visibility,
    onColumnVisibilityChange: preferences.setVisibility,
    columnOrder: preferences.order,
    onColumnOrderChange: preferences.setOrder,
    columnSizing: preferences.sizing,
    onColumnSizingChange: preferences.setSizing,
  }
}

export interface UseLocalDataTableOptions<TData extends RowData> {
  /** Names the table kind for its saved layout, never an entity. */
  tableId: string
  rows: readonly TData[]
  /** A module-level constant. */
  columns: readonly DataTableColumnDef<TData>[]
  /** `columnLayoutOf(columns)`, also a module-level constant. */
  layout: readonly ColumnPreferenceDefault[]
  getRowId: (row: TData) => string
  sortValues: Partial<Record<string, SortValue<TData>>>
  forcedHidden?: readonly string[]
}

/**
 * A data table whose sort lives in local state and is applied in the
 * browser (a table inside a sheet): the saved column layout, the sort
 * starting from the rows' own order, and the rows sorted with `sortRows`.
 */
export function useLocalDataTable<TData extends RowData>({
  tableId,
  rows,
  columns,
  layout,
  getRowId,
  sortValues,
  forcedHidden,
}: UseLocalDataTableOptions<TData>) {
  const preferences = useColumnPreferences(tableId, layout)
  const [sorting, setSorting] = useState<SortingState>([])
  const data = useMemo(
    () => sortRows(rows, sorting, sortValues),
    [rows, sorting, sortValues]
  )
  const table = useDataTable({
    data,
    columns,
    getRowId,
    sorting,
    onSortingChange: setSorting,
    forcedHidden,
    ...columnPreferenceProps(preferences),
  })
  return { table, preferences }
}
