import { Text } from "@/components/shared/brand/typography"
import { Button } from "@/components/ui/button"

/**
 * The `emptyMessage` of a data table whose filters match no rows: a muted
 * sentence plus the action that clears them. `clearable` hides the action
 * when no filter is active, so the message never offers a no-op.
 */
export function FilteredEmpty({
  message,
  onClear,
  clearable = true,
  clearLabel = "Limpiar filtros",
}: {
  message: string
  onClear: () => void
  clearable?: boolean
  clearLabel?: string
}) {
  return (
    <div className="grid justify-items-center gap-2">
      <Text tone="muted">{message}</Text>
      {clearable && (
        <Button variant="outline" size="sm" onClick={onClear}>
          {clearLabel}
        </Button>
      )}
    </div>
  )
}
