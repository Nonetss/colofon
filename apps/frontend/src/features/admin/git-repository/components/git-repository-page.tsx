import { GitRepositoryContent } from "@/features/admin/git-repository/components/git-repository-content"
import { QueryProvider } from "@/providers/query-provider"

export function GitRepositoryPage({ slug }: { slug: string }) {
  return (
    <QueryProvider>
      <GitRepositoryContent slug={slug} />
    </QueryProvider>
  )
}
