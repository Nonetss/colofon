import { ContentContent } from "@/features/admin/content/components/content-content"
import { QueryProvider } from "@/providers/query-provider"

export function ContentPage() {
  return (
    <QueryProvider>
      <ContentContent />
    </QueryProvider>
  )
}
