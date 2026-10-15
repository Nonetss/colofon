import { type skipToken, useQuery } from "@tanstack/react-query"
import type { RepositoryTarget } from "@/features/admin/git-repository/model/git-location"
import { orpc } from "@/lib/orpc"

/** The content repositories the platform hosts, ordered by name. */
export const useHostedRepositories = () =>
  useQuery(
    orpc.v1.content.listRepositories.queryOptions({
      select: (repositories) =>
        repositories.filter((repository) => repository.hosted),
    })
  )

/** A hosted repository's branches (`branchesInput`). */
export const useRepositoryBranches = (
  input: { slug: string } | typeof skipToken
) => useQuery(orpc.v1.content.listBranches.queryOptions({ input }))

/** A folder's entries (`folderInput`). */
export const useRepositoryFolder = (
  input: RepositoryTarget | typeof skipToken
) => useQuery(orpc.v1.content.readFolder.queryOptions({ input }))

/** A file's content (`fileInput`). */
export const useRepositoryFile = (input: RepositoryTarget | typeof skipToken) =>
  useQuery(orpc.v1.content.readFile.queryOptions({ input }))
