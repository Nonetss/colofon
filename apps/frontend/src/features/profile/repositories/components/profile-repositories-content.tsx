import { Text } from "@/components/shared/brand/typography"
import { HeroCount } from "@/components/shared/layout/page-hero"
import { ResourceOverview } from "@/components/shared/resource/resource-overview"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { GitCredentialsSection } from "@/features/profile/repositories/components/git-credentials-section"
import { OwnRepositoryCard } from "@/features/profile/repositories/components/own-repository-card"
import { OwnRepositoryFormDialog } from "@/features/profile/repositories/components/own-repository-form-dialog"
import type { OwnRepositoryCardContext } from "@/features/profile/repositories/definitions/own-repository-actions.definition"
import {
  useOwnRepositoriesList,
  useOwnRepositoryDelete,
  useOwnRepositorySync,
} from "@/features/profile/repositories/hooks/use-own-repositories"
import type { OwnRepository } from "@/features/profile/repositories/model/types"
import { useEditDialog } from "@/hooks/use-edit-dialog"
import { useTargetConfirmDialog } from "@/hooks/use-target-confirm-dialog"
import { getIcon } from "@/lib/icon-registry"

const FolderGit = getIcon("entities", "contentRepository")
const Plus = getIcon("actions", "add")

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

export function ProfileRepositoriesContent() {
  const list = useOwnRepositoriesList()
  const deleteRepository = useOwnRepositoryDelete()
  const syncRepository = useOwnRepositorySync()

  const editDialog = useEditDialog<OwnRepository>()
  const deleteDialog = useTargetConfirmDialog<OwnRepository>({
    title: "Eliminar repositorio",
    description: (repository) =>
      `Se borra "${repository.name}" de la plataforma, con su clon. El repositorio git original no se toca.`,
    confirmLabel: "Eliminar",
    onConfirm: (repository) =>
      deleteRepository.mutateAsync({ slug: repository.slug }),
  })

  const repositories = list.data ?? []
  const syncingSlug = pendingSlugOf(syncRepository)
  const busySlug = pendingSlugOf(deleteRepository, syncRepository)
  const cardContext: OwnRepositoryCardContext = {
    onEdit: editDialog.openEdit,
    onDelete: deleteDialog.open,
  }

  return (
    <>
      <ResourceOverview
        maxWidth="full"
        padding="none"
        surface="profile-repositories"
        heroMeta={
          <HeroCount
            segments={[
              {
                count: repositories.length,
                label:
                  repositories.length === 1 ? "repositorio" : "repositorios",
              },
            ]}
          />
        }
        heroAction={
          <Button onClick={editDialog.openCreate}>
            <Plus className="size-4" />
            Añadir repositorio
          </Button>
        }
        heroChildren={
          <Text
            as="p"
            variant="compact"
            tone="muted"
            className="border-y py-3 leading-relaxed"
          >
            Solo tú ves estos repositorios, y los miembros de las organizaciones
            con las que compartas cada uno: en el lector, en la búsqueda y en la
            IA a través del MCP. Se descargan por https y se sincronizan cada
            cinco minutos.
          </Text>
        }
        query={{
          data: list.data,
          isPending: list.isPending,
          isError: list.isError,
          refetch: list.refetch,
        }}
        loading="Cargando repositorios..."
        error={{
          icon: <FolderGit className="size-6" />,
          title: "No se pudieron cargar tus repositorios",
          description:
            "Comprueba tu conexión; si el problema continúa, inténtalo de nuevo más tarde.",
        }}
        isEmpty={(data) => data.length === 0}
        empty={{
          icon: <FolderGit className="size-6" />,
          title: "Aún no has añadido ninguno",
          description:
            "Conecta un repositorio git con tus apuntes o tu documentación. Solo tú lo leerás aquí, hasta que lo compartas con una organización.",
          action: (
            <Button onClick={editDialog.openCreate}>Añadir repositorio</Button>
          ),
        }}
      >
        {(data) => (
          <div className="@container">
            <ul
              aria-label="Tus repositorios"
              className="grid gap-4 @3xl:grid-cols-2"
            >
              {data.map((repository) => (
                <li key={repository.id} className="flex min-w-0">
                  <OwnRepositoryCard
                    repository={repository}
                    context={cardContext}
                    onSync={(each) =>
                      syncRepository.mutate({ slug: each.slug })
                    }
                    syncing={syncingSlug === repository.slug}
                    busy={busySlug === repository.slug}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}
      </ResourceOverview>

      <GitCredentialsSection />

      <OwnRepositoryFormDialog
        repository={editDialog.editing}
        {...editDialog.dialogProps}
      />

      <ConfirmDialog {...deleteDialog.confirmDialogProps} />
    </>
  )
}
