import { getIcon } from "@/lib/icon-registry"

const FilterIcon = getIcon("views", "filterByValue")
const SortAscendingIcon = getIcon("views", "sortAscending")
const SortDescendingIcon = getIcon("views", "sortDescending")
const ChevronDown = getIcon("controls", "expand")

import { type ReactNode, useId, useState } from "react"
import { Text } from "@/components/shared/brand/typography"
import { Hint } from "@/components/shared/feedback/hint"
import { CheckboxRow } from "@/components/shared/form/checkbox-row"
import { SearchInput } from "@/components/shared/form/search-input"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { foldText } from "@/lib/fold-text"
import { cn } from "@/lib/utils"

export interface DataTableFilterOption {
  value: string
  label: string
  /** Secondary text, also matched by the search (a handler key). */
  detail?: string
  /** Rows with this value under the other active filters. */
  count?: number
}

/** A search the caller runs (on the server) for a column with too many
 *  values to list: the panel shows the caller's results as options. */
export interface DataTableFilterSearch {
  query: string
  onQueryChange: (query: string) => void
  isLoading?: boolean
  /** Shown while there are no results to list (e.g. "write two letters"). */
  hint?: string
}

/**
 * A column's value filter: the values it keeps (`selected`), empty meaning
 * every value. Options are the values the column can take — or, with
 * `search`, the selected values plus the caller's search results, and a
 * checkbox is checked only for a kept value.
 */
export interface DataTableFilter {
  options: readonly DataTableFilterOption[]
  selected: readonly string[]
  onChange: (next: string[]) => void
  search?: DataTableFilterSearch
}

export interface DataTableFilterSort {
  direction: false | "asc" | "desc"
  onSort: (desc: boolean) => void
}

function matches(option: DataTableFilterOption, query: string): boolean {
  if (!query) return true
  if (foldText(option.label).includes(query)) return true
  if (option.detail && foldText(option.detail).includes(query)) return true
  return false
}

function visibleOptions(
  filter: DataTableFilter,
  folded: string
): readonly DataTableFilterOption[] {
  // A remote search already returned only the matches.
  if (filter.search) return filter.options
  return filter.options.filter((option) => matches(option, folded))
}

function triggerLabelOf(
  label: string,
  filter: DataTableFilter,
  total: number
): string {
  const kept = filter.selected.length
  if (kept === 0) return `Filtrar ${label}`
  if (filter.search) return `Filtrar ${label} (${kept} seleccionados)`
  return `Filtrar ${label} (${kept} de ${total})`
}

function emptyTextOf(filter: DataTableFilter, folded: string): string {
  if (filter.search?.isLoading) return "Buscando…"
  if (filter.search?.hint && !folded) return filter.search.hint
  return "Ningún valor coincide."
}

/** The selection after toggling `value`, where an empty selection means
 *  every value is kept: unchecking from "all" keeps the rest, and checking
 *  the last unchecked value goes back to "all". */
export function toggleFilterValue(
  selected: readonly string[],
  values: readonly string[],
  value: string
): string[] {
  const current = selected.length === 0 ? [...values] : [...selected]
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value]
  if (next.length === values.length) return []
  return values.filter((item) => next.includes(item))
}

/** The selection after toggling `value` in a filter whose values are not
 *  all listed: the selection is exactly the checked values. */
export function toggleIncludedValue(
  selected: readonly string[],
  value: string
): string[] {
  if (selected.includes(value)) {
    return selected.filter((item) => item !== value)
  }
  return [...selected, value]
}

/** The selection keeping only `value`, which is "every value" when the
 *  column has no other. */
export function onlyValue(values: readonly string[], value: string): string[] {
  if (values.length === 1) return []
  return [value]
}

function SortItem({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent",
        active && "text-primary"
      )}
    >
      {children}
    </button>
  )
}

/**
 * Excel-style filter of one column: sort A→Z / Z→A (when the column sorts),
 * a search over the column's values, "Seleccionar todo" and one checkbox per
 * value with its count. Changes apply as they are made. In the header it is
 * an icon at the cell's trailing edge, lit while the column filters; in the
 * compact layout a button with the column's name.
 */
