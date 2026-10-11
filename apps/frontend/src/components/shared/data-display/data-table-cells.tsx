import type { Row, RowData } from "@tanstack/react-table"
import type { ReactNode } from "react"
import { TableCell } from "@/components/ui/table"
import type { DataTable, DataTableFeatures } from "@/hooks/use-data-table"
import { cn } from "@/lib/utils"

/**
 * A data-table row's visible cells, in the current column order, each with
 * its column's `meta.cellClassName`. A display column (no accessor — an
 * expand toggle, a row-actions cell) or a `meta.rowRendered` one renders
 * `renderControl(columnId)`, so the row that owns the open state or the
 * dialogs keeps rendering it.
 */
export function DataTableCells<TData extends RowData>({
  row,
  table,
  renderControl,
}: {
  row: Row<DataTableFeatures, TData>
  table: DataTable<TData>
  renderControl?: (columnId: string) => ReactNode
}) {
  return (
    <>
      {row.getVisibleCells().map((cell) => {
        const meta = cell.column.columnDef.meta
        const cellClassName = meta?.cellClassName
        if (!cell.column.accessorFn || meta?.rowRendered === true) {
          return (
            <TableCell key={cell.id} className={cellClassName}>
              {renderControl?.(cell.column.id)}
            </TableCell>
          )
        }
        return (
          <TableCell
            key={cell.id}
            className={cn("min-w-0 whitespace-normal", cellClassName)}
          >
            <table.FlexRender cell={cell} />
          </TableCell>
        )
      })}
    </>
  )
}
