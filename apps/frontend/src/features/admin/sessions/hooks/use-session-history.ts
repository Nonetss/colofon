import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import type {
  SessionSortKey,
  SessionStatus,
} from "@/features/admin/sessions/definitions/session-columns.definition"
import type { SessionRecord } from "@/features/admin/sessions/model/types"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { orpc } from "@/lib/orpc"

const PAGE_SIZE = 25

function listInput<T>(values: readonly T[]): T[] | undefined {
  if (values.length === 0) return undefined
  return [...values]
}

/** The session history in the table's order and filters, sorted, filtered
 *  and paged by the server; both are part of the query, so a change starts
 *  again from the first page. */
export function useSessionHistory(
  ordering: SortOrdering<SessionSortKey>,
  filters: { statuses: readonly SessionStatus[]; userIds: readonly string[] }
) {
  const query = useInfiniteQuery({
    ...orpc.v1.sessionHistory.list.infiniteOptions({
      input: (cursor: string | null) => ({
        sort: ordering.sort,
        order: ordering.order,
        statuses: listInput(filters.statuses),
        userIds: listInput(filters.userIds),
        limit: PAGE_SIZE,
        cursor,
      }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }),
  })

  return {
    sessions:
      query.data?.pages.flatMap((page) => page.sessions) ??
      ([] as SessionRecord[]),
    total: query.data?.pages.at(-1)?.total ?? 0,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
