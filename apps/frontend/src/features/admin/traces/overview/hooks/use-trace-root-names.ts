import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import type { RootNameGroup } from "@/features/admin/traces/overview/model/root-name-tree"
import { orpc } from "@/lib/orpc"

/** Tempo's names by root service, plus a group (service `""`) for the kept
 *  ones it no longer lists (older than its window, or a link), so a kept name
 *  can still be unticked. */
function withSelected(
  groups: readonly RootNameGroup[],
  selected: readonly string[]
): RootNameGroup[] {
  const listed = new Set(groups.flatMap((group) => group.names))
  const missing = selected.filter((name) => !listed.has(name))
  if (missing.length === 0) return [...groups]
  return [...groups, { service: "", names: missing }]
}

/** The root span names the trace list can be filtered by: every name Tempo
 *  saw in its default window, grouped by the service that started the
 *  trace. */
export function useTraceRootNames(
  selected: readonly string[]
): RootNameGroup[] {
  const { data } = useQuery(
    orpc.v1.traces.rootNames.queryOptions({
      input: {},
      placeholderData: keepPreviousData,
    })
  )
  const groups = data?.groups
  return useMemo(() => withSelected(groups ?? [], selected), [groups, selected])
}
