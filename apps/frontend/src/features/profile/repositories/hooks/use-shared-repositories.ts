import { type skipToken, useQuery } from "@tanstack/react-query"
import type {
  SharedRepositories,
  SharedRepository,
  UpdateSharedRepositoryPathInput,
} from "@/features/profile/repositories/model/types"
import { useResourceMutation } from "@/hooks/use-resource-mutation"
import { orpc } from "@/lib/orpc"

const listKey = orpc.v1.content.listSharedRepositories.queryKey()
// The reader's sidebar and pages come from the folder the repository is read at.
const extraInvalidate = [orpc.v1.docs.nav.queryKey()]

export const useSharedRepositoriesList = () =>
  useQuery(orpc.v1.content.listSharedRepositories.queryOptions())

/** The folders that hold a site in a shared repository, read once `input` exists. */
export const useSharedRepositoryFolders = (
  input: { slug: string } | typeof skipToken
) => useQuery(orpc.v1.content.listSharedContentFolders.queryOptions({ input }))

// A failed sync is stored on the repository too, so the list is refetched
// whatever the outcome: useResourceMutation invalidates on settle.
export const useSharedRepositorySync = () =>
  useResourceMutation<{ slug: string }, unknown, SharedRepositories>({
    mutationFn: (input) => orpc.v1.content.syncRepository.call(input),
    listKey,
    extraInvalidate,
    messages: {
      success: "Repositorio sincronizado",
      error: "No se pudo sincronizar el repositorio",
    },
  })

export const useSharedRepositoryPathUpdate = () =>
  useResourceMutation<
    UpdateSharedRepositoryPathInput,
    SharedRepository,
    SharedRepositories
  >({
    mutationFn: (input) =>
      orpc.v1.content.updateSharedRepositoryPath.call(input),
    listKey,
    extraInvalidate,
    messages: {
      success: "Carpeta cambiada",
      error: "No se pudo cambiar la carpeta",
    },
  })
