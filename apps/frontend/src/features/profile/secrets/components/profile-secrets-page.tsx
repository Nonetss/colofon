import { PageShell } from "@/components/shared/layout/page-shell"
import { ProfileSecretsContent } from "@/features/profile/secrets/components/profile-secrets-content"
import { QueryProvider } from "@/providers/query-provider"

export function ProfileSecretsPage() {
  return (
    <QueryProvider>
      <PageShell>
        <ProfileSecretsContent />
      </PageShell>
    </QueryProvider>
  )
}
