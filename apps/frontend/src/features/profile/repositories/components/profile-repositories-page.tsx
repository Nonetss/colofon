import { PageShell } from "@/components/shared/layout/page-shell"
import { ProfileRepositoriesContent } from "@/features/profile/repositories/components/profile-repositories-content"
import { QueryProvider } from "@/providers/query-provider"

export function ProfileRepositoriesPage() {
  return (
    <QueryProvider>
      <PageShell>
        <ProfileRepositoriesContent />
      </PageShell>
    </QueryProvider>
  )
}
