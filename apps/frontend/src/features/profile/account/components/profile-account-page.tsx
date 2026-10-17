import { PageShell } from "@/components/shared/layout/page-shell"
import {
  ProfileAccountContent,
  type ProfileAccountPageProps,
} from "@/features/profile/account/components/profile-account-content"
import { QueryProvider } from "@/providers/query-provider"

export function ProfileAccountPage(props: ProfileAccountPageProps) {
  return (
    <QueryProvider>
      <PageShell>
        <ProfileAccountContent {...props} />
      </PageShell>
    </QueryProvider>
  )
}
