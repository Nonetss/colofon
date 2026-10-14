import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  dayEnd,
  dayStart,
} from "@/features/admin/traces/overview/model/day-range"
import { orpc } from "@/lib/orpc"

/** Tempo's names, plus the kept ones it no longer lists (another day
 *  range, or a link), so a kept name can still be unticked. */
function withSelected(
  names: readonly string[],
  selected: readonly string[]
): string[] {
  const listed = new Set(names)
  const missing = selected.filter((name) => !listed.has(name))
  return [...names, ...missing]
}

/** The root span names the trace list can be filtered by: every name Tempo
 *  saw in the day range. */
export function useTraceRootNames(
  range: { from: Date | undefined; to: Date | undefined },
  selected: readonly string[]
): string[] {
  const { data } = useQuery(
    orpc.v1.traces.rootNames.queryOptions({
      input: { from: dayStart(range.from), to: dayEnd(range.to) },
      placeholderData: keepPreviousData,
    })
  )
  const names = data?.names
  return useMemo(() => withSelected(names ?? [], selected), [names, selected])
}
