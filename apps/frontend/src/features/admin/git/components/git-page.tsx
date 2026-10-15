import { GitContent } from "@/features/admin/git/components/git-content"
import { QueryProvider } from "@/providers/query-provider"

export function GitPage() {
  return (
    <QueryProvider>
      <GitContent />
    </QueryProvider>
  )
}
