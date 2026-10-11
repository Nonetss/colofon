import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

/** Whether optional sign-in methods (e.g. SSO) are configured on the server. */
export function useAuthConfig() {
  return useQuery(orpc.v1.authConfig.get.queryOptions())
}
