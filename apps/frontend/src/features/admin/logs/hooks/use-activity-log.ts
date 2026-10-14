import { useInfiniteQuery } from "@tanstack/react-query"
import { endOfDay, startOfDay } from "date-fns"
import type { LogSortKey } from "@/features/admin/logs/definitions/log-columns.definition"
import type {
  ActivityLogEntry,
  ActivityLogFilters,
} from "@/features/admin/logs/model/types"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { orpc } from "@/lib/orpc"

const PAGE_SIZE = 50

function listInput<T>(values: readonly T[]): T[] | undefined {
  if (values.length === 0) return undefined
  return [...values]
}

function textInput(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed
}

function dayStart(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return startOfDay(date).toISOString()
}

function dayEnd(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return endOfDay(date).toISOString()
}

/** The activity log, filtered and paged by the server in the table's time
 *  order; the order and filters are part of the query, so a change starts
 *  again from the first page. */
export function useActivityLog(
  ordering: SortOrdering<LogSortKey>,
  filters: ActivityLogFilters
) {
  const query = useInfiniteQuery({
    ...orpc.v1.logs.query.infiniteOptions({
      input: (cursor: string | null) => ({
        userIds: listInput(filters.userIds),
        types: listInput(filters.types),
        methods: listInput(filters.methods),
        statuses: listInput(filters.statuses),
        path: textInput(filters.path),
        from: dayStart(filters.from),
        to: dayEnd(filters.to),
        traceId: textInput(filters.traceId),
        order: ordering.order,
        cursor,
        limit: PAGE_SIZE,
      }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
  })

  return {
    entries:
      query.data?.pages.flatMap((page) => page.entries) ??
      ([] as ActivityLogEntry[]),
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  }
}
