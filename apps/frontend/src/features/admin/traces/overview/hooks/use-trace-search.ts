import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query"
import { useMemo } from "react"
import {
  dayEnd,
  dayStart,
} from "@/features/admin/traces/overview/model/day-range"
import type { TraceService, TraceSummary } from "@/features/admin/traces/shared"
import { orpc } from "@/lib/orpc"

const PAGE_SIZE = 50

export interface TraceSearchFilters {
  services: readonly TraceService[]
  errorsOnly: boolean
  /** Already debounced; `undefined` for any duration. */
  minDurationMs: number | undefined
  /** Root span names to keep; none keeps all. */
  names: readonly string[]
  /** Calendar day lower bound, interpreted as 00:00 local. */
  from: Date | undefined
  /** Calendar day upper bound, interpreted as 23:59:59.999 local. */
  to: Date | undefined
}

/** The chosen values; none chosen keeps all. */
function listInput<T>(values: readonly T[]): T[] | undefined {
  if (values.length === 0) return undefined
  return [...values]
}

function errorsOnlyInput(errorsOnly: boolean): true | undefined {
  if (!errorsOnly) return undefined
  return true
}

const NO_TRACES: TraceSummary[] = []

/** Every loaded page's traces, in page order: newest first. */
function tracesOf(
  data: { pages: { traces: TraceSummary[] }[] } | undefined
): TraceSummary[] {
  if (data === undefined) return NO_TRACES
  return data.pages.flatMap((page) => page.traces)
}

/** The traces matching the filters, newest first, paged by the server; the
 *  filters are the query's input, so a change starts again from the first
 *  page while the previous results stay on screen. */
export function useTraceSearch(filters: TraceSearchFilters) {
  const query = useInfiniteQuery({
    ...orpc.v1.traces.search.infiniteOptions({
      input: (cursor: string | null) => ({
        services: listInput(filters.services),
        errorsOnly: errorsOnlyInput(filters.errorsOnly),
        minDurationMs: filters.minDurationMs,
        names: listInput(filters.names),
        from: dayStart(filters.from),
        to: dayEnd(filters.to),
        cursor,
        limit: PAGE_SIZE,
      }),
      initialPageParam: null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      placeholderData: keepPreviousData,
    }),
  })

  const traces = useMemo(() => tracesOf(query.data), [query.data])

  return {
    traces,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
    isPending: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  }
}
