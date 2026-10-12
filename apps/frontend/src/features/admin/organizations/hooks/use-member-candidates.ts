import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { orpc } from "@/lib/orpc"

const PAGE_SIZE = 25
const MIN_SEARCH_LENGTH = 2

function searchInput(search: string): string | undefined {
  const trimmed = search.trim()
  if (trimmed.length < MIN_SEARCH_LENGTH) return undefined
  return trimmed
}

/**
 * Users that can be added to an organization, sorted by name and paged by
 * the server for infinite scrolling. Every user is listed up front; a
 * debounced search of 2+ characters narrows the list by name or email, and
 * `excludeIds` hides the users that are already members.
 */
export function useMemberCandidates(
  search: string,
  excludeIds: readonly string[]
) {
  const debouncedSearch = useDebouncedValue(search)
  const query = useInfiniteQuery({
    ...orpc.v1.adminUser.list.infiniteOptions({
      input: (cursor: string | null) => ({
        search: searchInput(debouncedSearch),
        sort: "name",
        order: "asc",
        limit: PAGE_SIZE,
        cursor,
      }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }),
    placeholderData: keepPreviousData,
  })

  const users = (query.data?.pages.flatMap((page) => page.users) ?? []).filter(
    (user) => !excludeIds.includes(user.id)
  )

  return {
    users,
    isPending: query.isPending,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  }
}
