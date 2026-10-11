import { skipToken, useQuery } from "@tanstack/react-query"
import { adminUserKeys } from "@/lib/admin-user-keys"
import { authClient, unwrapAuth } from "@/lib/auth-client"

/** Loads the user once there is an id; skipped (no request) until then. */
function getUserFn(userId: string | null) {
  if (!userId) return skipToken
  return () => unwrapAuth(authClient.admin.getUser({ query: { id: userId } }))
}

/** Single-user lookup by id, shared by every detail view that shows "runs as" / "actor" info (cron detail, log filter). */
export function useAdminUser(userId: string | null) {
  return useQuery({
    queryKey: adminUserKeys.byId(userId),
    queryFn: getUserFn(userId),
  })
}
