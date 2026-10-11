import { getIcon } from "@/lib/icon-registry"

const SortAscendingIcon = getIcon("views", "sortAscending")
const SortDescendingIcon = getIcon("views", "sortDescending")

import { Hint } from "@/components/shared/feedback/hint"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SortOrder } from "@/hooks/use-sort-query-param"
import { cn } from "@/lib/utils"

export type { SortOrder }

export interface SortOption<K extends string> {
  value: K
  label: string
}

function optionOf<K extends string>(
  options: readonly SortOption<K>[],
  value: unknown
): SortOption<K> | undefined {
  return options.find((option) => option.value === value)
}

/**
 * Ordering for a list without sortable headers (the compact layout of a
 * data table): a key select plus a direction toggle. Render one per
 * place it appears with its own `idSuffix` — a filter sheet and a toolbar can
 * both be mounted while CSS shows one, and they must not share an `id`.
 */
export function SortControls<K extends string>({
  idPrefix,
  idSuffix,
  options,
  value,
  order,
  onChange,
  className,
  selectClassName,
  toggleClassName,
}: {
  /** Unique per page, e.g. `"arp-sort"`. */
  idPrefix: string
  idSuffix: string
  options: readonly SortOption<K>[]
  value: K
  order: SortOrder
  onChange: (next: { sort: K; order: SortOrder }) => void
  className?: string
  selectClassName?: string
  toggleClassName?: string
}) {
  const ascending = order === "asc"
  const orderLabel = ascending
    ? "Orden ascendente: cambiar a descendente"
    : "Orden descendente: cambiar a ascendente"
  const OrderIcon = ascending ? SortAscendingIcon : SortDescendingIcon
  const nextOrder: SortOrder = ascending ? "desc" : "asc"

  return (
    <div className={cn("flex w-full items-center gap-2", className)}>
      <Select
        items={options}
        value={value}
        onValueChange={(next) => {
          const option = optionOf(options, next)
          if (option) onChange({ sort: option.value, order })
        }}
      >
        <SelectTrigger
          id={`${idPrefix}-${idSuffix}`}
          size="sm"
          className={selectClassName}
          aria-label="Ordenar por"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              label={option.label}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Hint label={orderLabel}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("shrink-0", toggleClassName)}
          aria-label={orderLabel}
          onClick={() => onChange({ sort: value, order: nextOrder })}
        >
          <OrderIcon className="size-4" />
        </Button>
      </Hint>
    </div>
  )
}
