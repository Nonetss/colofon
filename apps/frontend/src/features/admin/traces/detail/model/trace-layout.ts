import { ORPCError } from "@orpc/client"
import type { TraceSpan } from "@/features/admin/traces/shared"

/** What a failed read means for the page. */
export type TraceErrorKind = "not-found" | "unconfigured" | "failed"

export function traceErrorKind(error: unknown): TraceErrorKind {
  if (!(error instanceof ORPCError)) return "failed"
  if (error.code === "NOT_FOUND") return "not-found"
  if (error.code === "SERVICE_UNAVAILABLE") return "unconfigured"
  return "failed"
}

/** Left offset and width of a span's bar, as percentages of the trace. A
 *  span too short to see keeps a sliver, so it is never invisible. */
export function spanBar(
  span: Pick<TraceSpan, "offsetMs" | "durationMs">,
  traceDurationMs: number
): { left: string; width: string } {
  if (traceDurationMs <= 0) return { left: "0%", width: "100%" }
  const left = Math.min((span.offsetMs / traceDurationMs) * 100, 100)
  const width = Math.max((span.durationMs / traceDurationMs) * 100, 0.4)
  return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }
}
