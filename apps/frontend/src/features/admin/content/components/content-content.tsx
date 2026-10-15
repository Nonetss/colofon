import { getIcon } from "@/lib/icon-registry"

const FolderGit = getIcon("entities", "contentRepository")
const Plus = getIcon("actions", "add")

import { useMemo } from "react"
import { Text } from "@/components/shared/brand/typography"
import { DataTableView } from "@/components/shared/data-display/data-table-view"
import { RowActions } from "@/components/shared/data-display/row-action-items"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ContentRepositoryFormDialog } from "@/features/admin/content/components/content-repository-form-dialog"
import {
  CONTENT_REPOSITORY_DEFAULT_SORT,
  CONTENT_REPOSITORY_SORT_KEYS,
  type ContentRepositoriesRowContext,
  contentRepositoryActions,
  contentRepositoryColumnLayout,
  contentRepositoryColumns,
  contentRepositorySortValues,
} from "@/features/admin/content/definitions/content-repository-columns.definition"
import {
  useContentRepositoriesList,
  useContentRepositoryDelete,
  useContentRepositorySync,
} from "@/features/admin/content/hooks/use-content-repositories"
import type { ContentRepository } from "@/features/admin/content/model/types"
import { useColumnPreferences } from "@/hooks/use-column-preferences"
import { columnPreferenceProps, useDataTable } from "@/hooks/use-data-table"
import { useEditDialog } from "@/hooks/use-edit-dialog"
import { useSortQueryParam } from "@/hooks/use-sort-query-param"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { sortRows } from "@/lib/sort-rows"

type SlugMutation = {
  isPending: boolean
  variables?: { slug: string } | undefined
}

/** Slug of the repository a pending delete or sync acts on, or `null`. */
function busySlugOf(...mutations: SlugMutation[]): string | null {
  for (const mutation of mutations) {
    if (mutation.isPending && mutation.variables !== undefined) {
      return mutation.variables.slug
    }
  }
  return null
}

export function ContentContent() {
  const {
    data: repositories = [],
    isPending,
    isError,
    refetch,
  } = useContentRepositoriesList()
  const deleteRepository = useContentRepositoryDelete()
  const syncRepository = useContentRepositorySync()

  const editDialog = useEditDialog<ContentRepository>()
  const deleteDialog = useTargetConfirmDialog<ContentRepository>({
    title: "Eliminar repositorio",
    description: (repository) =>
      `Se borra "${repository.name}" y su clon. Los editores que apunten a su catálogo dejarán de tener autocompletado.`,
    confirmLabel: "Eliminar",
    onConfirm: (repository) =>
      deleteRepository.mutateAsync({ slug: repository.slug }),
  })

  const busySlug = busySlugOf(deleteRepository, syncRepository)
  const countLabel = repositories.length === 1 ? "repositorio" : "repositorios"
  const rowContext: ContentRepositoriesRowContext = {
    busySlug,
    onEdit: editDialog.openEdit,
    onSync: (repository) => syncRepository.mutate({ slug: repository.slug }),
    onDelete: deleteDialog.open,
  }

  const preferences = useColumnPreferences(
    "admin-content",
    contentRepositoryColumnLayout
  )
  const [sorting, setSorting] = useSortQueryParam(
    CONTENT_REPOSITORY_SORT_KEYS,
    CONTENT_REPOSITORY_DEFAULT_SORT
  )
  const rows = useMemo(
    () => sortRows(repositories, sorting, contentRepositorySortValues),
    [repositories, sorting]
  )
  const table = useDataTable({
    data: rows,
    columns: contentRepositoryColumns,
    getRowId: (repository) => repository.id,
    sorting,
    onSortingChange: setSorting,
    ...columnPreferenceProps(preferences),
  })

  return (
    <>
      <ResourceOverview
        maxWidth="80%"
        surface="admin-content"
        heroMeta={
          <HeroCount
            segments={[{ count: repositories.length, label: countLabel }]}
          />
        }
        heroAction={
          <Button onClick={editDialog.openCreate}>
            <Plus className="size-4" />
            Nuevo repositorio
          </Button>
        }
        heroChildren={
          <Text
            as="p"
            variant="compact"
            tone="muted"
            className="border-y py-3 leading-relaxed"
          >
            Cada repositorio se sincroniza al arrancar y cada cinco minutos.
            Para autocompletar sus YAML, pon su URL del catálogo en el ajuste{" "}
            <code className="font-mono text-foreground">
              yaml.schemaStore.url
            </code>{" "}
            del editor.
          </Text>
        }
        query={{ data: repositories, isPending, isError, refetch }}
        loading="Cargando repositorios..."
        error={{
          icon: <FolderGit className="size-6" />,
          title: "No se pudieron cargar los repositorios",
          description:
            "Comprueba tu conexión y tus permisos; si el problema continúa, inténtalo de nuevo más tarde.",
        }}
        isEmpty={(data) => data.length === 0}
        empty={{
          icon: <FolderGit className="size-6" />,
          title: "No hay repositorios de contenido",
          description:
            "Conecta el repositorio git de la documentación para que la plataforma lo lea.",
          action: (
            <Button onClick={editDialog.openCreate}>Nuevo repositorio</Button>
          ),
        }}
      >
        {() => (
          <DataTableView
            table={table}
            label="Repositorios de contenido"
            idPrefix="admin-content"
            onResetColumns={preferences.reset}
            rowState={(repository) => ({
              disabled: busySlug === repository.slug,
            })}
            renderControl={(repository) => (
              <RowActions
                actions={contentRepositoryActions}
                item={repository}
                context={rowContext}
                accessibleLabel={repository.name}
                disabled={busySlug === repository.slug}
              />
            )}
          />
        )}
      </ResourceOverview>

      <ContentRepositoryFormDialog
        repository={editDialog.editing}
        {...editDialog.dialogProps}
      />

      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
    </>
  )
}
