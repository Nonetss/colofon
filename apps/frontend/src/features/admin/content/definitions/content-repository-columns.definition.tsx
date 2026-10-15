import { createColumnHelper } from "@tanstack/react-table"
import { Text } from "@/components/shared/brand/typography"
import {
  DataTableIdentityCell,
  type DataTableStatus,
  DataTableStatusCell,
} from "@/components/shared/data-display/data-table-cell-content"
import type { RowActionDescriptor } from "@/components/shared/data-display/row-action-items"
import { CopyButton } from "@/components/shared/form/copy-button"
import type { ContentRepository } from "@/features/admin/content/model/types"
import { columnLayoutOf, type DataTableFeatures } from "@/hooks/use-data-table"
import type { SortOrdering } from "@/hooks/use-sort-query-param"
import { formatDateTime } from "@/lib/format"
import { iconRef } from "@/lib/icon-registry"
import type { SortValue } from "@/lib/sort-rows"

export interface ContentRepositoriesRowContext {
  /** Slug of the repository a delete or sync is running for. */
  busySlug: string | null
  onEdit: (repository: ContentRepository) => void
  onSync: (repository: ContentRepository) => void
  onDelete: (repository: ContentRepository) => void
}

export const CONTENT_REPOSITORY_SORT_KEYS = ["name", "ref", "lastSync"] as const

export type ContentRepositorySortKey =
  (typeof CONTENT_REPOSITORY_SORT_KEYS)[number]

/** The server's order (by name): the list starts unsorted. */
export const CONTENT_REPOSITORY_DEFAULT_SORT: SortOrdering<ContentRepositorySortKey> | null =
  null

const SHORT_COMMIT_LENGTH = 7

function lastSyncStatus(repository: ContentRepository): DataTableStatus {
  if (repository.lastSyncedAt === null) {
    return { tone: "border", label: "Sin sincronizar" }
  }
  const when = formatDateTime(repository.lastSyncedAt)
  if (repository.lastSyncError !== null) {
    return {
      tone: "destructive",
      label: `Error · ${when}`,
      title: repository.lastSyncError,
    }
  }
  const commit = repository.lastCommit ?? ""
  return {
    tone: "primary",
    label: `${when} · ${commit.slice(0, SHORT_COMMIT_LENGTH)}`,
  }
}

function timeOf(value: string | null): number | null {
  if (value === null) return null
  return new Date(value).getTime()
}

const helper = createColumnHelper<DataTableFeatures, ContentRepository>()

export const contentRepositoryColumns = helper.columns([
  helper.accessor((repository) => repository.name, {
    id: "name",
    header: "Repositorio",
    size: 240,
    minSize: 160,
    enableSorting: true,
    meta: { label: "Repositorio", reorderable: false, compact: "primary" },
    cell: (info) => (
      <DataTableIdentityCell
        primary={info.row.original.name}
        secondary={info.row.original.slug}
      />
    ),
  }),
  helper.accessor((repository) => repository.url, {
    id: "url",
    header: "URL",
    size: 300,
    minSize: 160,
    meta: { label: "URL", reorderable: true },
    cell: (info) => (
      <Text variant="data" tone="muted" className="block truncate">
        {info.row.original.url}
      </Text>
    ),
  }),
  helper.accessor((repository) => repository.ref, {
    id: "ref",
    header: "Ref",
    size: 120,
    enableSorting: true,
    meta: { label: "Ref", reorderable: true },
    cell: (info) => (
      <Text variant="data" className="block truncate">
        {info.row.original.ref}
      </Text>
    ),
  }),
  helper.accessor((repository) => repository.lastSyncedAt, {
    id: "lastSync",
    header: "Última sincronización",
    size: 220,
    enableSorting: true,
    meta: {
      label: "Última sincronización",
      reorderable: true,
      compact: "status",
    },
    cell: (info) => (
      <DataTableStatusCell status={lastSyncStatus(info.row.original)} />
    ),
  }),
  helper.accessor((repository) => repository.catalogUrl, {
    id: "catalogUrl",
    header: "Catálogo para el editor",
    size: 380,
    minSize: 200,
    meta: { label: "Catálogo para el editor", reorderable: true },
    cell: (info) => (
      <span className="flex min-w-0 items-center gap-1">
        <Text variant="data" tone="muted" className="min-w-0 truncate">
          {info.row.original.catalogUrl}
        </Text>
        <CopyButton
          text={info.row.original.catalogUrl}
          label={`Copiar la URL del catálogo de ${info.row.original.name}`}
          copiedLabel="URL copiada"
          className="shrink-0"
        />
      </span>
    ),
  }),
  helper.display({
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    size: 64,
    enableResizing: false,
    meta: {
      label: "Acciones",
      reorderable: false,
      cellClassName: "text-right",
    },
  }),
])

export const contentRepositoryColumnLayout = columnLayoutOf(
  contentRepositoryColumns
)

export const contentRepositorySortValues: Partial<
  Record<ContentRepositorySortKey, SortValue<ContentRepository>>
> = {
  name: (repository) => repository.name,
  ref: (repository) => repository.ref,
  lastSync: (repository) => timeOf(repository.lastSyncedAt),
}

export const contentRepositoryActions: RowActionDescriptor<
  ContentRepository,
  ContentRepositoriesRowContext
>[] = [
  {
    key: "sync",
    label: "Sincronizar",
    icon: iconRef("actions", "refresh"),
    onSelect: (repository, ctx) => ctx.onSync(repository),
  },
  {
    key: "edit",
    label: "Editar",
    icon: iconRef("actions", "edit"),
    onSelect: (repository, ctx) => ctx.onEdit(repository),
  },
  {
    key: "delete",
    label: "Eliminar",
    icon: iconRef("actions", "delete"),
    destructive: true,
    onSelect: (repository, ctx) => ctx.onDelete(repository),
  },
]
