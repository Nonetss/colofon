import { PageShell } from "@/components/shared/layout/page-shell"
import { ProfileApiKeysContent } from "@/features/profile/api-keys/components/profile-api-keys-content"
import { QueryProvider } from "@/providers/query-provider"

export function ProfileApiKeysPage() {
  return (
    <QueryProvider>
      <PageShell>
        <ProfileApiKeysContent />
      </PageShell>
    </QueryProvider>
  )
}
