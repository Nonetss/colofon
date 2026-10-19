import { type skipToken, useQuery } from "@tanstack/react-query"
import type { foldersInput } from "@/features/content-repositories/manage"
import type { OwnBranchesSource } from "@/features/profile/repositories/model/repository-form"
import type {
  CreateOwnRepositoryInput,
  OwnRepositories,
  OwnRepository,
  ShareOwnRepositoryInput,
  UpdateOwnRepositoryInput,
} from "@/features/profile/repositories/model/types"
import { useOrpcMutation } from "@/hooks/use-orpc-mutation"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

const listKey = orpc.v1.content.listMyRepositories.queryKey()
// The reader's sidebar lists the user's repositories too.
const extraInvalidate = [orpc.v1.docs.nav.queryKey()]

export const useOwnRepositoriesList = () =>
  useQuery(orpc.v1.content.listMyRepositories.queryOptions())

/** The organizations the user belongs to, to share a repository with. */
export const useShareableOrganizations = () =>
  useQuery(orpc.v1.myOrganization.list.queryOptions())

// Saved right after the repository itself, whose toast already speaks for
// the form; only a failure is reported.
export const useOwnRepositoryShare = () =>
  useOrpcMutation({
    mutationFn: (input: ShareOwnRepositoryInput) =>
      orpc.v1.content.shareMyRepository.call(input),
    error: "No se pudo cambiar con quién compartes el repositorio",
    invalidate: [listKey, ...extraInvalidate],
  })

/** The folders that hold a site, read once `input` exists. */
export const useOwnRepositoryFolders = (
  input: ReturnType<typeof foldersInput>
) => useQuery(orpc.v1.content.listMyContentFolders.queryOptions({ input }))

/** The remote's branches, read once `source` exists. */
export const useOwnRepositoryBranches = (
  source: OwnBranchesSource | typeof skipToken
) => useQuery(orpc.v1.content.listMyBranches.queryOptions({ input: source }))

function applyDeleteOptimistic(
  current: OwnRepositories | undefined,
  input: { slug: string }
) {
  if (!current) return current
  return current.filter((repository) => repository.slug !== input.slug)
}

export const useOwnRepositoryCreate = () =>
  useResourceMutation<CreateOwnRepositoryInput, OwnRepository, OwnRepositories>(
    {
      mutationFn: (input) => orpc.v1.content.createMyRepository.call(input),
      listKey,
      extraInvalidate,
      messages: {
        success: "Repositorio añadido",
        error: "No se pudo añadir el repositorio",
      },
    }
  )

export const useOwnRepositoryUpdate = () =>
  useResourceMutation<UpdateOwnRepositoryInput, OwnRepository, OwnRepositories>(
    {
      mutationFn: (input) => orpc.v1.content.updateMyRepository.call(input),
      listKey,
      extraInvalidate,
      messages: {
        success: "Repositorio actualizado",
        error: "No se pudo actualizar el repositorio",
      },
    }
  )

export const useOwnRepositoryDelete = () =>
  useResourceMutation<
    { slug: string },
    { id: string; success: boolean },
    OwnRepositories
  >({
    mutationFn: (input) => orpc.v1.content.deleteMyRepository.call(input),
    listKey,
    extraInvalidate,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: "Repositorio eliminado",
      error: "No se pudo eliminar el repositorio",
    },
  })

// A failed sync is stored on the repository too, so the list is refetched
// whatever the outcome: useResourceMutation invalidates on settle.
export const useOwnRepositorySync = () =>
  useResourceMutation<{ slug: string }, unknown, OwnRepositories>({
    mutationFn: (input) => orpc.v1.content.syncRepository.call(input),
    listKey,
    extraInvalidate,
    messages: {
      success: "Repositorio sincronizado",
      error: "No se pudo sincronizar el repositorio",
    },
  })
