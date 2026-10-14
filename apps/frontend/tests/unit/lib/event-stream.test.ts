import { describe, expect, test } from "bun:test"
import { ORPCError } from "@orpc/client"
import { isPermanentStreamError, keepConnected } from "@/lib/event-stream"

/** No real waiting between retries. */
const FAST = { baseDelayMs: 0, maxDelayMs: 0 }

describe("keepConnected", () => {
  test("retries after a failure until connect reports done", async () => {
    const drops: unknown[] = []
    const attempts = { count: 0 }

    await keepConnected(
      new AbortController().signal,
      async () => {
        attempts.count += 1
        if (attempts.count < 3) throw new Error("dropped")
        return "done"
      },
      { ...FAST, onDrop: (error) => drops.push(error) }
    )

    expect(attempts.count).toBe(3)
    expect(drops).toHaveLength(2)
  })

  test("reopens a stream that ended with reconnect", async () => {
    const attempts = { count: 0 }

    await keepConnected(
      new AbortController().signal,
      async () => {
        attempts.count += 1
        if (attempts.count < 2) return "reconnect"
        return "done"
      },
      FAST
    )

    expect(attempts.count).toBe(2)
  })

  test("waits longer after each failure and starts over once connected", async () => {
    const delays: number[] = []
    const outcomes = ["fail", "fail", "connect-then-fail", "fail", "done"]

    await keepConnected(
      new AbortController().signal,
      async (connected) => {
        const outcome = outcomes.shift()
        if (outcome === "done") return "done"
        if (outcome === "connect-then-fail") connected()
        throw new Error("dropped")
      },
      {
        baseDelayMs: 1,
        maxDelayMs: 3,
        onDrop: (_error, retryInMs) => delays.push(retryInMs),
      }
    )

    expect(delays).toEqual([1, 2, 1, 2])
  })

  test("a permanent error stops retrying and is rethrown", async () => {
    const attempts = { count: 0 }

    await expect(
      keepConnected(
        new AbortController().signal,
        async () => {
          attempts.count += 1
          // A retry would land here and end the loop without rejecting.
          if (attempts.count > 1) return "done"
          throw new ORPCError("NOT_FOUND")
        },
        FAST
      )
    ).rejects.toBeInstanceOf(ORPCError)
    expect(attempts.count).toBe(1)
  })

  test("aborting ends the loop without rethrowing", async () => {
    const controller = new AbortController()

    await keepConnected(
      controller.signal,
      async () => {
        controller.abort()
        throw new Error("aborted read")
      },
      FAST
    )

    expect(controller.signal.aborted).toBe(true)
  })
})

describe("error kinds", () => {
  test("only codes a retry can't fix are permanent", () => {
    expect(isPermanentStreamError(new ORPCError("NOT_FOUND"))).toBe(true)
    expect(isPermanentStreamError(new ORPCError("UNAUTHORIZED"))).toBe(true)
    expect(isPermanentStreamError(new ORPCError("BAD_GATEWAY"))).toBe(false)
    expect(isPermanentStreamError(new Error("network"))).toBe(false)
  })
})
