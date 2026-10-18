import type { RowData } from "@tanstack/react-table"
import { type KeyboardEvent, type ReactNode, useEffect, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import {
  SortableHandle,
  SortableItem,
  useSortableList,
} from "@/components/shared/data-display/sortable-list"
import { CheckboxRow } from "@/components/shared/form/checkbox-row"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import type { DataTable } from "@/hooks/use-data-table"
import { getIcon } from "@/lib/icon-registry"
import { cn } from "@/lib/utils"

const ColumnsIcon = getIcon("views", "columns")
const ResetIcon = getIcon("actions", "reset")

type MenuColumn = {
  id: string
  label: string
  canHide: boolean
  visible: boolean
  reorderable: boolean
}

/** The columns the menu lists, in their current order: every column with
 *  data (row-control display columns, like the expand toggle, are left
 *  out). */
function menuColumns<TData extends RowData>(
  table: DataTable<TData>,
  hiddenColumnIds: readonly string[]
): MenuColumn[] {
  const listed: MenuColumn[] = []
  for (const column of table.getAllLeafColumns()) {
    const meta = column.columnDef.meta
    if (!meta || !column.accessorFn) continue
    if (hiddenColumnIds.includes(column.id)) continue
    listed.push({
      id: column.id,
      label: meta.label,
      canHide: column.getCanHide(),
      visible: column.getIsVisible(),
      reorderable: meta.reorderable,
    })
  }
  return listed
}

const NO_HIDDEN_COLUMNS: readonly string[] = []

/** Swaps `id` with the nearest reorderable column on the given side;
 *  fixed columns are skipped over and never move. */
export function moveColumn(
  order: readonly string[],
  reorderable: ReadonlySet<string>,
  id: string,
  direction: -1 | 1
): string[] {
  const next = [...order]
  const from = next.indexOf(id)
  if (from === -1) return next
  for (
    let to = from + direction;
    to >= 0 && to < next.length;
    to += direction
  ) {
    const other = next[to]
    if (other === undefined || !reorderable.has(other)) continue
    next[to] = id
    next[from] = other
    return next
  }
  return next
}

/** Every column in `order` with the reorderable ones replaced, in turn, by
 *  `reordered` — fixed columns keep their positions. */
function withReordered(
  order: readonly string[],
  reorderable: ReadonlySet<string>,
  reordered: readonly string[]
): string[] {
  const queue = [...reordered]
  return order.map((id) => {
    if (!reorderable.has(id)) return id
    const next = queue.shift()
    if (next === undefined) return id
    return next
  })
}

function ColumnRow<TData extends RowData>({
  table,
  column,
  handle,
}: {
  table: DataTable<TData>
  column: MenuColumn
  handle: ReactNode
}) {
  const note = column.canHide ? undefined : "Siempre visible"
  return (
    <CheckboxRow
      as="div"
      id={`data-table-column-${column.id}`}
      label={column.label}
      note={note}
      checked={column.visible}
      disabled={!column.canHide}
      onCheckedChange={(checked) =>
        table.getColumn(column.id)?.toggleVisibility(checked)
      }
      action={handle}
    />
  )
}

/**
 * The table layout's column controls: a checkbox per hideable column, a
 * grip per reorderable column — drag it to a new position, or focus it and
 * press ↑/↓ to move one step (the keyboard path; dragging a header is the
 * other pointer one) — and a reset that restores the default layout and
 * forgets the saved one. Fixed columns are listed first, without a grip.
 */
export function DataTableColumnsMenu<TData extends RowData>({
  table,
  onReset,
  hiddenColumnIds = NO_HIDDEN_COLUMNS,
  className,
}: {
  table: DataTable<TData>
  /** `useColumnPreferences().reset`. */
  onReset: () => void
  /** The table's `forcedHidden` columns: not listed while they don't
   *  apply. */
  hiddenColumnIds?: readonly string[]
  className?: string
}) {
  const columns = menuColumns(table, hiddenColumnIds)
  const fixed = columns.filter((column) => !column.reorderable)
  const movable = columns.filter((column) => column.reorderable)
  const reorderable = new Set(movable.map((column) => column.id))
  const order = table.getAllLeafColumns().map((column) => column.id)

  const list = useSortableList({
    items: movable,
    getId: (column) => column.id,
    onReorder: (ids) =>
      table.setColumnOrder(withReordered(order, reorderable, ids)),
  })

  // A keyboard move re-renders the list; keep focus on the moved grip.
  const [focusId, setFocusId] = useState<string | null>(null)
  const orderKey = order.join("\0")
  useEffect(() => {
    if (focusId === null || orderKey === "") return
    const handle = list.listRef.current?.querySelector<HTMLButtonElement>(
      `[data-column-handle="${focusId}"]`
    )
    handle?.focus()
  }, [focusId, orderKey, list.listRef])

  function onHandleKeyDown(
    id: string,
    event: KeyboardEvent<HTMLButtonElement>
  ) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
    event.preventDefault()
    const direction = event.key === "ArrowUp" ? -1 : 1
    setFocusId(id)
    table.setColumnOrder(moveColumn(order, reorderable, id, direction))
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("h-9", className)}
          />
        }
      >
        <ColumnsIcon className="size-4" />
        Columnas
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-2">
        <Text as="p" variant="label" tone="muted" className="px-2 py-1.5">
          Columnas
        </Text>
        {fixed.map((column) => (
          <ColumnRow
            key={column.id}
            table={table}
            column={column}
            handle={<span aria-hidden className="size-6 shrink-0" />}
          />
        ))}
        <div ref={list.listRef} className="flex flex-col">
          {movable.map((column) => (
            <SortableItem key={column.id} id={column.id} list={list}>
              <ColumnRow
                table={table}
                column={column}
                handle={
                  <SortableHandle
                    label={`Mover ${column.label}: arrastra o usa ↑ y ↓`}
                    data-column-handle={column.id}
                    className="size-6 shrink-0"
                    onKeyDown={(event) => onHandleKeyDown(column.id, event)}
                    {...list.handleProps(column.id)}
                  />
                }
              />
            </SortableItem>
          ))}
        </div>
        <div className="mt-1 border-t pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={onReset}
          >
            <ResetIcon className="size-4" />
            Restablecer columnas
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
