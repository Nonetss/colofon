import { useInfiniteQuery } from "@tanstack/react-query"
import type {
  UserRole,
  UserSortKey,
  UserStatus,
} from "@/features/admin/users/definitions/user-columns.definition"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { orpc } from "@/lib/orpc"

const PAGE_SIZE = 25

export interface UsersListFilters {
  ids: readonly string[]
  roles: readonly UserRole[]
  statuses: readonly UserStatus[]
}

function listInput<T>(values: readonly T[]): T[] | undefined {
  if (values.length === 0) return undefined
  return [...values]
}

/**
 * The administrator user list in the table's order and filters, sorted,
 * filtered and paged by the server for infinite scrolling; both are part of
 * the query, so a change starts again from the first page.
 */
export function useUsersList(
  ordering: SortOrdering<UserSortKey>,
  filters: UsersListFilters
) {
  const query = useInfiniteQuery({
    ...orpc.v1.adminUser.list.infiniteOptions({
      input: (cursor: string | null) => ({
        sort: ordering.sort,
        order: ordering.order,
        ids: listInput(filters.ids),
        roles: listInput(filters.roles),
        statuses: listInput(filters.statuses),
        limit: PAGE_SIZE,
        cursor,
      }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
  })

  return {
    users: query.data?.pages.flatMap((page) => page.users) ?? [],
    total: query.data?.pages.at(-1)?.total ?? 0,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
