import { getIcon } from "@/lib/icon-registry"

const FolderGit = getIcon("entities", "contentRepository")
const Refresh = getIcon("actions", "refresh")

import { Text } from "@/components/shared/brand/typography"
import { MetadataCell } from "@/components/shared/data-display/metadata-cell"
import { RowActions } from "@/components/shared/data-display/row-action-items"
import {
  type StatusDotTone,
  StatusTag,
} from "@/components/shared/data-display/status-dot"
import { CopyButton } from "@/components/shared/form/copy-button"
import { Button } from "@/components/ui/button"
import {
  type ContentRepositoryCardContext,
  contentRepositoryActions,
} from "@/features/admin/content/definitions/content-repository-actions.definition"
import {
  type LastSync,
  lastSyncOf,
} from "@/features/admin/content/model/last-sync"
import type { ContentRepository } from "@/features/admin/content/model/types"
import { formatDateTime } from "@/lib/format"
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

function lastSyncTag(lastSync: LastSync): {
  tone: StatusDotTone
  label: string
} {
  if (lastSync.state === "never") {
    return { tone: "border", label: "Sin sincronizar" }
  }
  if (lastSync.state === "failed") {
    return { tone: "destructive", label: "Error al sincronizar" }
  }
  return { tone: "foreground", label: "Sincronizado" }
}

function lastSyncDetail(lastSync: LastSync): string {
  if (lastSync.state === "never") return "Todavía no se ha descargado"
  const when = formatDateTime(lastSync.at)
  if (lastSync.state === "ok" && lastSync.commit !== null) {
    return `${when} · ${lastSync.commit}`
  }
  return when
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
  const lastSync = lastSyncOf(repository)
  const tag = lastSyncTag(lastSync)

  return (
    <article
      className={cn(
        "dash-enter flex w-full min-w-0 flex-col rounded-xl border bg-card/40 transition-opacity",
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
          <MetadataCell as="dl" label="Repositorio git">
            <Text variant="data" className="block truncate">
              {repository.url}
            </Text>
          </MetadataCell>
          <MetadataCell as="dl" label="Rama">
            <Text variant="data" className="block truncate">
              {repository.ref}
            </Text>
          </MetadataCell>
          <MetadataCell
            as="dl"
            label="Última sincronización"
            className="@md:col-span-2"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <StatusTag dotTone={tag.tone}>{tag.label}</StatusTag>
              <Text variant="compact" tone="muted" className="tabular-nums">
                {lastSyncDetail(lastSync)}
              </Text>
            </span>
          </MetadataCell>
        </dl>
        {lastSync.state === "failed" && (
          <Text
            as="p"
            variant="data"
            tone="destructive"
            className="mt-3 line-clamp-3 rounded-md bg-destructive/5 px-3 py-2 break-all"
          >
            {lastSync.error}
          </Text>
        )}
      </div>

      <footer className="mt-auto border-t px-4 py-3">
        <Text as="p" variant="label" tone="muted">
          Catálogo para el editor
        </Text>
        <div className="mt-1.5 flex min-w-0 items-center gap-2 rounded-md bg-muted py-1 pr-1 pl-2.5">
          <Text variant="data" className="min-w-0 flex-1 truncate">
            {repository.catalogUrl}
          </Text>
          <CopyButton
            text={repository.catalogUrl}
            label={`Copiar la URL del catálogo de ${repository.name}`}
            copiedLabel="URL copiada"
            className="shrink-0"
          />
        </div>
      </footer>
    </article>
  )
}
