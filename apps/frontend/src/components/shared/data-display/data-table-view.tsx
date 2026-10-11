import { getIcon } from "@/lib/icon-registry"

const ChevronDown = getIcon("controls", "expand")

import type { Cell, Row, RowData } from "@tanstack/react-table"
import { type ReactNode, type Ref, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { DataTableCells } from "@/components/shared/data-display/data-table-cells"
import {
  DataTableColumnFilter,
  type DataTableFilter,
} from "@/components/shared/data-display/data-table-column-filter"
import { DataTableColumnsMenu } from "@/components/shared/data-display/data-table-columns-menu"
import {
  DataTableColGroup,
  DataTableHeader,
} from "@/components/shared/data-display/data-table-header"
import { MetadataCell } from "@/components/shared/data-display/metadata-cell"
import {
  SortControls,
  type SortOption,
  type SortOrder,
} from "@/components/shared/resource/sort-controls"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import type { DataTable, DataTableFeatures } from "@/hooks/use-data-table"
import { cn } from "@/lib/utils"

/** The id of the display column that holds a row's expand toggle. Declare
 *  it (last, `enableResizing: false`, `reorderable: false`) in a table that
 *  passes `renderDetail`; `DataTableView` renders the toggle itself. */
export const DATA_TABLE_EXPAND_COLUMN = "expand"

/** The compact sort select's entry for a table that has no active sort yet
 *  (its rows keep the order they arrived in). */
const UNSORTED = "__unsorted"

const NO_HIDDEN_COLUMNS: readonly string[] = []

type DataTableRow<TData extends RowData> = Row<DataTableFeatures, TData>
type DataTableCell<TData extends RowData> = Cell<
  DataTableFeatures,
  TData,
  unknown
>

export interface DataTableRowState {
  /** Mutes the row's text (paused or read-only rows) without blocking it or
   *  darkening its background. */
  muted?: boolean
  /** Dims the row and drops its hover treatment; the row's own controls
   *  decide what they disable. */
  disabled?: boolean
}

export interface DataTableGroup {
  key: string
  heading: ReactNode
}

export interface DataTableViewProps<TData extends RowData> {
  table: DataTable<TData>
  /** Names the table for assistive technology. */
  label: string
  /** Unique per page; prefixes the compact sort select's `id`. */
  idPrefix: string
  /**
   * `responsive` (default): the table layout while the box is wide, stacked
   * compact rows below it. `table`: the table layout at every width,
   * scrolling sideways when it doesn't fit (sheets).
   */
  layout?: "responsive" | "table"
  /** Columns that don't apply to this viewer, the same ids passed to
   *  `useDataTable`'s `forcedHidden`: left out of every layout and the
   *  columns menu. */
  hiddenColumnIds?: readonly string[]
  /** Resets the saved layout; the columns menu shows only when some column
   *  is `defaultHidden`. */
  onResetColumns: () => void
  /** Renders a display column's content (row actions, inline controls).
   *  `expandToggle` is the row's ready-made expand button (`null` when the
   *  row has no detail), for a table that shows it inside its own actions
   *  column instead of a `DATA_TABLE_EXPAND_COLUMN`. */
  renderControl?: (
    row: TData,
    columnId: string,
    expandToggle: ReactNode
  ) => ReactNode
  rowState?: (row: TData) => DataTableRowState
  /** Makes rows expandable: the detail spans the visible columns. Needs a
   *  `DATA_TABLE_EXPAND_COLUMN` display column. */
  renderDetail?: (row: TData) => ReactNode
  /** Rows without a detail get no expand toggle (default: every row). */
  hasDetail?: (row: TData) => boolean
  /** Names the expand toggle of a row. */
  detailLabel?: (row: TData) => string
  /** Puts the rows under heading rows: a heading is inserted whenever the
   *  group changes, so the groups follow the rows' order. */
  groupOf?: (row: TData) => DataTableGroup
  /** Below the rows (an infinite-scroll sentinel, a pager). */
  footer?: ReactNode
  /** Excel-style value filters by column id: an icon in the column's header
   *  in the table layout, a button per column above the rows in the compact
   *  one. The caller filters the rows it passes in. */
  filters?: Partial<Record<string, DataTableFilter>>
  /** Shown in place of the rows when there are none (filters that match
   *  nothing), so the table and its filters stay on screen. */
  emptyMessage?: ReactNode
  /** The table's scroll box, both ways (the header sticks to its top):
   *  pass it to `useInfiniteScroll` as the root of the footer sentinel. */
  scrollRef?: Ref<HTMLDivElement>
  /** Bounds the scroll box where the page doesn't (`max-h-[70dvh]`). */
  scrollClassName?: string
  className?: string
}

function rowStateOf<TData extends RowData>(
  rowState: ((row: TData) => DataTableRowState) | undefined,
  row: TData
): DataTableRowState {
  if (!rowState) return {}
  return rowState(row)
}

function columnLabel(column: {
  id: string
  columnDef: { meta?: { label: string } }
}): string {
  const meta = column.columnDef.meta
  if (meta === undefined) return column.id
  return meta.label
}

function sortOptionsOf<TData extends RowData>(
  table: DataTable<TData>,
  unsorted: boolean
): SortOption<string>[] {
  const options: SortOption<string>[] = []
  if (unsorted) options.push({ value: UNSORTED, label: "Orden original" })
  for (const column of table.getAllLeafColumns()) {
    if (!column.getCanSort()) continue
    const meta = column.columnDef.meta
    if (meta === undefined) continue
    options.push({ value: column.id, label: meta.label })
  }
  return options
}

function ExpandToggle({
  expanded,
  label,
  onToggle,
}: {
  expanded: boolean
  label: string
  onToggle: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-expanded={expanded}
      aria-label={label}
      onClick={onToggle}
    >
      <ChevronDown
        className={cn(
          "size-4 text-muted-foreground transition-transform",
          expanded && "rotate-180"
        )}
      />
    </Button>
  )
}

function CompactCellValue<TData extends RowData>({
  table,
  cell,
  control,
}: {
  table: DataTable<TData>
  cell: DataTableCell<TData>
  control: (columnId: string) => ReactNode
}) {
  if (cell.column.columnDef.meta?.rowRendered === true) {
    return control(cell.column.id)
  }
  return <table.FlexRender cell={cell} />
}

/**
 * A data table's rendering: the column header with sorting, resizing and
 * reordering, the columns menu (when some column starts hidden), the rows
 * with their display controls, optional heading rows and expandable detail
 * rows. In the `responsive` layout the box is a container: while it is
 * narrower than `@4xl` the rows render as a compact list instead — the
 * identifying cell as the heading, every other field labelled (hidden
 * columns included) and the ordering from `SortControls` — and the column
 * layout doesn't apply to it.
 */
export function DataTableView<TData extends RowData>({
  table,
  label,
  idPrefix,
  layout = "responsive",
  hiddenColumnIds = NO_HIDDEN_COLUMNS,
  onResetColumns,
  renderControl,
  rowState,
  renderDetail,
  hasDetail,
  detailLabel,
  groupOf,
  footer,
  filters,
  emptyMessage,
  scrollRef,
  scrollClassName,
  className,
}: DataTableViewProps<TData>) {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())
  const rows = table.getRowModel().rows
  const visibleCount = table.getVisibleLeafColumns().length
  const showColumnsMenu = table
    .getAllLeafColumns()
    .some(
      (column) =>
        column.columnDef.meta?.defaultHidden === true &&
        !hiddenColumnIds.includes(column.id)
    )
  const responsive = layout === "responsive"

  const toggle = (rowId: string) =>
    setExpanded((previous) => {
      const next = new Set(previous)
      if (next.has(rowId)) next.delete(rowId)
      else next.add(rowId)
      return next
    })

  const toggleLabel = (row: TData) => {
    if (detailLabel) return detailLabel(row)
    return "Ver detalle"
  }

  const expandable = (row: DataTableRow<TData>): boolean => {
    if (!renderDetail) return false
    if (!hasDetail) return true
    return hasDetail(row.original)
  }

  const detailOf = (row: DataTableRow<TData>): ReactNode => {
    if (!renderDetail || !expandable(row) || !expanded.has(row.id)) return null
    return renderDetail(row.original)
  }

  const expandToggleOf = (row: DataTableRow<TData>): ReactNode => {
    if (!expandable(row)) return null
    return (
      <ExpandToggle
        expanded={expanded.has(row.id)}
        label={toggleLabel(row.original)}
        onToggle={() => toggle(row.id)}
      />
    )
  }

  const control = (row: DataTableRow<TData>, columnId: string): ReactNode => {
    if (columnId === DATA_TABLE_EXPAND_COLUMN) return expandToggleOf(row)
    if (!renderControl) return null
    return renderControl(row.original, columnId, expandToggleOf(row))
  }

  const groupStarts = (index: number): DataTableGroup | null => {
    if (!groupOf) return null
    const row = rows[index]
    if (!row) return null
    const group = groupOf(row.original)
    const previous = rows[index - 1]
    if (previous && groupOf(previous.original).key === group.key) return null
    return group
  }

  const sorting = table.atoms.sorting.get()
  const active = sorting[0]
  const sortOptions = sortOptionsOf(table, active === undefined)
  const sortable = sortOptions.some((option) => option.value !== UNSORTED)
  const sortValue = active === undefined ? UNSORTED : active.id
  const sortOrder: SortOrder = active?.desc === true ? "desc" : "asc"
  const onCompactSort = (next: { sort: string; order: SortOrder }) => {
    if (next.sort === UNSORTED) return
    table.setSorting([{ id: next.sort, desc: next.order === "desc" }])
  }

  return (
    <div
      className={cn(
        "@container/table flex min-h-0 min-w-0 flex-1 flex-col",
        className
      )}
    >
      {responsive ? (
        <div className="@4xl/table:hidden">
          {sortable ? (
            <SortControls
              idPrefix={idPrefix}
              idSuffix="compact"
              options={sortOptions}
              value={sortValue}
              order={sortOrder}
              onChange={onCompactSort}
              className="mb-3"
              selectClassName="min-w-0 flex-1"
            />
          ) : null}
          {filters ? (
            <CompactFilters
              table={table}
              filters={filters}
              hiddenColumnIds={hiddenColumnIds}
            />
          ) : null}
        </div>
      ) : null}
      {showColumnsMenu ? (
        <div
          className={cn(
            "mb-3 flex justify-end",
            responsive && "hidden @4xl/table:flex"
          )}
        >
          <DataTableColumnsMenu
            table={table}
            onReset={onResetColumns}
            hiddenColumnIds={hiddenColumnIds}
          />
        </div>
      ) : null}

      {/* The one scroller of the table, both ways: the header's sticky cells
          stay at its top while the rows scroll under them. It is as tall as
          its rows, and shrinks to the space left (then scrolls) when they
          don't fit. */}
      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 overflow-auto rounded-xl border bg-card/40",
          scrollClassName
        )}
      >
        {responsive ? (
          <ul aria-label={label} className="divide-y @4xl/table:hidden">
            {rows.length === 0 && emptyMessage ? (
              <li className="px-4 py-8 text-center">{emptyMessage}</li>
            ) : null}
            {rows.map((row, index) => {
              const group = groupStarts(index)
              return (
                <CompactRow
                  key={row.id}
                  table={table}
                  row={row}
                  group={group}
                  hiddenColumnIds={hiddenColumnIds}
                  state={rowStateOf(rowState, row.original)}
                  control={(columnId) => control(row, columnId)}
                  detail={detailOf(row)}
                />
              )
            })}
          </ul>
        ) : null}

        <Table
          aria-label={label}
          containerClassName={cn(
            "overflow-visible",
            responsive && "hidden @4xl/table:block"
          )}
          className="table-fixed"
          style={{ width: table.getTotalSize(), minWidth: "100%" }}
        >
          <DataTableColGroup table={table} />
          <DataTableHeader table={table} filters={filters} />
          <TableBody>
            {rows.length === 0 && emptyMessage ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visibleCount} className="py-8 text-center">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : null}
            {rows.map((row, index) => {
              const group = groupStarts(index)
              const state = rowStateOf(rowState, row.original)
              const detail = detailOf(row)
              const open = detail !== null
              return (
                <DataTableRowGroup
                  key={row.id}
                  group={group}
                  visibleCount={visibleCount}
                >
                  <TableRow
                    className={cn(
                      "group",
                      state.muted === true && "text-muted-foreground",
                      state.disabled === true &&
                        "opacity-60 hover:bg-transparent",
                      open && "border-b-0"
                    )}
                  >
                    <DataTableCells
                      row={row}
                      table={table}
                      renderControl={(columnId) => control(row, columnId)}
                    />
                  </TableRow>
                  {open ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell
                        colSpan={visibleCount}
                        className="whitespace-normal px-3 pt-0 pb-4"
                      >
                        {detail}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </DataTableRowGroup>
              )
            })}
          </TableBody>
        </Table>
        {footer}
      </div>
    </div>
  )
}

