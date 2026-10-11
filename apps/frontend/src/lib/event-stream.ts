import { ORPCError } from "@orpc/client"

/** Errors a retry can't fix: the target is gone or the session is. */
const PERMANENT_ERROR_CODES = new Set([
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
])

export function isPermanentStreamError(error: unknown): boolean {
  return error instanceof ORPCError && PERMANENT_ERROR_CODES.has(error.code)
}

/** Resolves after `ms`, or right away once `signal` aborts. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true }
    )
  })
}

export interface KeepConnectedOptions {
  /** Called with each failure a retry will follow and the wait before it. */
  onDrop?: (error: unknown, retryInMs: number) => void
  /** First retry delay, doubled per failure up to `maxDelayMs`. */
  baseDelayMs?: number
  maxDelayMs?: number
}

/**
 * Keeps a long-lived stream followed: runs `connect` until it resolves
 * `"done"` or `signal` aborts. A `connect` that throws or resolves
 * `"reconnect"` (a stream that ended but should be reopened) is retried after
 * an exponential backoff, which `connected()` resets once a connection is
 * established. An error a retry can't fix (`isPermanentStreamError`) is
 * rethrown and ends the loop.
 */
export async function keepConnected(
  signal: AbortSignal,
  connect: (connected: () => void) => Promise<"done" | "reconnect">,
  {
    onDrop,
    baseDelayMs = 1_000,
    maxDelayMs = 30_000,
  }: KeepConnectedOptions = {}
): Promise<void> {
  let failures = 0
  const connected = () => {
    failures = 0
  }
  while (!signal.aborted) {
    const delay = () => Math.min(baseDelayMs * 2 ** failures, maxDelayMs)
    try {
      if ((await connect(connected)) === "done") return
    } catch (error) {
      if (signal.aborted) return
      if (isPermanentStreamError(error)) throw error
      onDrop?.(error, delay())
    }
    await wait(delay(), signal)
    failures += 1
  }
}
