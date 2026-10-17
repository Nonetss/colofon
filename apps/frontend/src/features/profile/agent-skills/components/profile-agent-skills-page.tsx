import { PageShell } from "@/components/shared/layout/page-shell"
import { ProfileAgentSkillsContent } from "@/features/profile/agent-skills/components/profile-agent-skills-content"
import { QueryProvider } from "@/providers/query-provider"

export function ProfileAgentSkillsPage() {
  return (
    <QueryProvider>
      <PageShell>
        <ProfileAgentSkillsContent />
      </PageShell>
    </QueryProvider>
  )
}
