import { getIcon } from "@/lib/icon-registry"

const FolderGit = getIcon("entities", "contentRepository")
const Plus = getIcon("actions", "add")

import { Text } from "@/components/shared/brand/typography"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ContentRepositoryCard } from "@/features/admin/content/components/content-repository-card"
import { ContentRepositoryFormDialog } from "@/features/admin/content/components/content-repository-form-dialog"
import type { ContentRepositoryCardContext } from "@/features/admin/content/definitions/content-repository-actions.definition"
import {
  useContentRepositoriesList,
  useContentRepositoryDelete,
  useContentRepositorySync,
} from "@/features/admin/content/hooks/use-content-repositories"
import type { ContentRepository } from "@/features/admin/content/model/types"
import { useEditDialog } from "@/hooks/use-edit-dialog"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"

type SlugMutation = {
  isPending: boolean
  variables?: { slug: string } | undefined
}

/** Slug of the repository a pending mutation acts on, or `null`. */
function pendingSlugOf(...mutations: SlugMutation[]): string | null {
  for (const mutation of mutations) {
    if (mutation.isPending && mutation.variables !== undefined) {
      return mutation.variables.slug
    }
  }
  return null
}

function deleteDescription(repository: ContentRepository): string {
  const effect =
    "Los editores que apunten a su catálogo dejarán de tener autocompletado."
  if (repository.hosted) {
    return `Se borra "${repository.name}" con todo su historial git, que solo guarda la plataforma: haz antes una copia si la necesitas. ${effect}`
  }
  return `Se borra "${repository.name}" y su clon. ${effect}`
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
    description: deleteDescription,
    confirmLabel: "Eliminar",
    onConfirm: (repository) =>
      deleteRepository.mutateAsync({ slug: repository.slug }),
  })

  const syncingSlug = pendingSlugOf(syncRepository)
  const busySlug = pendingSlugOf(deleteRepository, syncRepository)
  const countLabel = repositories.length === 1 ? "repositorio" : "repositorios"
  const cardContext: ContentRepositoryCardContext = {
    onEdit: editDialog.openEdit,
    onDelete: deleteDialog.open,
  }
  const sync = (repository: ContentRepository) =>
    syncRepository.mutate({ slug: repository.slug })

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
        {(data) => (
          <div className="@container">
            <ul
              aria-label="Repositorios de contenido"
              className="grid gap-4 @3xl:grid-cols-2"
            >
              {data.map((repository) => (
                <li key={repository.id} className="flex min-w-0">
                  <ContentRepositoryCard
                    repository={repository}
                    context={cardContext}
                    onSync={sync}
                    syncing={syncingSlug === repository.slug}
                    busy={busySlug === repository.slug}
                  />
                </li>
              ))}
            </ul>
          </div>
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
