import { Text } from "@/components/shared/brand/typography"
import { Button } from "@/components/ui/button"
import { getIcon } from "@/lib/icon-registry"

const FilterX = getIcon("views", "clearFilters")

/**
 * The `emptyMessage` of a `DataTableView` whose filters hide every row: a
 * muted line naming what didn't match plus the action that clears them.
 * `clearable` hides the action when no filter is active, so the message never
 * offers a no-op. It renders inside the table's box, so it stays small; a
 * whole page left empty by its filters uses `QueryState`'s `filteredEmpty`
 * instead.
 */
export function FilteredEmpty({
  message,
  onClear,
  clearable = true,
  clearLabel = "Limpiar filtros",
}: {
  /** What didn't match, e.g. "Ningún usuario coincide con los filtros." */
  message: string
  /** Clears the active filters. */
  onClear: () => void
  /** Shows the clear action; pass `false` while no filter is active. */
  clearable?: boolean
  clearLabel?: string
}) {
  return (
    <div className="grid justify-items-center gap-2">
      <Text tone="muted">{message}</Text>
      {clearable && (
        <Button variant="outline" size="sm" onClick={onClear}>
          <FilterX />
          {clearLabel}
        </Button>
      )}
    </div>
  )
}
