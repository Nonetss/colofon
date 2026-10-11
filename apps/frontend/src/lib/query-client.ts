import {
  COMMON_ERROR_STATUS_MAP,
  MalformedResponseError,
  ORPCError,
} from "@orpc/client"
import { QueryClient } from "@tanstack/react-query"

/** Attempts after the first failure, the same count as TanStack's default. */
export const MAX_QUERY_RETRIES = 3

/** Client errors that a later attempt can still fix. */
const TRANSIENT_CLIENT_STATUSES = new Set([408, 429])

/** oRPC v2 errors carry a `code`; this is the status the server sent for it. */
const ORPC_ERROR_STATUSES = new Map<string, number>(
  Object.entries(COMMON_ERROR_STATUS_MAP)
)

/**
 * The HTTP status behind an error, if any: an `ORPCError`'s code, the response
 * of a non-oRPC answer (a gateway page), or the numeric `status` of Better
 * Auth's client errors. Network failures have none.
 */
function statusOf(error: unknown): number | undefined {
  if (error instanceof ORPCError) return ORPC_ERROR_STATUSES.get(error.code)
  if (error instanceof MalformedResponseError) return error.response.status
  if (typeof error !== "object" || error === null) return undefined
  if (!("status" in error)) return undefined
  if (typeof error.status !== "number") return undefined
  return error.status
}

/**
 * A 4xx answer won't change by asking again (a deleted resource, a missing
 * permission), so it surfaces at once; timeouts, rate limits, server errors
 * and network failures are retried with TanStack's default backoff.
 */
export function shouldRetryQuery(failureCount: number, error: unknown) {
  const status = statusOf(error)
  if (
    status !== undefined &&
    status >= 400 &&
    status < 500 &&
    !TRANSIENT_CLIENT_STATUSES.has(status)
  ) {
    return false
  }
  return failureCount < MAX_QUERY_RETRIES
}

let browserQueryClient: QueryClient | undefined

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: shouldRetryQuery,
      },
    },
  })
}

/**
 * Returns a singleton QueryClient on the browser so that separate Astro
 * islands rendered on the same page share one cache. On the server a fresh
 * client is created per request.
 */
export function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient()
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient()
  }
  return browserQueryClient
}
