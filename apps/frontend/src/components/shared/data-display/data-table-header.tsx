import { getIcon } from "@/lib/icon-registry"

const SortableIcon = getIcon("views", "sortable")
const SortAscendingIcon = getIcon("views", "sortAscending")
const SortDescendingIcon = getIcon("views", "sortDescending")

import type { Header, RowData } from "@tanstack/react-table"
import {
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  DataTableColumnFilter,
  type DataTableFilter,
} from "@/components/shared/data-display/data-table-column-filter"
import { denseTableStickyHead } from "@/components/shared/data-display/dense-table"
import { TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { DataTable, DataTableFeatures } from "@/hooks/use-data-table"
import { cn } from "@/lib/utils"

/** Pointer travel before a press on a header becomes a drag. */
const DRAG_THRESHOLD_PX = 4
/** Width change per arrow key on a focused resize handle. */
const RESIZE_STEP_PX = 16

type DataTableHeaderCell<TData extends RowData> = Header<
  DataTableFeatures,
  TData,
  unknown
>

type DropTarget = { id: string; side: "before" | "after" }

type DragState = {
  columnId: string
  pointerId: number
  startX: number
  active: boolean
  target: DropTarget | null
}

/** The column order after dropping `columnId` on one side of `target`. */
export function reorderColumns(
  order: readonly string[],
  columnId: string,
  target: DropTarget
): string[] {
  if (columnId === target.id) return [...order]
  const next = order.filter((id) => id !== columnId)
  const at = next.indexOf(target.id)
  if (at === -1) return [...order]
  const insertAt = target.side === "before" ? at : at + 1
  next.splice(insertAt, 0, columnId)
  return next
}

function ariaSort(sorted: false | "asc" | "desc") {
  if (sorted === "asc") return "ascending"
  if (sorted === "desc") return "descending"
  return "none"
}

function columnLabel<TData extends RowData>(
  header: DataTableHeaderCell<TData>
): string {
  const meta = header.column.columnDef.meta
  if (meta === undefined) return header.column.id
  return meta.label
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") return <SortAscendingIcon className="size-3" />
  if (sorted === "desc") return <SortDescendingIcon className="size-3" />
  return <SortableIcon className="size-3 opacity-50" />
}

/**
 * One `<col>` per visible column carrying its width, so the widths hold in a
 * `table-fixed` table whatever rows are mounted (virtualized bodies mount and
 * unmount rows while scrolling).
 *
 * The table is at least as wide as its box, so a box wider than the columns
 * leaves room over. The first resizable column gets no width and takes all of
 * it; otherwise the browser would spread it over every column and widen the
 * fixed ones (row actions) around their buttons. Without room over, that
 * column still ends up at its own size, since the table is exactly as wide as
 * the columns.
 */
export function DataTableColGroup<TData extends RowData>({
  table,
}: {
  table: DataTable<TData>
}) {
  const columns = table.getVisibleLeafColumns()
  const filler = columns.find((column) => column.getCanResize())
  return (
    <colgroup>
      {columns.map((column) => (
        <col
          key={column.id}
          style={column === filler ? undefined : { width: column.getSize() }}
        />
      ))}
    </colgroup>
  )
}

function ResizeHandle<TData extends RowData>({
  table,
  header,
  label,
  divider,
}: {
  table: DataTable<TData>
  header: DataTableHeaderCell<TData>
  label: string
  /** Show the resting divider, which only marks a boundary between two
   *  resizable columns: off for the last column (the line would sit on the
   *  table's edge) and before a fixed-width one (the expand toggle), where it
   *  would read as that column's. The handle still lights up on hover and
   *  focus. */
  divider: boolean
}) {
  const column = header.column
  const resizeHandler = header.getResizeHandler()

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const step = event.key === "ArrowLeft" ? -RESIZE_STEP_PX : RESIZE_STEP_PX
    const size = column.getSize() + step
    table.setColumnSizing((previous) => ({ ...previous, [column.id]: size }))
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: a focusable window-splitter separator; <hr> can't take focus or keyboard input.
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Redimensionar ${label}`}
      aria-valuenow={column.getSize()}
      aria-valuemin={column.columnDef.minSize}
      aria-valuemax={column.columnDef.maxSize}
      tabIndex={0}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={resizeHandler}
      onTouchStart={resizeHandler}
      onDoubleClick={() => column.resetSize()}
      onKeyDown={onKeyDown}
      // Inside the cell, on its trailing edge: each sticky header paints its
      // own background, so a handle overflowing into the next cell would be
      // half covered by it. The always-visible divider is where to grab.
      className={cn(
        "absolute inset-y-0 right-0 z-10 w-3 cursor-col-resize touch-none select-none outline-none",
        "after:absolute after:inset-y-1.5 after:right-0 after:w-px after:rounded-full after:bg-muted-foreground/40 after:transition-[width,background-color]",
        "hover:after:w-1 hover:after:bg-primary/70 focus-visible:after:w-1 focus-visible:after:bg-primary",
        !divider && "after:bg-transparent",
        column.getIsResizing() && "after:w-1 after:bg-primary"
      )}
    />
  )
}

/**
 * The header row of a data table: sortable headers are buttons that toggle
 * asc ↔ desc (`aria-sort` on the cell), resizable columns get a focusable
 * handle on their trailing edge (drag, ←/→ in 16 px steps, double-click to
 * reset) and reorderable headers can be dragged onto another reorderable
 * header, with a bar marking the side they'll land on.
 */
export function DataTableHeader<TData extends RowData>({
  table,
  className,
  filters,
}: {
  table: DataTable<TData>
  className?: string
  /** Excel-style value filters by column id, opened from an icon at the
   *  trailing edge of the column's header. */
  filters?: Partial<Record<string, DataTableFilter>>
}) {
  const [drag, setDrag] = useState<DragState | null>(null)
  const cells = useRef(new Map<string, HTMLTableCellElement>())
  const suppressClick = useRef(false)

  useEffect(() => {
    if (!drag?.active) return
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setDrag(null)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [drag?.active])

  const headers = table.getHeaderGroups().flatMap((group) => group.headers)
  const reorderableIds = new Set(
    headers
      .filter((header) => header.column.columnDef.meta?.reorderable === true)
      .map((header) => header.column.id)
  )

  function dropTargetAt(clientX: number): DropTarget | null {
    for (const id of reorderableIds) {
      const cell = cells.current.get(id)
      if (!cell) continue
      const rect = cell.getBoundingClientRect()
      if (clientX < rect.left || clientX > rect.right) continue
      const side = clientX < rect.left + rect.width / 2 ? "before" : "after"
      return { id, side }
    }
    return null
  }

  function onPointerDown(
    event: PointerEvent<HTMLTableCellElement>,
    columnId: string
  ) {
    if (event.button !== 0 || !reorderableIds.has(columnId)) return
    setDrag({
      columnId,
      pointerId: event.pointerId,
      startX: event.clientX,
      active: false,
      target: null,
    })
  }

  function onPointerMove(event: PointerEvent<HTMLTableCellElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return
    const travelled = Math.abs(event.clientX - drag.startX)
    if (!drag.active && travelled < DRAG_THRESHOLD_PX) return
    // Capture only once it's a drag: a capture taken on press would retarget
    // the click of a plain press to the cell instead of its sort button.
    if (!drag.active) event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ ...drag, active: true, target: dropTargetAt(event.clientX) })
  }

  function onPointerUp(event: PointerEvent<HTMLTableCellElement>) {
    if (!drag || event.pointerId !== drag.pointerId) return
    if (drag.active) {
      suppressClick.current = true
      if (drag.target) {
        const order = table.getAllLeafColumns().map((column) => column.id)
        table.setColumnOrder(reorderColumns(order, drag.columnId, drag.target))
      }
    }
    setDrag(null)
  }

  // A drag that ends over the header's sort button must not also sort.
  function onClickCapture(event: MouseEvent<HTMLTableCellElement>) {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <TableHeader className={className}>
      <TableRow className="hover:bg-transparent">
        {headers.map((header, index) => {
          const nextHeader = headers[index + 1]
          const divider = nextHeader?.column.getCanResize() === true
          const column = header.column
          const label = columnLabel(header)
          const sortable = column.getCanSort()
          const sorted = column.getIsSorted()
          const sortState = sortable ? ariaSort(sorted) : undefined
          const reorderable = reorderableIds.has(column.id)
          const dragging = drag?.active === true && drag.columnId === column.id
          const target =
            drag?.active === true && drag.target?.id === column.id
              ? drag.target
              : null
          const showTarget = target !== null && target.id !== drag?.columnId
          const filter = filters?.[column.id]
          const filterSort = sortable
            ? {
                direction: sorted,
                onSort: (desc: boolean) => column.toggleSorting(desc),
              }
            : undefined

          return (
            <TableHead
              key={header.id}
              ref={(cell) => {
                if (cell) cells.current.set(column.id, cell)
                else cells.current.delete(column.id)
              }}
              aria-sort={sortState}
              onPointerDown={(event) => onPointerDown(event, column.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => setDrag(null)}
              onClickCapture={onClickCapture}
              className={cn(
                denseTableStickyHead,
                "select-none overflow-visible",
                column.columnDef.meta?.headerClassName,
                reorderable && "cursor-grab",
                drag?.active === true && "cursor-grabbing",
                dragging && "opacity-50"
              )}
            >
              {showTarget ? (
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-y-1 w-0.5 rounded-full bg-primary",
                    target.side === "before" && "left-0",
                    target.side === "after" && "right-0"
                  )}
                />
              ) : null}
              <span className="flex w-full min-w-0 items-center justify-between gap-1">
                {sortable ? (
                  <button
                    type="button"
                    onClick={() => column.toggleSorting(sorted === "asc")}
                    className={cn(
                      "-mx-1 inline-flex max-w-full items-center gap-1 rounded-sm px-1 py-0.5 uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
                      sorted !== false && "text-foreground"
                    )}
                  >
                    <span className="truncate">
                      <table.FlexRender header={header} />
                    </span>
                    <SortIcon sorted={sorted} />
                  </button>
                ) : (
                  <span className="block truncate">
                    <table.FlexRender header={header} />
                  </span>
                )}
                {filter ? (
                  <DataTableColumnFilter
                    label={label}
                    filter={filter}
                    sort={filterSort}
                    placement="header"
                  />
                ) : null}
              </span>
              {column.getCanResize() ? (
                <ResizeHandle
                  table={table}
                  header={header}
                  label={label}
                  divider={divider}
                />
              ) : null}
            </TableHead>
          )
        })}
      </TableRow>
    </TableHeader>
  )
}
