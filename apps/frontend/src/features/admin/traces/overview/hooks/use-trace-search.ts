import { useQuery } from "@tanstack/react-query"
import { endOfDay, startOfDay } from "date-fns"
import type { TraceService } from "@/features/admin/traces/shared"
import { orpc } from "@/lib/orpc"

/** Tempo's search can't page, so one read brings the newest matches. */
export const TRACE_SEARCH_LIMIT = 100

export interface TraceSearchFilters {
  services: readonly TraceService[]
  errorsOnly: boolean
  /** Already debounced; `undefined` for any duration. */
  minDurationMs: number | undefined
  /** Substring of the root span name, already debounced. */
  name: string
  /** Calendar day lower bound, interpreted as 00:00 local. */
  from: Date | undefined
  /** Calendar day upper bound, interpreted as 23:59:59.999 local. */
  to: Date | undefined
}

/** The procedure filters by one root service: a single choice narrows the
 *  search, none or both keep every service. */
function serviceInput(
  services: readonly TraceService[]
): TraceService | undefined {
  if (services.length !== 1) return undefined
  return services[0]
}

function textInput(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed
}

function dayStart(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return startOfDay(date).toISOString()
}

function dayEnd(date: Date | undefined): string | undefined {
  if (!date) return undefined
  return endOfDay(date).toISOString()
}

function errorsOnlyInput(errorsOnly: boolean): true | undefined {
  if (!errorsOnly) return undefined
  return true
}

/** The newest traces matching the filters; the filters are the query's
 *  input, so a change runs a new search. */
export function useTraceSearch(filters: TraceSearchFilters) {
  return useQuery(
    orpc.v1.traces.search.queryOptions({
      input: {
        service: serviceInput(filters.services),
        errorsOnly: errorsOnlyInput(filters.errorsOnly),
        minDurationMs: filters.minDurationMs,
        name: textInput(filters.name),
        from: dayStart(filters.from),
        to: dayEnd(filters.to),
        limit: TRACE_SEARCH_LIMIT,
      },
    })
  )
}
