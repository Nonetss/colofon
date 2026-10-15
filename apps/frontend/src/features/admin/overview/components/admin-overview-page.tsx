import { PageShell } from "@/components/shared/layout/page-shell"
import { AdminOverviewContent } from "@/features/admin/overview/components/admin-overview-content"
import { QueryProvider } from "@/providers/query-provider"

export function AdminOverviewPage() {
  return (
    <QueryProvider>
      <PageShell maxWidth="full" padding="none">
        <AdminOverviewContent />
      </PageShell>
    </QueryProvider>
  )
}
