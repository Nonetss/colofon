import { TracesContent } from "@/features/admin/traces/overview/components/traces-content"
import { QueryProvider } from "@/providers/query-provider"

export function TracesPage() {
  return (
    <QueryProvider>
      <TracesContent />
    </QueryProvider>
  )
}