function DataTableRowGroup({
  group,
  visibleCount,
  children,
}: {
  group: DataTableGroup | null
  visibleCount: number
  children: ReactNode
}) {
  if (!group) return children
  return (
    <>
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableCell colSpan={visibleCount} className="px-3 py-2">
          <Text variant="label" tone="muted">
            {group.heading}
          </Text>
        </TableCell>
      </TableRow>
      {children}
    </>
  )
}

function CompactFilters<TData extends RowData>({
  table,
  filters,
  hiddenColumnIds,
}: {
  table: DataTable<TData>
  filters: Partial<Record<string, DataTableFilter>>
  hiddenColumnIds: readonly string[]
}) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => !hiddenColumnIds.includes(column.id))
  return (
    <div className="@container mb-3">
      <div className="grid gap-2 @md:grid-cols-2 @xl:grid-cols-3">
        {columns.map((column) => {
          const filter = filters[column.id]
          if (!filter) return null
          return (
            <DataTableColumnFilter
              key={column.id}
              label={columnLabel(column)}
              filter={filter}
              placement="compact"
            />
          )
        })}
      </div>
    </div>
  )
}

function CompactRow<TData extends RowData>({
  table,
  row,
  group,
  hiddenColumnIds,
  state,
  control,
  detail,
}: {
  table: DataTable<TData>
  row: DataTableRow<TData>
  group: DataTableGroup | null
  hiddenColumnIds: readonly string[]
  state: DataTableRowState
  control: (columnId: string) => ReactNode
  detail: ReactNode
}) {
  const cells = row
    .getAllCells()
    .filter((cell) => !hiddenColumnIds.includes(cell.column.id))
  const primary = cells.filter(
    (cell) => cell.column.columnDef.meta?.compact === "primary"
  )
  const status = cells.filter(
    (cell) => cell.column.columnDef.meta?.compact === "status"
  )
  const controls = cells.filter((cell) => !cell.column.accessorFn)
  const fields = cells.filter(
    (cell) =>
      cell.column.accessorFn !== undefined &&
      cell.column.columnDef.meta?.compact === undefined
  )

  return (
    <>
      {group ? (
        <li className="bg-muted/30 px-4 py-2">
          <Text variant="label" tone="muted">
            {group.heading}
          </Text>
        </li>
      ) : null}
      <li
        className={cn(
          "group grid gap-3 px-4 py-4 transition-colors",
          state.muted === true && "text-muted-foreground",
          state.disabled === true && "opacity-60",
          state.disabled !== true && "hover:bg-muted/40"
        )}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            {primary.map((cell) => (
              <CompactCellValue
                key={cell.id}
                table={table}
                cell={cell}
                control={control}
              />
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {status.map((cell) => (
              <CompactCellValue
                key={cell.id}
                table={table}
                cell={cell}
                control={control}
              />
            ))}
            {controls.map((cell) => (
              <span key={cell.id} className="inline-flex">
                {control(cell.column.id)}
              </span>
            ))}
          </div>
        </div>
        {fields.length > 0 ? (
          <div className="@container min-w-0">
            <div className="grid grid-cols-2 gap-x-5 gap-y-3 @md:grid-cols-3 @xl:grid-cols-4">
              {fields.map((cell) => (
                <MetadataCell key={cell.id} label={columnLabel(cell.column)}>
                  <CompactCellValue
                    table={table}
                    cell={cell}
                    control={control}
                  />
                </MetadataCell>
              ))}
            </div>
          </div>
        ) : null}
        {detail ? <div className="min-w-0">{detail}</div> : null}
      </li>
    </>
  )
}
