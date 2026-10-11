import { useQuery } from "@tanstack/react-query"
import { adminUserKeys } from "@/lib/admin-user-keys"
import { authClient, unwrapAuth } from "@/lib/auth-client"

async function countUsers(filter?: {
  filterField: string
  filterValue: string | boolean
}) {
  const data = await unwrapAuth(
    authClient.admin.listUsers({
      query: {
        limit: 1,
        ...(filter
          ? {
              filterField: filter.filterField,
              filterValue: filter.filterValue,
              filterOperator: "eq",
            }
          : {}),
      },
    })
  )
  return data.total
}

export function useAdminStats() {
  return useQuery({
    queryKey: adminUserKeys.stats(),
    queryFn: async () => {
      const [total, admins, banned] = await Promise.all([
        countUsers(),
        countUsers({ filterField: "role", filterValue: "admin" }),
        countUsers({ filterField: "banned", filterValue: true }),
      ])
      return { total, admins, banned }
    },
  })
}
