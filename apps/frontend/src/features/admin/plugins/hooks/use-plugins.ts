import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

export const usePluginsList = () =>
  useQuery(orpc.v1.plugins.list.queryOptions())
