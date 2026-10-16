import { getIcon } from "@/lib/icon-registry"

const FirstIcon = getIcon("controls", "first")
const LastIcon = getIcon("controls", "last")
const NextIcon = getIcon("controls", "next")
const PreviousIcon = getIcon("controls", "previous")

import type { ComponentType } from "react"
import { Text } from "@/components/shared/brand/typography"
import { FilteredEmpty } from "@/components/shared/data-display/filtered-empty"
import { Hint } from "@/components/shared/feedback/hint"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PAGE_SIZES } from "@/features/docs/tables/model/table-view"

function PageButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string
  icon: ComponentType<{ className?: string }>
  disabled: boolean
  onClick: () => void
}) {
  return (
    <Hint label={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        disabled={disabled}
        onClick={onClick}
      >
        <Icon className="size-4" />
      </Button>
    </Hint>
  )
}

function sizeLabel(size: number, total: number): string {
  if (size === total) return "Todas"
  return `${size} por página`
}

export interface DocTablePagerProps {
  pageIndex: number
  pageCount: number
  pageSize: number
  /** Every row of the table, the "Todas" option. */
  total: number
  /** "Página 2 de 5". */
  label: string
  onPage: (pageIndex: number) => void
  onPageSize: (pageSize: number) => void
}

/** The pages of a long table: its size, and first, previous, next and last. */
export function DocTablePager({
  pageIndex,
  pageCount,
  pageSize,
  total,
  label,
  onPage,
  onPageSize,
}: DocTablePagerProps) {
  const items = [...PAGE_SIZES, total].map((size) => ({
    value: String(size),
    label: sizeLabel(size, total),
  }))
  const current = items.find((item) => item.value === String(pageSize))
  const first = pageIndex === 0
  const last = pageIndex >= pageCount - 1
  return (
    <nav
      aria-label="Páginas de la tabla"
      className="flex flex-wrap items-center justify-end gap-1"
    >
      <Select
        items={items}
        value={String(pageSize)}
        onValueChange={(next) => {
          if (next !== null) onPageSize(Number(next))
        }}
      >
        <SelectTrigger aria-label="Filas por página" size="sm" className="mr-2">
          <SelectValue>{current?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value} label={item.label}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PageButton
        label="Primera página"
        icon={FirstIcon}
        disabled={first}
        onClick={() => onPage(0)}
      />
      <PageButton
        label="Página anterior"
        icon={PreviousIcon}
        disabled={first}
        onClick={() => onPage(pageIndex - 1)}
      />
      <Text variant="data" tone="muted" className="px-1">
        {label}
      </Text>
      <PageButton
        label="Página siguiente"
        icon={NextIcon}
        disabled={last}
        onClick={() => onPage(pageIndex + 1)}
      />
      <PageButton
        label="Última página"
        icon={LastIcon}
        disabled={last}
        onClick={() => onPage(pageCount - 1)}
      />
    </nav>
  )
}

/** When the filters leave no row: says so and offers to clear them. */
export function DocTableEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="py-6">
      <FilteredEmpty
        message="Ninguna fila coincide."
        onClear={onClear}
        clearLabel="Quitar filtros"
      />
    </div>
  )
}
