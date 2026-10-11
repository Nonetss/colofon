import { useInfiniteQuery } from "@tanstack/react-query"
import { endOfDay, startOfDay } from "date-fns"
import { useMemo, useState } from "react"
import type { LogSortKey } from "@/features/admin/logs/definitions/log-columns.definition"
import type {
  ActivityLogEntry,
  ActivityLogFilters,
} from "@/features/admin/logs/model/types"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { orpc } from "@/lib/orpc"

const PAGE_SIZE = 50

const emptyFilters: ActivityLogFilters = {
  userId: "",
  type: "all",
  method: "all",
  path: "",
  from: undefined,
  to: undefined,
}

/** The activity log, filtered and paged by the server in the table's time
 *  order; the order is part of the query, so a new one starts again from
 *  the first page. */
export function useActivityLog(ordering: SortOrdering<LogSortKey>) {
  const [filters, setFilters] = useState<ActivityLogFilters>(emptyFilters)

  const queryInput = useMemo(
    () => ({
      userId: filters.userId.trim() || undefined,
      type: filters.type === "all" ? undefined : filters.type,
      method: filters.method === "all" ? undefined : filters.method,
      path: filters.path.trim() || undefined,
      from: filters.from ? startOfDay(filters.from).toISOString() : undefined,
      to: filters.to ? endOfDay(filters.to).toISOString() : undefined,
    }),
    [filters]
  )

  const query = useInfiniteQuery({
    ...orpc.v1.logs.query.infiniteOptions({
      input: (cursor: string | null) => ({
        ...queryInput,
        order: ordering.order,
        cursor,
        limit: PAGE_SIZE,
      }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
  })

  const entries =
    query.data?.pages.flatMap((page) => page.entries) ??
    ([] as ActivityLogEntry[])

  const activeCount =
    (filters.userId.trim() ? 1 : 0) +
    (filters.type !== "all" ? 1 : 0) +
    (filters.method !== "all" ? 1 : 0) +
    (filters.path.trim() ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0)

  return {
    entries,
    filters,
    setFilters,
    clearFilters: () => setFilters(emptyFilters),
    activeCount,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  }
}
