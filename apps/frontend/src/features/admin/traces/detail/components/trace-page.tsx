import { TraceContent } from "@/features/admin/traces/detail/components/trace-content"
import { QueryProvider } from "@/providers/query-provider"

export function TracePage({ traceId }: { traceId: string }) {
  return (
    <QueryProvider>
      <TraceContent traceId={traceId} />
    </QueryProvider>
  )
}
