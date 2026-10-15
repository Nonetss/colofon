import { Text } from "@/components/shared/brand/typography"
import { CopyButton } from "@/components/shared/form/copy-button"
import { AppLink } from "@/components/ui/app-link"
import { Button } from "@/components/ui/button"
import type { HostedRepository } from "@/features/admin/git/model/types"
import { getIcon } from "@/lib/icon-registry"

const FolderGit = getIcon("entities", "contentRepository")
const Branch = getIcon("entities", "gitBranch")

/** A hosted repository: who it is, what it publishes and where to push. */
export function GitRepositoryCard({
  repository,
}: {
  repository: HostedRepository
}) {
  const href = `/admin/git/${repository.slug}`

  return (
    <article className="dash-enter flex w-full min-w-0 flex-col rounded-xl border bg-card/40">
      <header className="flex min-w-0 items-start gap-3 p-4">
        <span aria-hidden className="mt-0.5 shrink-0 text-primary">
          <FolderGit className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text as="h2" variant="title" className="truncate">
            <AppLink href={href} className="hover:underline">
              {repository.name}
            </AppLink>
          </Text>
          <Text variant="data" tone="muted" className="truncate">
            {repository.slug}
          </Text>
        </div>
        <Button
          variant="outline"
          size="sm"
          render={<AppLink href={href} />}
          nativeButton={false}
        >
          Ver código
        </Button>
      </header>
      <footer className="mt-auto flex flex-col gap-3 border-t px-4 py-3">
        <span className="flex min-w-0 items-center gap-1.5">
          <Branch aria-hidden className="size-3.5 text-muted-foreground" />
          <Text variant="compact" tone="muted">
            Publica
          </Text>
          <Text variant="data" className="truncate">
            {repository.ref}
          </Text>
        </span>
        {repository.pushUrl !== null && (
          <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted py-1 pr-1 pl-2.5">
            <Text variant="data" className="min-w-0 flex-1 truncate">
              {repository.pushUrl}
            </Text>
            <CopyButton
              text={repository.pushUrl}
              label={`Copiar la URL de git de ${repository.name}`}
              copiedLabel="URL copiada"
              className="shrink-0"
            />
          </div>
        )}
      </footer>
    </article>
  )
}
