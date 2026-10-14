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

/** Left offset and width of a span's bar, as percentages of the scale the
 *  waterfall is drawn to. The API already keeps every bar inside its
 *  parent's and inside the scale; a bar too short to see keeps a sliver. */
export function spanBar(
  bar: TraceSpan["bar"],
  scaleMs: number
): { left: string; width: string } {
  if (scaleMs <= 0) return { left: "0%", width: "100%" }
  const left = Math.min((bar.offsetMs / scaleMs) * 100, 100)
  const width = Math.max((bar.durationMs / scaleMs) * 100, 0.4)
  return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }
}
