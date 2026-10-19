import { PageShell } from "@/components/shared/layout/page-shell"
import { ProfileOrganizationsContent } from "@/features/profile/organizations/components/profile-organizations-content"
import { QueryProvider } from "@/providers/query-provider"

export function ProfileOrganizationsPage() {
  return (
    <QueryProvider>
      <PageShell>
        <ProfileOrganizationsContent />
      </PageShell>
    </QueryProvider>
  )
}
