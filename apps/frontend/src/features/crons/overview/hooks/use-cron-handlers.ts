import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

export const useCronHandlers = () =>
  useQuery(orpc.v1.cron.handlers.queryOptions())