export function DataTableColumnFilter({
  label,
  filter,
  sort,
  placement,
}: {
  label: string
  filter: DataTableFilter
  sort?: DataTableFilterSort
  placement: "header" | "compact"
}) {
  const [localQuery, setLocalQuery] = useState("")
  // "Seleccionar todo" clicked while every value was kept: every box shows
  // unchecked so one value can be picked, but the column keeps filtering
  // nothing until one is checked (closing the panel goes back to "all").
  const [cleared, setCleared] = useState(false)
  const idPrefix = useId()
  const remote = filter.search
  const query = remote ? remote.query : localQuery
  const setQuery = remote ? remote.onQueryChange : setLocalQuery
  const values = filter.options.map((option) => option.value)
  const active = filter.selected.length > 0
  const folded = foldText(query.trim())
  const visible = visibleOptions(filter, folded)
  const showsCleared = cleared && !active
  const allChecked = !active && !showsCleared
  const isChecked = (value: string) => {
    if (remote) return filter.selected.includes(value)
    if (showsCleared) return false
    return !active || filter.selected.includes(value)
  }
  const toggle = (value: string) => {
    if (remote) {
      filter.onChange(toggleIncludedValue(filter.selected, value))
      return
    }
    if (showsCleared) {
      setCleared(false)
      filter.onChange(onlyValue(values, value))
      return
    }
    filter.onChange(toggleFilterValue(filter.selected, values, value))
  }
  const toggleAll = () => {
    if (allChecked) {
      setCleared(true)
      return
    }
    setCleared(false)
    filter.onChange([])
  }
  const triggerLabel = triggerLabelOf(label, filter, values.length)

  // Keeping only the search's matches, Excel's "search, then OK".
  const keepVisible = () => {
    setCleared(false)
    const kept = visible.map((option) => option.value)
    if (!remote && kept.length === values.length) {
      filter.onChange([])
      return
    }
    filter.onChange(kept)
  }

  const trigger =
    placement === "header" ? (
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={triggerLabel}
            className={cn(
              "size-6 shrink-0 text-muted-foreground hover:text-foreground",
              active && "bg-primary/10 text-primary hover:text-primary"
            )}
            onPointerDown={(event) => event.stopPropagation()}
          />
        }
      >
        <FilterIcon className="size-3.5" />
      </PopoverTrigger>
    ) : (
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label={triggerLabel}
            className={cn(
              "h-9 w-full justify-between gap-2",
              active && "border-primary/40 text-primary"
            )}
          />
        }
      >
        <span className="truncate">{label}</span>
        <span className="flex items-center gap-1.5">
          {active ? (
            <span className="tabular-nums">{filter.selected.length}</span>
          ) : null}
          <ChevronDown className="size-4 opacity-60" />
        </span>
      </PopoverTrigger>
    )

  const anchor =
    placement === "header" ? (
      <Hint label={`Filtrar ${label}`}>{trigger}</Hint>
    ) : (
      trigger
    )

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open) setCleared(false)
      }}
    >
      {anchor}
      <PopoverContent align="end" className="w-72 p-2">
        {sort ? (
          <div className="mb-2 border-b pb-2">
            <SortItem
              active={sort.direction === "asc"}
              onClick={() => sort.onSort(false)}
            >
              <SortAscendingIcon className="size-4" />
              Ordenar de A a Z
            </SortItem>
            <SortItem
              active={sort.direction === "desc"}
              onClick={() => sort.onSort(true)}
            >
              <SortDescendingIcon className="size-4" />
              Ordenar de Z a A
            </SortItem>
          </div>
        ) : null}
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Buscar…"
          label={`Buscar valores de ${label}`}
        />
        <div className="mt-2 max-h-64 overflow-y-auto">
          {visible.length === 0 ? (
            <Text as="p" variant="compact" tone="muted" className="px-2 py-3">
              {emptyTextOf(filter, folded)}
            </Text>
          ) : (
            <ul aria-label={`Valores de ${label}`} className="grid gap-0.5">
              {folded ? (
                <li>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={keepVisible}
                  >
                    Solo estos resultados ({visible.length})
                  </Button>
                </li>
              ) : null}
              {!folded && !remote ? (
                <CheckboxRow
                  id={`${idPrefix}-all`}
                  label="Seleccionar todo"
                  emphasis
                  checked={allChecked}
                  onCheckedChange={toggleAll}
                />
              ) : null}
              {visible.map((option, index) => (
                <CheckboxRow
                  key={option.value}
                  id={`${idPrefix}-${index}`}
                  label={option.label}
                  detail={option.detail}
                  count={option.count}
                  checked={isChecked(option.value)}
                  onCheckedChange={() => toggle(option.value)}
                />
              ))}
            </ul>
          )}
        </div>
        {active ? (
          <div className="mt-2 border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => filter.onChange([])}
            >
              Quitar filtro
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
