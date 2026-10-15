import { type skipToken, useQuery } from "@tanstack/react-query"
import type { BranchesSource } from "@/features/admin/content/model/branches-source"
import type { ContentRepository } from "@/features/admin/content/model/types"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

export const useContentRepositoriesList = () =>
  useQuery(orpc.v1.content.listRepositories.queryOptions())

const listKey = orpc.v1.content.listRepositories.queryKey()

/** The remote's branches, read once `source` exists (`branchesSource`). */
export const useContentRepositoryBranches = (
  source: BranchesSource | typeof skipToken
) => useQuery(orpc.v1.content.listBranches.queryOptions({ input: source }))

type ContentRepositoryCreateInput = {
  slug: string
  name: string
  url: string
  ref: string
}

type ContentRepositoryUpdateInput = {
  slug: string
  name?: string
  url?: string
  ref?: string
}

type ContentRepositoryDeleteOutput = { id: string; success: boolean }

function applyDeleteOptimistic(
  current: ContentRepository[] | undefined,
  input: { slug: string }
) {
  if (!current) return current
  return current.filter((repository) => repository.slug !== input.slug)
}

export const useContentRepositoryCreate = () =>
  useResourceMutation<
    ContentRepositoryCreateInput,
    ContentRepository,
    ContentRepository[]
  >({
    mutationFn: (input) => orpc.v1.content.createRepository.call(input),
    listKey,
    messages: {
      success: "Repositorio creado; se está sincronizando",
      error: "No se pudo crear el repositorio",
    },
  })

export const useContentRepositoryUpdate = () =>
  useResourceMutation<
    ContentRepositoryUpdateInput,
    ContentRepository,
    ContentRepository[]
  >({
    mutationFn: (input) => orpc.v1.content.updateRepository.call(input),
    listKey,
    messages: {
      success: "Repositorio actualizado",
      error: "No se pudo actualizar el repositorio",
    },
  })

export const useContentRepositoryDelete = () =>
  useResourceMutation<
    { slug: string },
    ContentRepositoryDeleteOutput,
    ContentRepository[]
  >({
    mutationFn: (input) => orpc.v1.content.deleteRepository.call(input),
    listKey,
    applyOptimistic: applyDeleteOptimistic,
    messages: {
      success: "Repositorio eliminado",
      error: "No se pudo eliminar el repositorio",
    },
  })

// A failed sync is stored on the repository too, so the list is refetched
// whatever the outcome: useResourceMutation invalidates on settle.
export const useContentRepositorySync = () =>
  useResourceMutation<{ slug: string }, ContentRepository, ContentRepository[]>(
    {
      mutationFn: (input) => orpc.v1.content.syncRepository.call(input),
      listKey,
      messages: {
        success: "Repositorio sincronizado",
        error: "No se pudo sincronizar el repositorio",
      },
    }
  )
