import { useQuery } from "@tanstack/react-query"
import { orpc } from "@/lib/orpc"

/** One trace, its spans already in waterfall order. */
export function useTrace(traceId: string) {
  return useQuery(orpc.v1.traces.get.queryOptions({ input: { traceId } }))
}
