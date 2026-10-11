import type { OnChangeFn, SortingState } from "@tanstack/react-table"
import { useCallback, useMemo } from "react"
import { type QueryParamCodec, useQueryParam } from "@/hooks/use-query-param"

export type SortOrder = "asc" | "desc"

export interface SortOrdering<K extends string> {
  sort: K
  order: SortOrder
}

const orderCodec: QueryParamCodec<SortOrder> = {
  parse: (raw) => {
    if (raw === "desc") return "desc"
    return "asc"
  },
  serialize: (value) => value,
}

function isSortKey<K extends string>(
  keys: readonly K[],
  value: string
): value is K {
  return keys.some((key) => key === value)
}

/**
 * A data table's single-column sort kept in the page URL (`?sort=<key>` and
 * `?order=asc|desc`), as TanStack's `SortingState` plus the matching setter,
 * so both can be passed straight to `useDataTable`. A key outside `keys`
 * (a hand-edited URL) reads as the default, and each param is dropped while
 * it equals the default. `fallback` is the list's natural order, or `null`
 * for rows kept in the order they arrive in; keep it and `keys` module-level
 * constants, since the returned state is memoized on them.
 *
 * Also returns the ordering as `{ sort, order }` (or `null` when unsorted)
 * for a server read's input.
 */
export function useSortQueryParam<K extends string>(
  keys: readonly K[],
  fallback: SortOrdering<K>
): [SortingState, OnChangeFn<SortingState>, SortOrdering<K>]
export function useSortQueryParam<K extends string>(
  keys: readonly K[],
  fallback: SortOrdering<K> | null
): [SortingState, OnChangeFn<SortingState>, SortOrdering<K> | null]
export function useSortQueryParam<K extends string>(
  keys: readonly K[],
  fallback: SortOrdering<K> | null
): [SortingState, OnChangeFn<SortingState>, SortOrdering<K> | null] {
  const defaultSort = fallback?.sort ?? ""
  const defaultOrder = fallback?.order ?? "asc"
  const [rawSort, setRawSort] = useQueryParam("sort", defaultSort)
  const [order, setOrder] = useQueryParam<SortOrder>(
    "order",
    defaultOrder,
    orderCodec
  )

  const ordering = useMemo(() => {
    if (!isSortKey(keys, rawSort)) {
      if (fallback === null) return null
      return { sort: fallback.sort, order }
    }
    return { sort: rawSort, order }
  }, [keys, rawSort, order, fallback])

  const sorting = useMemo<SortingState>(() => {
    if (ordering === null) return []
    return [{ id: ordering.sort, desc: ordering.order === "desc" }]
  }, [ordering])

  const setSorting = useCallback<OnChangeFn<SortingState>>(
    (updater) => {
      const next = typeof updater === "function" ? updater(sorting) : updater
      const active = next[0]
      if (!active || !isSortKey(keys, active.id)) return
      const nextOrder: SortOrder = active.desc ? "desc" : "asc"
      setRawSort(active.id)
      setOrder(nextOrder)
    },
    [keys, sorting, setRawSort, setOrder]
  )

  return [sorting, setSorting, ordering]
}
