import { describe, expect, test } from "bun:test"
import { ORPCError } from "@orpc/client"
import { MAX_QUERY_RETRIES, shouldRetryQuery } from "@/lib/query-client"

describe("shouldRetryQuery", () => {
  test("does not retry an oRPC client error", () => {
    expect(shouldRetryQuery(0, new ORPCError("NOT_FOUND"))).toBe(false)
    expect(shouldRetryQuery(0, new ORPCError("UNAUTHORIZED"))).toBe(false)
  })

  test("does not retry a Better Auth client error", () => {
    expect(shouldRetryQuery(0, { status: 403, statusText: "Forbidden" })).toBe(
      false
    )
  })

  test("retries transient client errors", () => {
    expect(shouldRetryQuery(0, new ORPCError("TIMEOUT"))).toBe(true)
    expect(shouldRetryQuery(0, new ORPCError("TOO_MANY_REQUESTS"))).toBe(true)
    expect(shouldRetryQuery(0, { status: 429 })).toBe(true)
  })

  test("retries server errors and errors without a status", () => {
    expect(shouldRetryQuery(0, new ORPCError("INTERNAL_SERVER_ERROR"))).toBe(
      true
    )
    expect(shouldRetryQuery(0, new ORPCError("SOME_UNMAPPED_CODE"))).toBe(true)
    expect(shouldRetryQuery(0, new TypeError("Failed to fetch"))).toBe(true)
    expect(shouldRetryQuery(0, "boom")).toBe(true)
    expect(shouldRetryQuery(0, { status: "500" })).toBe(true)
  })

  test("stops retrying at the attempt limit", () => {
    expect(shouldRetryQuery(MAX_QUERY_RETRIES - 1, { status: 503 })).toBe(true)
    expect(shouldRetryQuery(MAX_QUERY_RETRIES, { status: 503 })).toBe(false)
  })
})
