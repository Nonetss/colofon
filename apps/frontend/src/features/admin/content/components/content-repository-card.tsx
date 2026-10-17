import { getIcon } from "@/lib/icon-registry"

const FolderGit = getIcon("entities", "contentRepository")
const Refresh = getIcon("actions", "refresh")

import { surfaceVariants } from "@/components/shared/brand/surface"
import { Text } from "@/components/shared/brand/typography"
import { MetadataCell } from "@/components/shared/data-display/metadata-cell"
import { RowActions } from "@/components/shared/data-display/row-action-items"
import { Button } from "@/components/ui/button"
import {
  type ContentRepositoryCardContext,
  contentRepositoryActions,
} from "@/features/admin/content/definitions/content-repository-actions.definition"
import type { ContentRepository } from "@/features/admin/content/model/types"
import { CopyableUrl } from "@/features/admin/shared"
import {
  ContentPathCell,
  RepositorySyncError,
  RepositorySyncStatus,
} from "@/features/content-repositories/manage"
import { cn } from "@/lib/utils"

interface ContentRepositoryCardProps {
  repository: ContentRepository
  context: ContentRepositoryCardContext
  onSync: (repository: ContentRepository) => void
  /** A sync of this repository is running. */
  syncing: boolean
  /** A delete or sync of this repository is running. */
  busy: boolean
}

/**
 * One content repository: who it is, where it comes from, how its last sync
 * went and, at the bottom, the catalog URL writers paste into their editor.
 */
export function ContentRepositoryCard({
  repository,
  context,
  onSync,
  syncing,
  busy,
}: ContentRepositoryCardProps) {
  return (
    <article
      className={cn(
        "dash-enter flex w-full min-w-0 flex-col transition-opacity",
        surfaceVariants(),
        busy && "opacity-60"
      )}
      aria-busy={busy}
    >
      <header className="flex min-w-0 items-start gap-3 p-4">
        <span aria-hidden className="mt-0.5 shrink-0 text-primary">
          <FolderGit className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Text as="h2" variant="title" className="truncate">
            {repository.name}
          </Text>
          <Text variant="data" tone="muted" className="truncate">
            {repository.slug}
          </Text>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onSync(repository)}
        >
          <Refresh className={cn("size-3.5", syncing && "animate-spin")} />
          Sincronizar
        </Button>
        <RowActions
          actions={contentRepositoryActions}
          item={repository}
          context={context}
          accessibleLabel={repository.name}
          disabled={busy}
        />
      </header>

      <div className="@container border-t px-4 py-3">
        <dl className="grid gap-x-6 gap-y-3 @md:grid-cols-[minmax(0,1fr)_auto]">
          {repository.hosted ? (
            <MetadataCell as="dl" label="Alojado en la plataforma">
              <Text variant="compact" tone="muted">
                Clónalo y haz push con la URL de abajo.
              </Text>
            </MetadataCell>
          ) : (
            <MetadataCell as="dl" label="Repositorio git">
              <Text variant="data" className="block truncate">
                {repository.url}
              </Text>
            </MetadataCell>
          )}
          <MetadataCell as="dl" label="Rama">
            <Text variant="data" className="block truncate">
              {repository.ref}
            </Text>
          </MetadataCell>
          <ContentPathCell path={repository.path} />
          <RepositorySyncStatus
            repository={repository}
            hosted={repository.hosted}
            className="@md:col-span-2"
          />
        </dl>
        <RepositorySyncError repository={repository} />
      </div>

      <footer className="mt-auto flex flex-col gap-3 border-t px-4 py-3">
        {repository.pushUrl !== null && (
          <CopyableUrl
            label="URL de git"
            url={repository.pushUrl}
            copyLabel={`Copiar la URL de git de ${repository.name}`}
          />
        )}
        <CopyableUrl
          label="Catálogo para el editor"
          url={repository.catalogUrl}
          copyLabel={`Copiar la URL del catálogo de ${repository.name}`}
        />
      </footer>
    </article>
  )
}
