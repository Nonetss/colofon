import { useSearchSuggestions } from "@/hooks/use-search-suggestions"
import { adminUserKeys } from "@/lib/admin-user-keys"
import { orpc } from "@/lib/orpc"

const RESULT_LIMIT = 5

export interface AdminUserSearchResult {
  id: string
  name: string
  email: string
}

/**
 * Debounced user search over `v1.adminUser.list`, matching the name or the
 * email in one go, shared by every "pick a user" control (cron runs-as, log
 * and session filters, the users table filter, org member add). Keeps the
 * query key/shape and the >=2-char threshold identical across all of them.
 */
export function useAdminUserSearch(searchInput: string) {
  return useSearchSuggestions<AdminUserSearchResult>(searchInput, {
    queryKeyPrefix: adminUserKeys.search(),
    queryFn: (search) =>
      orpc.v1.adminUser.list
        .call(
          { search, sort: "name", order: "asc", limit: RESULT_LIMIT },
          { context: { read: true } }
        )
        .then((page) =>
          page.users.map((user) => ({
            id: user.id,
            name: user.name,
            email: user.email,
          }))
        ),
  })
}
