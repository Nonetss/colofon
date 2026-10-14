import type { TraceSummary } from "@/features/admin/traces/shared"
import { foldText } from "@/lib/fold-text"

/**
 * The loaded traces whose root span name contains `query`, ignoring case and
 * accents. Filtered here rather than by Tempo: TraceQL can only match part of
 * a name with a regex, and the list already holds the newest traces.
 */
export function tracesNamed(
  traces: readonly TraceSummary[],
  query: string
): TraceSummary[] {
  const folded = foldText(query.trim())
  if (folded === "") return [...traces]
  return traces.filter((trace) => foldText(trace.rootName).includes(folded))
}
